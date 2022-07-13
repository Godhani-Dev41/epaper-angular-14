import {ChangeDetectorRef, Component, Inject, OnInit} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from "@angular/forms";
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import {
  StripeService,
} from "ngx-stripe";

import {
  StripeCardElementOptions,
  StripeElementsOptions as ElementsOptions,
  Token,
  StripeElement,
  StripeElements as Elements
} from '@stripe/stripe-js';


import {STRIPE_PUB_KEY} from '../../shared/global';
import {StripeCard} from '../../shared/stripe-card';
import {User} from '../../shared/user';
import {Pointer} from '../../shared/pointer';
import {AuthenticationService} from '../authentication.service';
import {PayoutService} from '../payout/payout.service';
import {StripeSource} from '../../shared/stripe-source';
import {StripeCustomer} from '../../shared/stripe-customer';
import {PaymentMethod} from '../../shared/payment-method';
import {Observable} from 'rxjs';
import {Router} from '@angular/router';
import {Subscription} from "../../shared/subscription";
import {Order} from "../../shared/order";
import * as uuid from 'uuid';
import {PaperService} from "../../paper/paper.service";
import {StripeSubscription} from "../../shared/stripe-subscription";
import {SubscriptionService} from "../../subscription/subscription.service";
import {Countries} from "../../shared/countries";
import {AngularFirestore} from "@angular/fire/compat/firestore";

@Component({
  selector: 'app-billing',
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.css'],
  providers: [PayoutService]
})

export class BillingComponent implements OnInit {
  public user: User;
  public subscription: Subscription;
  public isLoading: boolean = false;
  public order: Order;
  public countries = Countries;
  public coupon: string;
  public couponData:any;
  public defaultPaymentMethod: PaymentMethod;
  public success:boolean;
  public couponValid:boolean = true;
  public couponHasSaved:boolean;
  public isInternational:boolean;
  public selectedPlanId:string;
  public planUpdatedMessage:string = "Congratulations! Your subscription was changed successfully.";
  public couponMessage:string;
  public cardUpdatedMessage:string = "Your Billing info was changed successfully.";
  public postQueryHelp: string = 'Post queries happen when a paper is generated and is based on the topics, interests, related country and other information gathered at the time your paper is created.';
  public downloadLimitHelp: string = 'The maximum number of papers downloaded each month. When you download a paper it converts it to a PDF that has been formatted for your device.';
  public articlesPerPaperLimitHelp: string = 'The maximum number of articles that are embedded in your paper. This also includes one daily quote.';
  public paperTemplateHelp: string = 'Once you have created a paper, we store all of the settings you selected. This allows you to easily get the latest news based on your previous preferences without having to recreate it.';
  public defaultSource: any;
  private userPointer: Pointer;
  public billingForm: FormGroup;
  public couponForm: FormGroup;
  public cancelForm: FormGroup;
  private modalRef: NgbModalRef;
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
              private authenticationService: AuthenticationService,
              private db: AngularFirestore,
              private router: Router,
              private paperService: PaperService,
              private subscriptionService: SubscriptionService,
              private payoutService: PayoutService,
              private stripeService: StripeService,
              private modalService: NgbModal) {
  }

  onChange({ error }) {
    if (error) {
      this.error = error.message;
    } else {
      this.error = null;
    }
    this.cd.detectChanges();
  }

  ngOnInit() {
    this.authenticationService.getUser(null, true).subscribe( res => {
      if (!res || !(res as User).stsTokenManager['accessToken']) {
        this.router.navigateByUrl('/signin');
        return false;
      }
      if ((res as User).uid) {
        this.user = res as User;
        this.userPointer = {
          objectId: this.user.uid,
          className: '_User',
          __type: 'Pointer'
        }
      }
      const ng = this;
      ng.db.collection("paymentMethod").ref
        .where("owner.uid","==", ng.user.uid).limit(1).get()
        .then(function(querySnapshot){
          if(!querySnapshot.empty) {
            querySnapshot.forEach(function(doc) {
              let paymentMethod: PaymentMethod = doc.data() as PaymentMethod;
              ng.defaultPaymentMethod = paymentMethod;
              ng.defaultSource = ng.defaultPaymentMethod.metaData.sources.data[0];
            });
          }
        });
      // this.payoutService.getPaymentMethod(this.userPointer,true).subscribe( res => {
      //   //console.log("getPaymentMethod: ", res)
      //   if(res.results && res.results.length > 0 ){
      //     this.defaultPaymentMethod = res.results[0];
      //     this.defaultSource = this.defaultPaymentMethod.metaData.sources.data[0];
      //     //console.log(this.defaultPaymentMethod);
      //   }
      // }, err => {
      //   console.log(err);
      // });

      this.getUsersOrderInfo(this.userPointer);
      this.createBillingForm();
      this.createCouponForm();
      this.createCancelForm();
    }, err => {
      console.log(err);
    });

  }

  getUsersOrderInfo(userPointer: Pointer) {
    this.isLoading = true;
    const ng = this;
    ng.db.collection("order").ref
      .where("uid","==", ng.user.uid).get()
      .then(function(querySnapshot){
        if(!querySnapshot.empty) {
          querySnapshot.forEach(function(doc) {
            ng.order = doc.data() as Order;
            //console.log("getUsersOrderInfo: order",ng.order);
            //console.log("getUsersOrderInfo: subscription",ng.order.subscription);
            ng.subscription = ng.order.subscription as Subscription;
            ng.isLoading = false;
            if(sessionStorage.getItem("coupon")) {
              ng.coupon = sessionStorage.getItem("coupon");
              ng.payoutService.getCoupon(ng.coupon).subscribe(res => {
                if (res.error) {
                  ng.couponValid = false;
                  ng.isLoading = false;
                  ng.couponHasSaved = false;
                  console.error(res.error);
                  return;
                }
                console.log(res )
                ng.couponData = res;
                ng.isLoading = false;
                ng.couponValid = true;
                ng.couponHasSaved = true;
                ng.couponValid = true;
                ng.coupon = res.id;
                sessionStorage.setItem("coupon", ng.coupon);
              });
            }
          });
        }
      });
  }
  cancelAllActiveSubscriptions(customerId){

   // this.payoutService.cancelStripeSubscription()
  }
  createPlan(newPlan:string) {
    const ng = this;
    ng.isLoading = true;
    let subscription: StripeSubscription = {
      customer: ng.order.customerId.trim(),
      "metadata[user_id]": ng.user.uid,
      "items[0][price]": newPlan
    }
    ng.selectedPlanId = newPlan;
    if (this.coupon) {
      subscription.coupon = this.coupon;
      this.couponMessage = "The coupon code <b> "+this.coupon+"</b> has been applied to your subscription."
    }


    this.payoutService.createStripeSubscription(subscription).subscribe(subRes => {
      const ng = this;
      console.log("payoutService.createStripeSubscription:",subscription, subRes)
      if (!subRes.error) {
        const license = uuid.v4();
        const order: Order = {
          license: license,
          data: subRes,
          isActive: true,
          customerId: ng.order.customerId,
          createdBy: ng.userPointer,
          subscription: {
            objectId: subRes.id,
            className: 'Subscription',
            __type: 'Pointer'
          }
        };
        ng.db.collection("subscription").ref
          .where("id","==", ng.order.id).limit(1).get()
          .then(function(querySnapshot){
            if(!querySnapshot.empty) {
              querySnapshot.forEach(function(doc) {
                doc.ref.update({
                  data:subRes,
                  license:license,
                  id:subRes.id,
                  isActive:true
                }).then(res => {
                  ng.subscription.name = subRes.metadata.plan;
                  ng.db.collection("order").ref
                    .where("id","==", ng.order.id).limit(1).get()
                    .then(function(querySnapshot){
                      if(!querySnapshot.empty) {
                        querySnapshot.forEach(function(doc) {
                          doc.ref.update(order).then(res => {
                            ng.success = true;
                            ng.isLoading = false;
                            ng.getUsersOrderInfo(ng.userPointer);
                          })
                        }, err => {
                          console.error(err);
                          ng.isLoading = false;
                        });
                      }
                    });
                })
              });
            }
          }, err =>{
            console.error(err);
          })

        // this.payoutService.updateOrder(order).subscribe(res => {
        //   this.isLoading = false;
        //   this.success = true;
        //   this.subscription.name = subRes.metadata.plan;
        //   this.getUsersOrderInfo(this.userPointer);
        // }, err => {
        //   console.error(err);
        //   this.isLoading = false;
        // })
      } else {
        const errorCode = subRes.error.code;
        const errorParam = subRes.error.param;
        this.error = subRes.error.message;
        ng.success = false;
        ng.isLoading = false;
        if(errorCode === "resource_missing" &&  errorParam === "coupon"){
          ng.couponValid = false;
        }
        console.error(subRes.error)
      }
    }, err => {
      console.error(err);
      ng.isLoading = false;
      ng.success = false;
    });
  }

  managePlan( newPlan:string) {
    this.error = undefined
    console.log(0,  this.order, newPlan);
    if(this.order.isActive){
      this.updatePlan(newPlan);
    }else{
      this.createPlan(newPlan);
    }
  }

  updatePlan(newPlan:string) {
    let ng = this;
    ng.isLoading = true;
    ng.success = undefined;

    console.log(ng.subscription.id);

    const subscription: StripeSubscription = {
      "metadata[order_id]" : ng.order.id,
      "metadata[user_id]" : ng.user.uid,
      cancel_at_period_end: false,
      "items[0][price]" : newPlan,
      proration_behavior: 'create_prorations'
    }
    ng.selectedPlanId = newPlan;
    if(ng.subscription.data.items.data.length > 0){
      subscription["items[0][id]"] = ng.subscription.data.items.data[0].id;
      console.log(subscription)
    }
    if (ng.coupon) {
      subscription.coupon = ng.coupon;
      ng.couponMessage = "The coupon code <b>"+this.coupon+"</b> has been applied to your subscription."
    }

    this.payoutService.updateStripeSubscription(subscription,ng.subscription.id).subscribe(subRes => {
        console.log("293:",subRes)
          if(subRes.error){
            this.isLoading = false;
            this.success = false;
            this.isLoading = false;
            this.error = subRes.error.message
            console.error(subRes.error);
            return;
          }
          ng.db.collection("subscription").ref
            .where("uid","==", ng.user.uid).limit(1).get()
            .then(function(querySnapshot){
              if(!querySnapshot.empty) {
                const license =  uuid.v4();
                querySnapshot.forEach(function (doc) {
                  doc.ref.update({
                    data:subRes,
                    license:license,
                    id:subRes.id,
                    isActive:ng.order.isActive
                  }).then(res => {
                    ng.subscription.name = subRes.metadata.plan;
                    const order: Order = {
                      type: 'subscription',
                      license:license,
                      data: subRes,
                      isActive: ng.order.isActive
                    }
                    ng.db.collection("order").ref
                      .where("uid", "==", ng.user.uid).get()
                      .then(function (querySnapshot) {
                        if (!querySnapshot.empty) {
                          querySnapshot.forEach(function (doc) {
                            doc.ref.update(order).then(res => {
                              ng.success = true;
                              ng.isLoading = false;
                              ng.subscription.name = subRes.metadata.plan;
                             ng.getUsersOrderInfo(ng.userPointer);
                            })
                          });
                        }
                      });
                  })
                });
              }
            });

          // ng.db.collection("order").ref
          //   .where("id","==", ng.order.id).get()
          //   .then(function(querySnapshot){
          //     if(!querySnapshot.empty) {
          //       querySnapshot.forEach(function(doc) {
          //         doc.ref.update(order).then(res => {
          //           ng.success = true;
          //           ng.isLoading = false;
          //           ng.subscription.name = subRes.metadata.plan;
          //         })
          //       });
          //     }
          //   });
          // this.payoutService.updateOrder(order).subscribe(res => {
          //   this.isLoading = false;
          //   this.success = true;
          //   this.subscription.name = subRes.metadata.plan;
          //
          // }, err => {
          //   this.isLoading = false;
          //   console.error(err);
          // })
        }, err => {
          this.isLoading = false;
          // const errorCode = subRes.error.code;
          // const errorParam = subRes.error.param;
          this.success = false;
          this.isLoading = false;
          this.error = err.message;
          // if(errorCode === "resource_missing" &&  errorParam === "coupon"){
          //   this.couponValid = false;
          // }
          console.error(err);
        });
  }

  createBillingForm(withCardInfo?: StripeCard) {
    if (withCardInfo) {
      this.billingForm = this.fb.group({
        cardHolder: new FormControl(withCardInfo.name, Validators.required),
        street1: new FormControl(withCardInfo.billing_address.line1, Validators.min(1)),
        street2: new FormControl(withCardInfo.billing_address.line1, null),
        city: new FormControl(withCardInfo.billing_address.city, null),
        state: new FormControl(withCardInfo.billing_address.state, null),
        zip: new FormControl(withCardInfo.billing_address.postal_code, Validators.min(1)),
        country: new FormControl('', Validators.required)
      });
    } else {
      this.billingForm = this.fb.group({
        cardHolder: new FormControl('', Validators.required),
        street1: new FormControl('', Validators.required),
        street2: new FormControl('', null),
        city: new FormControl('', null),
        state: new FormControl('', null),
        zip: new FormControl('', Validators.required),
        country: new FormControl('', Validators.required)
      });
    }
  }

  createCouponForm() {
      this.couponForm = this.fb.group({
        coupon: new FormControl('', Validators.required)
      });
  }


  createCancelForm() {
    this.cancelForm = this.fb.group({
      cancelReason: new FormControl('', Validators.required)
    });
  }

  public cancel() {
    const ng = this;
    ng.isLoading = true;
    ng.success = undefined
    ng.error = undefined
    if(ng.cancelForm.valid) {
      let reason:string = ng.cancelForm.get("cancelReason").value;
      ng.payoutService.cancelStripeSubscription(ng.order.data.id, reason).subscribe(res => {
        if (res["error"]){
          let error = res["error"] as any;
          let code = error["code"] as string
          ng.error = code == "resource_missing" ? "Your subscription is canceled or does not exist.": error["message"];
          ng.success = false;
          ng.isLoading = false;
          ng.order.isActive = false;
          console.error(this.error)
        }
        //update users account
        ng.db.collection("order").ref
          .where("id","==", ng.order.id).get()
          .then(function(querySnapshot){
            if(!querySnapshot.empty) {
              querySnapshot.forEach(function(doc) {
                doc.ref.update({
                    isActive: false,
                    customerNote: reason,
                    data: res}).then(res => {
                  ng.getUsersOrderInfo(ng.userPointer);
                  ng.cleanUserData();

                  if (ng.modalRef) ng.modalRef.close();
                  ng.isLoading = false;
                }, err =>{
                  console.error(err);
                });

              });
            }
          });
        // this.payoutService.updateOrder({
        //   objectId: this.order.objectId,
        //   isActive: false,
        //   customerNote: reason,
        //   data: res
        // }).subscribe(orderRes => {
        //   if (!orderRes["error"]) {
        //     this.getUsersOrderInfo(this.userPointer);
        //     this.cleanUserData();
        //   } else {
        //     console.error(orderRes);
        //   }
        //   if (this.modalRef) this.modalRef.close();
        //   this.isLoading = false;
        // }, err => {
        //   console.error(err);
        // });
      }, err => {
        console.error(err)
      });
    }
  }

  confirmCancel(content){
    this.modalRef = this.modalService.open(content, {size: 'lg'});
  }

  addUpdateCardInfo(content) {
    this.error = undefined;
    this.modalRef = this.modalService.open(content, {size: 'lg'});
    this.stripeService.elements(this.elementsOptions)
      .subscribe(elements => {
        this.elements = elements;
          this.card = this.elements.create('card', {
            style: {
              base: {
                iconColor: '#666EE8',
                color: '#31325F',
                lineHeight: '38px',
                fontWeight: 300,
                '::placeholder': {
                  color: '#CFD7E0'
                }
              }
            }
          });
          this.card.mount('#card-element');
          this.card.addEventListener('change', this.cardHandler);
      });
  }

  updateCouponState(event){
    const control = this.couponForm.get("coupon");
    this.couponHasSaved = false;
    this.couponValid = control.valid
    this.coupon = control.value
  }

  saveCoupon() {
    let ng = this;
    ng.isLoading = true;
    const control = this.couponForm.get("coupon");
    if(control.valid) {
      ng.payoutService.getCoupon(ng.coupon).subscribe(res => {
        if (res.error) {
          ng.couponValid = false;
          ng.isLoading = false;
          ng.couponHasSaved = false;
          console.error(res.error);
          return;
        }
        ng.couponData = res;
        ng.isLoading = false;
        ng.couponValid = true;
        ng.couponHasSaved = true;
        ng.couponValid = control.valid;
        ng.coupon = control.value
        sessionStorage.setItem("coupon", ng.coupon);
      });
    }else{
      ng.isLoading = false;
      ng.couponValid = false;
    }
  }
  save() {
    let ng = this;
    ng.isLoading = true;
    const cardHolder = ng.billingForm.get('cardHolder').value;
    const street1 = ng.billingForm.get('street1').value;
    const street2 = ng.billingForm.get('street2').value;
    const city = ng.billingForm.get('city').value ? ng.billingForm.get('city').value : '';
    const state = ng.billingForm.get('state').value ? ng.billingForm.get('state').value : '';
    const zip = ng.billingForm.get('zip').value;
    const country = ng.billingForm.get('country').value;

    this.stripeService.createToken(this.card,
      {
        name: cardHolder,
        address_line1:street1,
        address_line2:street2,
        address_city:city,
        address_state: state,
        address_country: country,
        address_zip:zip}).subscribe( token => {
          if(token.error){
            ng.success = false;
            ng.isLoading = false;
            ng.error = token.error.message;
            return;
          }
          const localToken = token.token as Token;
          const fullName: string[] = [];
          fullName.push(ng.user.firstName);
          fullName.push(ng.user.lastName);
          sessionStorage.setItem('token',JSON.stringify(localToken));
          if(ng.billingForm.valid) {
            //save source
            if(!localToken){
              ng.success = false;
              ng.isLoading = false;
              return;
            }
            const address:any = {
              line1: localToken.card.address_line1,
              line2: localToken.card.address_line2,
              city: localToken.card.address_city,
              state: localToken.card.address_state,
              country: localToken.card.address_country,
              postal_code: localToken.card.address_zip
            }
            ng.stripeService.createSource(ng.card, {

              type: localToken.type,
              token: localToken.id,
              metadata: {},//this.userPointer,
              owner: {
                name: cardHolder.trim(),
                email: this.user.email,
                phone: this.user.phone,
                address: address
              }
            }).subscribe(source => {
              const localSource: StripeSource = source.source;
              const customerId: string = ng.order.customerId.trim();
              console.log("0",source,customerId);
              ng.createOrRetrieveCustomer(customerId.trim(), localSource.id).subscribe(res => {
                let customer: StripeCustomer = res as StripeCustomer;
                ng.payoutService.updateStripeCustomer({
                  source: source.source.id
                }, customerId.trim()).subscribe(cRes => {
                  // if (!cRes.error) {
                  ng.user.address = address;
                  let paymentMethod: PaymentMethod = {
                    isDefault: true,
                    customerId: customerId.trim(),
                    metaData: customer,
                    cardInfo: source.source.card.brand + ':' + token.token.client_ip,
                    card: source.source.card,
                    owner:ng.user,
                    title: source.source.card.brand,
                    isDebit: (source.source.card.funding.toLowerCase() === 'debit'),
                    isActive: (source.source.status.toLowerCase() === 'chargeable'),
                    description: source.source.card.last4,
                    type: 'stripe-billing-' + token.token.type
                  }
                  ng.db.collection("paymentMethod").ref
                    .where("owner.uid","==", ng.user.uid).limit(1).get()
                    .then(function(querySnapshot){
                      if(!querySnapshot.empty) {
                        querySnapshot.forEach(function(doc) {
                          doc.ref.update(paymentMethod).then(res => {
                            ng.isLoading = false;
                            ng.defaultSource = source.source;
                          })
                        });
                      }else{
                        ng.db.collection('paymentMethod').add(paymentMethod).then(res => {
                          ng.isLoading = false;
                          ng.defaultSource = source.source;
                        }, err => {
                          console.error("payment-error:",err);
                          ng.isLoading = false;
                        });
                      }
                    });

                  ng.isLoading = false;
                }, err => {
                  ng.isLoading = false;
                });
              });
            });
            // this.stripeService.createSource(this.card, {
            //   type: localToken.type,
            //   token: localToken.id,
            //   metadata: {}, //this.userPointer,
            //   owner: {
            //     name:  cardHolder.trim(),
            //     email: ng.user.email,
            //     phone: ng.user.phone,
            //     address: address
            //   }
            // }).subscribe(source => {
            //   const localSource: StripeSource = source.source;
            //   const customerId: string = ng.order.customerId.trim();
            //   ng.createOrRetrieveCustomer(customerId, localSource.id).subscribe(res => {
            //     let customer: StripeCustomer = res as StripeCustomer;
            //
            //     this.payoutService.updateStripeCustomer({
            //       source: source.source.id
            //     }, customerId).subscribe(cRes => {
            //         ng.user.address = address;
            //         let paymentMethod: PaymentMethod = {
            //           isDefault: true,
            //           customerId: customerId.trim(),
            //           metaData: customer,
            //           cardInfo: source.source.card.brand + ':' + token.token.client_ip,
            //           card: source.source.card,
            //           owner:ng.user,
            //           title: source.source.card.brand,
            //           isDebit: (source.source.card.funding.toLowerCase() === 'debit'),
            //           isActive: (source.source.status.toLowerCase() === 'chargeable'),
            //           description: source.source.card.last4,
            //           type: 'stripe-recharge-' + token.token.type
            //         }
            //           ng.db.collection("paymentMethod").ref
            //             .where("owner.uid", "==", ng.user.uid)
            //             .limit(1)
            //             .get()
            //             .then(function (querySnapshot) {
            //               querySnapshot.forEach(function (doc) {
            //                 ng.defaultPaymentMethod = doc.data() as PaymentMethod;
            //                 ng.defaultSource = ng.defaultPaymentMethod.metaData.sources.data
            //                 && ng.defaultPaymentMethod.metaData.sources.data.length > 0 ?
            //                   ng.defaultPaymentMethod.metaData.sources.data[0] : ng.defaultPaymentMethod;
            //                 ng.orderIsLoading = true;
            //
            //                 console.log(ng.defaultSource)
            //
            //               });
            //             }).catch(function (error) {
            //             ng.orderIsLoading = false;
            //             console.error(error);
            //           });
            //           // thi
            //
            //           this.payoutService.performBatch(requests).subscribe(
            //             res => {
            //               this.payoutService.storeStripePayment({
            //                 isDefault: true,
            //                 customerId: customerId,
            //                 metaData: customer,
            //                 cardInfo: token.token.card.brand + ':' + token.token.client_ip,
            //                 owner: this.userPointer,
            //                 title: token.token.card.brand,
            //                 isDebit: (token.token.card.funding.toLowerCase() === 'debit'),
            //                 isActive: (source.source.status.toLowerCase() === 'chargeable'),
            //                 description: token.token.card.last4,
            //                 type: 'stripe-' + token.token.type
            //               }).subscribe(res => {
            //                 this.isLoading = false;
            //                 this.defaultSource = source.source;
            //                 if (this.modalRef) this.modalRef.close();
            //               }, err => {
            //                 console.log(err);
            //                 this.isLoading = false;
            //               })
            //             }
            //           );
            //         }, err => {
            //           console.error(err);
            //           this.isLoading = false;
            //         });
            //       this.isLoading = false;
            //     }, err => {
            //       this.isLoading = false;
            //     });
            //   });
            //
            // });
          }else{
            ng.validateAllFormFields(this.billingForm);
            ng.isLoading = false;
          }
    }, err => {
      console.error(err);
      ng.isLoading = false;
    });

  }

  cleanUserData() {
    const ng = this;
    //delete data load

    ng.db.collection("dataLoad").ref
      .where("createdBy","==", ng.userPointer).get()
      .then(function(querySnapshot){
        if(!querySnapshot.empty) {
          querySnapshot.forEach(function(doc) {
            doc.ref.delete().then(res => {

            });
          });
        }
      });

    // this.paperService.getDataLoadCount(null, this.userPointer).subscribe(res =>{
    //   let requests: any = {
    //     requests: []
    //   }
    //   for(let dataLoad of res.results) {
    //     let body:any = {
    //       method: 'DELETE',
    //       path: '/parse/classes/DataLoad/' + dataLoad.objectId
    //     }
    //     requests.requests.push(body);
    //   };
    //   this.paperService.performBatch(requests).subscribe(res =>{
    //   }, err => {
    //     console.error(err);
    //   });
    // }, err =>{
    //   console.error(err);
    // });

    //delete downloads
    ng.db.collection("download").ref
      .where("createdBy","==", ng.userPointer).get()
      .then(function(querySnapshot){
        if(!querySnapshot.empty) {
          querySnapshot.forEach(function(doc) {
            doc.ref.delete().then(res => {

            });
          });
        }
      });

    // this.paperService.getDownloadCount( null, this.userPointer).subscribe(res =>{
    //   let requests: any = {
    //     requests: []
    //   }
    //   for(let download of res.results) {
    //     let body:any = {
    //       method: 'DELETE',
    //       path: '/parse/classes/Download/' + download.objectId
    //     }
    //     requests.requests.push(body);
    //   };
    //   this.paperService.performBatch(requests).subscribe(res =>{
    //   }, err => {
    //     console.error(err);
    //   });
    // }, err =>{
    //   console.error(err);
    // });

    //delete papers
    ng.db.collection("paper").ref
      .where("uid","==", ng.user.uid).get()
      .then(function(querySnapshot){
        if(!querySnapshot.empty) {
          querySnapshot.forEach(function(doc) {
            doc.ref.delete().then(res => {

            });
          });
        }
      });
    // this.paperService.getPapersCount( this.userPointer).subscribe(res =>{
    //   let requests: any = {
    //     requests: []
    //   }
    //   for(let download of res.results) {
    //     let body:any = {
    //       method: 'DELETE',
    //       path: '/parse/classes/Paper/' + download.objectId
    //     }
    //     requests.requests.push(body);
    //   };
    //   this.paperService.performBatch(requests).subscribe(res =>{
    //   }, err => {
    //     console.error(err);
    //   });
    // }, err =>{
    //   console.error(err);
    // });
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
  countryChanged() {
    const country = this.billingForm.get('country').value;
    this.isInternational = country.toUpperCase() !== "US";
  }

  isFieldValid(field: string) {
    return !this.billingForm.get(field).valid && this.billingForm.get(field).touched;
  }

  isCancelFieldValid(field: string) {
    return !this.cancelForm.get(field).valid && this.cancelForm.get(field).touched;
  }

  displayFieldCss(field: string) {
    return {
      'is-invalid': this.isFieldValid(field),
      'has-feedback': this.isFieldValid(field)
    };
  }

  displayCancelFieldCss(field: string) {
    return {
      'is-invalid': this.isCancelFieldValid(field),
      'has-feedback': this.isCancelFieldValid(field)
    };
  }
  createOrRetrieveCustomer(customerId?: string, sourceId?: string) :Observable<StripeCustomer>{
    const fullName: string[] = [];
    fullName.push(this.user.firstName);
    fullName.push(this.user.lastName);
    if(!customerId.trim()) {
      return this.payoutService.createStripeCustomer({
        source: sourceId,
        email: this.user.email,
        description:
          this.user.fullName ? this.user.fullName : fullName.join(' ') + ' (' + this.user.uid + ')' + ' card info'
      });
    } else {
      return this.payoutService.getStripeCustomer(customerId.trim());
    }
  }
}
