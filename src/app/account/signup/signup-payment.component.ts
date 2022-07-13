import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnInit,
  ViewChild,
  ViewChildren
} from '@angular/core';
import {User} from "../../shared/user";
import {PaymentMethod} from "../../shared/payment-method";
import {Pointer} from "../../shared/pointer";
import {FormBuilder, FormControl, FormGroup, NgForm, Validators} from "@angular/forms";
import { NgbModalRef} from "@ng-bootstrap/ng-bootstrap";
import {
  StripeService,
} from "ngx-stripe";

import {
  StripeElementsOptions as ElementsOptions,
  Token,
  StripeElements as Elements
} from '@stripe/stripe-js';
import {STRIPE_PUB_KEY} from "../../shared/global";
import {AuthenticationService} from "../authentication.service";
import {Router} from "@angular/router";
import {PayoutService} from "../payout/payout.service";
import {StripeSource} from "../../shared/stripe-source";
import {StripeCustomer} from "../../shared/stripe-customer";
import {Observable} from "rxjs";
import {Countries} from "../../shared/countries";
import * as uuid from 'uuid';
import {ObjectRef} from "../../shared/object-ref";
import {StripeSubscription} from "../../shared/stripe-subscription";
import {Order} from "../../shared/order";
import {SubscriptionService} from "../../subscription/subscription.service";
import {AccountService} from "../account.service";
import {Error} from "../../shared/error";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {Subscription} from "../../shared/subscription";

@Component({
  selector: 'app-signup-payment',
  templateUrl: './signup-payment.component.html',
  styleUrls: ['./signup-payment.component.scss'],
  providers:[PayoutService, AuthenticationService, AccountService]
})
export class SignupPaymentComponent implements OnInit, AfterViewInit  {
  @ViewChild('cardInfo', {}) cardInfo: ElementRef;
  public user: User;
  public subscriptionRef: any;
  public paymentRef: any;
  public trialPeriodHelp: String = "You have 3 days free before your credit card will be charged for the subscription.";
  public defaultSource: any;
  private userPointer: Pointer;
  public billingForm: FormGroup;
  public countries = Countries;
  private modalRef: NgbModalRef;
  public success: boolean;
  public hasSubmitted:boolean;
  public couponValid:boolean = true;
  public isInternational:boolean;
  public invalid:any[] = [];
  public coupon:any;
  private failureMessage: string;
  public currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  elements: Elements;
  card: any;
  cardHandler = this.onChange.bind(this);
  error: string;

  elementsOptions: ElementsOptions = {
    locale: 'en'
  };

  constructor(private fb: FormBuilder,
              @Inject(STRIPE_PUB_KEY)  key: string,
              private cd: ChangeDetectorRef,
              private db: AngularFirestore,
              private accountService: AccountService,
              private authenticationService: AuthenticationService,
              private router: Router,
              private subscriptionService: SubscriptionService,
              private paymentService: PayoutService,
              private stripeService: StripeService) {

  }

  onChange({ error }) {
    if (error) {
      this.error = error.message;
    } else {
      this.error = null;
    }
    this.cd.detectChanges();
  }

  ngAfterViewInit() {
    this.stripeService.elements(this.elementsOptions)
      .subscribe(elements => {
        this.elements = elements;
        // Only mount the element the first time
        if (!this.card) {
          this.card = this.elements.create('card', {
            style: {
              base: {
                iconColor: '#666EE8',
                color: '#31325F',
                lineHeight: '40px',
                fontWeight: 300,
                fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                fontSize: '18px',
                '::placeholder': {
                  color: '#CFD7E0'
                }
              }
            }
          });
          this.card.mount('#card-element');
          this.card.addEventListener('change', this.cardHandler);
        }
      });
  }

  ngOnInit() {
    this.paymentRef = this.authenticationService.getPaymentRef();
    this.subscriptionRef = this.subscriptionService.getSubscriptionRef();
    this.user = this.authenticationService.getAuthenticatedUser();

    if(!this.user) {
      this.router.navigateByUrl('plans');
    }
    if(this.paymentRef) {
      this.router.navigateByUrl('signin');
    }
    this.createBillingForm();
  }

  createBillingForm() {
    this.billingForm = this.fb.group({
      cardHolder: new FormControl('', Validators.required),
      coupon:new FormControl('', null),
      phone:new FormControl('', Validators.required),
      street1: new FormControl('', Validators.required),
      street2: new FormControl('', null),
      city: new FormControl('', null),
      state: new FormControl('', null),
      zip: new FormControl('', Validators.required),
      country: new FormControl('', Validators.required)
    });
  }
  addedCoupon(e){
    this.paymentService.getCoupon(e).subscribe(res =>{
      if(res.error){
        this.couponValid = false;
        return;
      }
      this.couponValid = true;
      this.coupon = res;
    })
  }
  public cancel() {}
  save() {
    const ng = this;
    ng.hasSubmitted = true;
    this.success = false;
      const cardHolder:string = ng.billingForm.get('cardHolder').value;
      const phone: string  =  ng.billingForm.get('phone').value;
      const coupon: string = ng.billingForm.get('coupon').value;
      const street1 = ng.billingForm.get('street1').value;
      const street2 = ng.billingForm.get('street2').value;
      const city = ng.billingForm.get('city').value;
      const state = ng.billingForm.get('state').value;
      const zip = ng.billingForm.get('zip').value;
      const country = ng.billingForm.get('country').value;

      ng.stripeService.createToken(ng.card,
        {
          name: cardHolder,
          address_line1: street1,
          address_line2: street2,
          address_city: city,
          address_state: state,
          address_zip: zip,
          address_country: country
        }).subscribe(token => {
        if(token.error){
          ng.success = false;
          ng.hasSubmitted = false;
          ng.error = token.error.message;
          return;
        }
        const localToken = token.token as Token;
        if(!localToken){
          ng.success = false;
          ng.hasSubmitted = false;
          ng.validateAllFormFields(ng.billingForm);
          return;
        }

        let sourceData = {
          type: localToken.type,
          token: localToken.id,
          owner: {
            name:  this.user.displayName,
            email: ng.user.email,
            phone: phone,
            address: {
              line1: localToken.card.address_line1,
              line2: localToken.card.address_line2,
              city: localToken.card.address_city,
              state: localToken.card.address_state,
              country: country,
              postal_code: localToken.card.address_zip
            }
          }
        }
        console.log(sourceData)
        //save source
        ng.stripeService.createSource(ng.card, sourceData).subscribe(source => {
          if(!ng.billingForm.invalid) {
            const localSource: StripeSource = source.source;
            this.createOrRetrieveCustomer(null, phone,localSource.id).subscribe(customerRes => {
              ng.hasSubmitted = true;
              if(!customerRes["code"]) {
                const customer: StripeCustomer = customerRes as StripeCustomer;
                const address:any = {
                  line1: localToken.card.address_line1,
                  line2: localToken.card.address_line2,
                  city: localToken.card.address_city,
                  state: localToken.card.address_state,
                  country_code: country,
                  country: localToken.card.address_country,
                  postal_code: localToken.card.address_zip,
                  phone: phone
                }
                ng.user.firstName = ng.user.displayName.indexOf(" ") != -1 ?
                  ng.user.displayName.trim().split(" ")[0].trim() : ng.user.displayName.trim();
                ng.user.lastName = ng.user.displayName.indexOf(" ") != -1 ?
                  ng.user.displayName.trim().split(" ")[1].trim() : "";
                ng.user.customerId = customer.id;
                ng.user.phone = phone;
                ng.user.isActive = true;
                ng.user.address = address;

                ng.userPointer = {
                  objectId: ng.user.uid,
                  className: '_User',
                  __type: 'Pointer'
                }
                ng.user.address = address;
                let paymentMethod: PaymentMethod = {
                  isDefault: true,
                  customerId: customer.id.trim(),
                  metaData: customer,
                  cardInfo: source.source.card.brand + ':' + token.token.client_ip,
                  card: source.source.card,
                  owner:ng.user,
                  title: source.source.card.brand,
                  isDebit: (source.source.card.funding.toLowerCase() === 'debit'),
                  isActive: (source.source.status.toLowerCase() === 'chargeable'),
                  description: source.source.card.last4,
                  type: 'stripe-recharge-' + token.token.type
                }
                ng.db.collection("paymentMethod").ref
                  .where("owner.uid","==", ng.user.uid).limit(1).get()
                  .then(function(querySnapshot){
                    if(!querySnapshot.empty) {
                      querySnapshot.forEach(function(doc) {
                        doc.ref.update(paymentMethod).then(paymentRes => {
                          ng.defaultSource = source.source;
                          if (ng.modalRef) ng.modalRef.close();
                          ng.authenticationService.savePaymentRef(paymentRes);
                        })
                      });
                    }else{
                      ng.db.collection('paymentMethod').add(paymentMethod).then(res => {
                        ng.defaultSource = source.source;
                        if (ng.modalRef) ng.modalRef.close();
                        ng.authenticationService.savePaymentRef(paymentMethod);
                      }, err => {
                        ng.hasSubmitted = false;
                        ng.success = false;
                        console.log(err);
                      });
                    }
                  }, err =>{
                    console.log(err);
                  });

                  let subscription: StripeSubscription = {
                    customer: customer.id,
                    trial_period_days:ng.subscriptionRef.trial_period_days,
                    "metadata[user_id]": ng.user.uid,
                    "items[0][price]":ng.subscriptionRef.id
                  }
                  // set coupon if available
                  if (coupon && coupon.trim().length > 0) {
                    subscription.coupon = coupon;
                  }
                  ng.paymentService.createStripeSubscription(subscription).subscribe(res => {
                    if (!res.error) {
                      sessionStorage.setItem("coupon",coupon);
                      const license =  uuid.v4();
                      const subscriptionRef = ng.subscriptionService.getSubscriptionRef();
                      const order: Order = {
                        type: 'subscription',
                        license: license,
                        data: res,
                        isActive: true,
                        autoRecharge: false,
                        customerId: customer.id,
                        createdBy: ng.userPointer,
                        id: uuid.v4(),
                        uid:ng.user.uid,
                        subscription: res
                      };
                      const subscription = {
                        data: res,
                        uid: ng.user.uid,
                        type: 'subscription',
                        license: license, isActive: true, id: res.id
                      }
                      ng.db.collection("subscription").ref
                        .where("owner.uid","==", ng.user.uid).limit(1).get()
                        .then(function(querySnapshot) {
                          if (!querySnapshot.empty) {
                            querySnapshot.forEach(function (doc) {
                              doc.ref.update(subscription).then(res => {
                              })
                            }, err => {
                              console.error(err);
                            });
                          } else {
                            ng.db.collection('subscription').add(subscription).then(res => {
                            }, err => {
                              console.error("payment-error:",err);
                            });
                          }

                          ng.db.collection("order").ref
                            .where("owner.uid","==", ng.user.uid).limit(1).get()
                            .then(function(querySnapshot){
                              if(!querySnapshot.empty) {
                                querySnapshot.forEach(function(doc) {
                                  doc.ref.update(order).then(res => {
                                    ng.router.navigateByUrl('signup/confirm');
                                  })
                                },err =>{
                                  console.error(err);
                                });
                              }else{
                                ng.db.collection('order').add(order).then(res => {
                                  ng.router.navigateByUrl('signup/confirm');
                                }, err => {
                                  console.error("payment-error:",err);
                                });
                              }
                            });
                        });
                    } else {
                      this.couponValid = res.error.param !== "coupon";
                      console.error(res.error, this.couponValid);
                      this.error = res.error.message;
                      this.hasSubmitted = false;
                      this.failureMessage = res.error.message;
                      this.success = false;

                    }
                  }, err => {
                    console.error(err);
                    this.hasSubmitted = false;
                    this.success = false;
                  });

              }else{
                this.hasSubmitted = false;
                this.success = false;
                console.log(customerRes);
              }
            })
          } else{
            this.validateAllFormFields(this.billingForm);
            this.hasSubmitted = false;
            this.success = false;
          }
        });
      }, err => {
        this.hasSubmitted = false;
        this.success = false;
        console.error(err);
      });


  }



  countryChanged() {
    const country = this.billingForm.get('country').value;
    this.isInternational = country.toUpperCase() !== "US";
  }

  isFieldValid(field: string) {
    return !this.billingForm.get(field).valid && this.billingForm.get(field).touched;
  }

  displayFieldCss(field: string) {
    return {
      'is-invalid': this.isFieldValid(field),
      'has-feedback': this.isFieldValid(field)
    };
  }

  createOrRetrieveCustomer(customerId?: string,phone?:string, sourceId?: string) :Observable<StripeCustomer>{
    if(customerId == null ) {
      const fullName: string[] = [];
      fullName.push(this.user.firstName);
      fullName.push(this.user.lastName);
      return this.paymentService.createStripeCustomer({
        source: sourceId,
        email: this.user.email,
        phone: phone,
        description:
          this.user.displayName ? this.user.displayName : fullName.join(' ')
      });
    } else {
      return this.paymentService.getStripeCustomer(customerId);
    }
  }

  validateAllFormFields(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control instanceof FormControl) {
        control.markAsTouched({ onlySelf: true });
      } else if (control instanceof FormGroup) {
        this.validateAllFormFields(control);
      }
    });
  }

}
