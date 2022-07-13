import {ChangeDetectorRef, Component, ElementRef, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {saveAs as importedSaveAs} from 'file-saver';
import * as uuid from 'uuid';

import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from "@angular/forms";
import {Options} from '@angular-slider/ngx-slider';

import {Pointer} from "../../shared/pointer";
import {User} from "../../shared/user";
import {Router} from "@angular/router";
import {AuthenticationService} from "../authentication.service";
import {AccountService} from "../account.service";
import {ObjectRef} from "../../shared/object-ref";
import {Paper} from "../../shared/paper";
import {PaperService} from "../../paper/paper.service";
import {Order} from "../../shared/order";
import {Subscription} from "../../shared/subscription";
import {NgbModal, NgbModalRef, NgbNavChangeEvent, NgbModalConfig} from "@ng-bootstrap/ng-bootstrap";
import {Countries} from "../../shared/countries";
import {Topics} from "../../shared/topics";
import {Networks} from "../../shared/networks";
import {Error} from "../../shared/error";
import {Languages} from "../../shared/languages";
import {Platforms} from "../../shared/platforms";
import {Post} from "../../shared/post";
import {StripeOrder} from "../../shared/stripe-order";
import {PayoutService} from "../payout/payout.service";
import {PaymentMethod} from "../../shared/payment-method";
import {StripeCard} from "../../shared/stripe-card";
import * as imageToBase64 from 'image-to-base64/browser';
import {
  StripeService, StripeCardComponent
} from "ngx-stripe";
import {
  StripeCardElementOptions,
  StripeElementsOptions
} from '@stripe/stripe-js';


import {
  StripeElementsOptions as ElementsOptions,
  Token,
  StripeElements as Elements
} from '@stripe/stripe-js';
import {StripeSource} from "../../shared/stripe-source";
import {StripeCustomer} from "../../shared/stripe-customer";
import {map, Observable, tap, zip} from "rxjs";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {DataLoad} from "../../shared/data-load";
import {Download} from "../../shared/download";
import {limit} from "@angular/fire/firestore";
import {StripePayment} from "../../shared/stripe-payment";
import firebase from "firebase/compat";
import Timestamp = firebase.firestore.Timestamp;
import jsPDF from "jspdf";
import {Page} from "../../shared/page";
import {formatDate} from "@angular/common";
import {NgxCaptureService} from "ngx-capture";
import {Address} from "../../shared/address";
import {HttpClient} from "@angular/common/http";

interface SimpleSliderModel {
  value: number;
  options: Options;
}

@Component({
  selector: 'app-order',
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss'],
  providers: [AccountService, PayoutService, NgbModalConfig]
})
export class OrderComponent implements OnInit {
  @ViewChild('screen') screen: any;
  @ViewChild('autoChargeContent', {}) autoRechargeContent: TemplateRef<any>;

  private paperModelRef: NgbModalRef;
  private paperInstallModelRef: NgbModalRef;
  private rechargeModelRef: NgbModalRef;
  private autoRechargeModelRef: NgbModalRef;
  private userPointer: Pointer;

  public selectedPaper: Paper;
  public selectedIndex: number;
  public papers: Paper[] = [];
  public user: User;
  public order: Order;
  public rechargeOrder: Order = {};
  public showHelp: boolean = false;
  public canDownload: boolean = true;
  public canAddPaper: boolean = true;
  public subscription: Subscription;
  public now: Date = new Date();
  public remainingDownloads: number;
  public remainingDataLoads: number;
  public totalDownloadsFromRechargeOrder: number = 0;
  public totalDataLoadsFromRechargeOrder: number = 0;
  public static RECHARGE_SKU: string = "sku_GeAZV1gaorBdz4";
  public toggleShowWarning: boolean = true;
  public remainingPapers: number = 0;
  public downloads: number[] = [];
  public dataLoads: number;
  public rechargeItem: any = {};
  public rechargePrice: number = 4.99;
  public rechargeQuantityOffset: number = 15;
  public rechargeTotal: number = 0;
  public fromIncrement: number = 0;
  public rechargeTotalPrice: number = 0;
  public isInternational: boolean;
  public doAutoRecharge: boolean;
  public includePhotos: boolean = true;
  public activeTab = 1;

  public subscriptionIsActive: boolean;
  public subscriptionIsPending: boolean;
  public subscriptionIsFailing: boolean;
  public subscriptionFailedMessage: string;

  public isDownloading: boolean;
  public subscriptionCanceled: boolean;
  public replaceCard: boolean;
  public downloadFailed: boolean;
  public isLoading: boolean;
  public orderIsLoading: boolean;
  public success: boolean;
  public failureMessage: string;
  public orderSucceeded: boolean;
  public showConfirm: boolean;
  public tabletConnectionFailed: boolean = true;
  public orderFailureMessage: string;

  public newsForm: FormGroup;
  public researchForm: FormGroup;
  public webForm: FormGroup;

  public billingForm: FormGroup;
  public rechargeForm: FormGroup;
  public topics = Topics;
  public languages = Languages;
  public networks = Networks;
  public platforms = Platforms;
  public countries = this.filterCountriesForNews();
  public defaultSource: any;
  public defaultPaymentMethod: PaymentMethod;
  public keywords: string[] = [];
  private platform: any;
  private topic: any;
  private language: any;
  private country: any;
  private network: any;
  public quote: any;
  public pageDataMap = new Map();
  public hasLoaded: boolean = false;
  public isAuthorized: boolean;
  public numberRenderedPages: number = 0;
  public location: string;
  public paper: Paper;
  public img: any;
  public elements: Elements;
  public card: any;
  public cardHandler = this.onChange.bind(this);
  public papersEmpty:boolean = false;
  error: string;

  private license: string;
  private pId: string;
  private sessionToken: string;
  private postLocations = new Map();


  elementsOptions: ElementsOptions = {
    locale: 'en'
  };

  topicsConfig = {
    displayKey: "name", //if objects array passed which key to be displayed defaults to description
    search: true, //true/false for the search functionlity defaults to false,
    height: 'auto', //height of the list so that if there are more no of items it can show a scroll defaults to auto. With auto height scroll will never appear
    placeholder: 'Select', // text to be displayed when no item is selected defaults to Select,
    customComparator: undefined, // a custom function using which user wants to sort the items. default is undefined and Array.sort() will be used in that case,
    limitTo: this.topics.length, // a number thats limits the no of options displayed in the UI similar to angular's limitTo pipe
    moreText: 'more', // text to be displayed whenmore than one items are selected like Option 1 + 5 more
    noResultsFound: 'No results found!', // text to be displayed when no items are found while searching
    searchPlaceholder: 'Search', // label thats displayed in search input,
    searchOnKey: 'name', // key on which search should be performed this will be selective search. if undefined this will be extensive search on all keys
  }

  networksConfig = {
    displayKey: "name", //if objects array passed which key to be displayed defaults to description
    search: true, //true/false for the search functionlity defaults to false,
    height: 'auto', //height of the list so that if there are more no of items it can show a scroll defaults to auto. With auto height scroll will never appear
    placeholder: 'Select', // text to be displayed when no item is selected defaults to Select,
    customComparator: undefined, // a custom function using which user wants to sort the items. default is undefined and Array.sort() will be used in that case,
    limitTo: this.networks.length, // a number thats limits the no of options displayed in the UI similar to angular's limitTo pipe
    moreText: 'more', // text to be displayed whenmore than one items are selected like Option 1 + 5 more
    noResultsFound: 'No results found!', // text to be displayed when no items are found while searching
    searchPlaceholder: 'Search', // label thats displayed in search input,
    searchOnKey: 'name', // key on which search should be performed this will be selective search. if undefined this will be extensive search on all keys
  }

  platformsConfig = {
    displayKey: "name", //if objects array passed which key to be displayed defaults to description
    search: true, //true/false for the search functionlity defaults to false,
    height: 'auto', //height of the list so that if there are more no of items it can show a scroll defaults to auto. With auto height scroll will never appear
    placeholder: 'Select', // text to be displayed when no item is selected defaults to Select,
    customComparator: undefined, // a custom function using which user wants to sort the items. default is undefined and Array.sort() will be used in that case,
    limitTo: this.platforms.length, // a number thats limits the no of options displayed in the UI similar to angular's limitTo pipe
    moreText: 'more', // text to be displayed whenmore than one items are selected like Option 1 + 5 more
    noResultsFound: 'No results found!', // text to be displayed when no items are found while searching
    searchPlaceholder: 'Search', // label thats displayed in search input,
    searchOnKey: 'name', // key on which search should be performed this will be selective search. if undefined this will be extensive search on all keys
  }

  countryConfig = {
    displayKey: "name", //if objects array passed which key to be displayed defaults to description
    search: true, //true/false for the search functionlity defaults to false,
    height: 'auto', //height of the list so that if there are more no of items it can show a scroll defaults to auto. With auto height scroll will never appear
    placeholder: 'Select', // text to be displayed when no item is selected defaults to Select,
    customComparator: undefined, // a custom function using which user wants to sort the items. default is undefined and Array.sort() will be used in that case,
    limitTo: this.filterCountriesForNews().length, // a number thats limits the no of options displayed in the UI similar to angular's limitTo pipe
    moreText: 'more', // text to be displayed whenmore than one items are selected like Option 1 + 5 more
    noResultsFound: 'No results found!', // text to be displayed when no items are found while searching
    searchPlaceholder: 'Search', // label thats displayed in search input,
    searchOnKey: 'name', // key on which search should be performed this will be selective search. if undefined this will be extensive search on all keys
  }

  languageConfig = {
    displayKey: "name", //if objects array passed which key to be displayed defaults to description
    search: true, //true/false for the search functionlity defaults to false,
    height: 'auto', //height of the list so that if there are more no of items it can show a scroll defaults to auto. With auto height scroll will never appear
    placeholder: 'Select', // text to be displayed when no item is selected defaults to Select,
    customComparator: () => {
    }, // a custom function using which user wants to sort the items. default is undefined and Array.sort() will be used in that case,
    limitTo: this.languages.length, // a number thats limits the no of options displayed in the UI similar to angular's limitTo pipe
    moreText: 'more', // text to be displayed whenmore than one items are selected like Option 1 + 5 more
    noResultsFound: 'No results found!', // text to be displayed when no items are found while searching
    searchPlaceholder: 'Search', // label thats displayed in search input,
    searchOnKey: 'name' // key on which search should be performed this will be selective search. if undefined this will be extensive search on all keys
  }
  cardOptions: StripeCardElementOptions = {
    style: {
      base: {
        iconColor: '#666EE8',
        color: '#31325F',
        fontWeight: '300',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSize: '20px',
        '::placeholder': {
          color: '#CFD7E0'
        }
      }
    }
  };
  verticalSlider: SimpleSliderModel = {
    value: 0,
    options: {
      floor: 0,
      ceil: 20,
      // step: 0,
      showTicks: true,
      showSelectionBar: true,
      showTicksValues: true,
      tickValueStep: 20,

      getLegend: (e) => {
        if (e % 2) {
          return '';
        }
        return e + '';
      }
    }
  };

  constructor(private fb: FormBuilder,
              private http: HttpClient,
              private router: Router,
              private modalService: NgbModal,
              private cd: ChangeDetectorRef,
              private captureService: NgxCaptureService,
              private db: AngularFirestore,
              private paperService: PaperService,
              private payoutService: PayoutService,
              private stripeService: StripeService,
              private config: NgbModalConfig,
              private auth: AngularFireAuth,
              private authenticationService: AuthenticationService) {
    config.backdrop = 'static';
    config.keyboard = false;
  }

  onChange({error}) {
    if (error) {
      this.error = error.message;
    } else {
      this.error = null;
    }
    this.cd.detectChanges();
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    this.activeTab = changeEvent.nextId;
  }

  ngOnInit(): void {
    this.authenticationService.getUser(null, true).subscribe(res => {
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

      this.toggleShowWarning = localStorage.getItem("toggleAutoRechargeWarning")
        && Number(localStorage.getItem("toggleAutoRechargeWarning")) > 0;
      this.getUsersPapers(this.userPointer);

    }, err => {
      console.error(err);
    });
  }

  filterCountriesForNews() {
    return Countries.filter(function (i) {
      return i.newsOnly === true;
    });
  }

  getUsersPapers(userPointer: Pointer) {
    let ng = this;
    ng.isLoading = true;
    ng.totalDownloadsFromRechargeOrder = 0;
    ng.totalDataLoadsFromRechargeOrder = 0;
    ng.papers = [];
    let orderDoc = null;

    ng.db.collection("order").ref.where("uid", "==", ng.user.uid)
      .limit(1)
      .get()
      .then(function (querySnapshot) {
          querySnapshot.forEach(function (doc) {
            orderDoc = doc;
            ng.order = orderDoc.data() as Order;
            if(ng.order.type === "subscription") {
            let query = ng.db.collection("subscription").ref
              .where("uid", "==", ng.user.uid)
              .limit(1)
              .get()
              .then(function (querySnapshot) {
                querySnapshot.forEach(function (doc) {

                  ng.subscription = doc.data() as Subscription;
                  console.log("jason", doc.data())

                  ng.payoutService.getStripeSubscription(ng.subscription.id).subscribe(subRes => {
                    console.log(subRes);
                    if (!subRes["error"]) {
                      if (subRes.status === "incomplete_expired"
                        || subRes.status === "canceled"
                        || subRes.status === "unpaid"
                        || subRes.status === "past_due") {
                        ng.subscriptionIsActive = false;
                        ng.subscriptionIsPending = false;
                        ng.subscriptionIsFailing = true;
                        ng.subscriptionCanceled = subRes.status === "canceled";
                        ng.subscriptionFailedMessage = ng.subscriptionCanceled ?
                          "Your subscription has been canceled." : "There is a billing issue with your account.";

                      } else if (subRes.status === "incomplete") {
                        ng.subscriptionIsActive = false;
                        ng.subscriptionIsPending = true;
                        ng.subscriptionIsFailing = false;
                        ng.subscriptionFailedMessage = "There is a billing issue with your account. Please contact us within 24 hours to avoid service interruption.";
                      } else {
                        ng.subscriptionIsActive = true;
                        ng.subscriptionIsPending = false;
                        ng.subscriptionIsFailing = false;
                      }

                      if (subRes.status === "incomplete" || subRes.status === "active" || subRes.status === "trialing") {
                        //ng.subscription = ng.order.subscription as Subscription;
                        console.log(ng.subscription)
                        ng.remainingDownloads = ng.subscription.data.plan.metadata.downloads;
                        ng.remainingDataLoads = ng.subscription.data.plan.metadata.dataLoads
                        ng.remainingPapers = ng.subscription.data.plan.metadata.papers;

                        console.log(0,ng.remainingDownloads ,ng.remainingDataLoads,ng.remainingPapers )
                        ng.canAddPaper = true;
                        ng.isLoading = undefined;

                        ng.db.collection("paper").ref
                          .where("uid", "==", ng.user.uid)
                          .orderBy('updatedAt')
                          .get()
                          .then(function (querySnapshot) {
                            querySnapshot.forEach(function (doc) {
                              let paper: Paper = doc.data();
                              ng.papers.push(paper);

                              ng.papersEmpty = false;
                            });
                            ng.remainingPapers = ng.remainingPapers != -1 ? ng.subscription.data.plan.metadata.papers - ng.papers.length : -1;
                            ng.canAddPaper = ng.remainingPapers > 0;
                            ng.updateDownloadCount();
                            ng.updateDataLoadCount();

                            ng.selectedPaper = undefined;
                            ng.selectedIndex = undefined;
                            ng.subscriptionIsFailing = false;
                            ng.subscriptionFailedMessage = undefined;

                            //update users account
                            ng.db.collection("order").ref
                              .where("id","==", ng.order.id).get()
                              .then(function(querySnapshot){
                                if(!querySnapshot.empty) {
                                  querySnapshot.forEach(function(doc) {
                                    console.log("subRes.status",subRes.status)
                                    doc.ref.update({subscription:ng.subscription,data:subRes,isActive: subRes.status !== "canceled"}).then(res => {
                                      ng.success = true;
                                      ng.isLoading = false;
                                      ng.orderIsLoading = false;
                                    })
                                  });
                                }
                              });
                          });
                      }
                    } else {
                      ng.subscriptionIsFailing = true;
                      ng.subscriptionFailedMessage = subRes.error.message;
                      console.error(subRes)
                    }
                  });
                });
              }).catch(error => {
                console.error(error);
              });
            }else{
              ng.totalDownloadsFromRechargeOrder += ng.subscription.data.plan.metadata.downloads
              ng.totalDataLoadsFromRechargeOrder += ng.subscription.data.plan.metadata.dataLoads;
              console.log(1,ng.remainingDownloads ,ng.remainingDataLoads,ng.remainingPapers,ng.totalDataLoadsFromRechargeOrder ,ng.totalDownloadsFromRechargeOrder)
            }
          });

      }).catch(error => {
      console.error(error);
    });
  }

  createRechargeForm() {
    let ng = this;
    ng.rechargeForm = this.fb.group({
      quantity: new FormControl(1, Validators.min(1))
    });
  }

  createBillingForm(withCardInfo?: StripeCard) {
    if (withCardInfo) {
      this.billingForm = this.fb.group({
        cardHolder: new FormControl(withCardInfo.name, Validators.required),
        street1: new FormControl(withCardInfo.billing_address.line1, Validators.min(1)),
        street2: new FormControl(withCardInfo.billing_address.line2, null),
        city: new FormControl(withCardInfo.billing_address.city, null),
        state: new FormControl(withCardInfo.billing_address.state, null),
        country: new FormControl(withCardInfo.billing_address.country_code, Validators.required),
        zip: new FormControl(withCardInfo.billing_address.postal_code, Validators.min(1))
      });
    } else {
      this.billingForm = this.fb.group({
        cardHolder: new FormControl('', Validators.required),
        street1: new FormControl('', Validators.required),
        street2: new FormControl('', null),
        city: new FormControl('', null),
        state: new FormControl('', null),
        country: new FormControl('', Validators.required),
        zip: new FormControl('', Validators.required)
      });
    }
  }

  createForm(withPaper: Paper) {
    let platformFromStorage = sessionStorage.getItem("platform") ? JSON.parse(sessionStorage.getItem("platform")) : {code:'reMarkable'};
    let platform = platformFromStorage.code ? platformFromStorage : '';
    if (withPaper) {
      if (withPaper.type.toLowerCase() === "news") {
        this.activeTab = 1;
      } else if (withPaper.type.toLowerCase() === "research") {
        this.activeTab = 2;
      } else {
        this.activeTab = 3;
      }
      this.newsForm = this.fb.group({
        languages: new FormControl(withPaper.preferredLanguage.length > 0 ? withPaper.preferredLanguage : '', null),
        networks: new FormControl(withPaper.networks, null),
        platforms: new FormControl(withPaper.platforms ? withPaper.platforms : platform, null),
        keywords: new FormControl(withPaper.keywords, null),
        topics: new FormControl(withPaper.interests.length > 0 ? withPaper.interests : '', null),
        countries: new FormControl(withPaper.countries ? withPaper.countries : '', null)
      });
      this.researchForm = this.fb.group({
        languages: new FormControl(withPaper.preferredLanguage.length > 0 ? withPaper.preferredLanguage : '', null),
        platforms: new FormControl(withPaper.platforms ? withPaper.platforms : platform, null),
        websites: new FormControl(withPaper.websites, null),
        people: new FormControl(withPaper.people, null),
        organizations: new FormControl(withPaper.organizations, null),
        keywords: new FormControl(withPaper.keywords, null),
        topics: new FormControl(withPaper.interests.length > 0 ? withPaper.interests : '', null),
        countries: new FormControl(withPaper.countries ? withPaper.countries : '', null)
      });
      this.webForm = this.fb.group({
        platforms: new FormControl(withPaper.platforms ? withPaper.platforms : platform, null),
        urls: new FormControl(withPaper.webPages, null)
      });
    } else {
      this.newsForm = this.fb.group({
        languages: new FormControl('', null),
        platforms: new FormControl(platform, null),
        networks: new FormControl('', null),
        keywords: new FormControl('', null),
        topics: new FormControl('', null),
        countries: new FormControl('', null)
      });
      this.researchForm = this.fb.group({
        languages: new FormControl('', null),
        platforms: new FormControl(platform, null),
        websites: new FormControl('', null),
        people: new FormControl('', null),
        organizations: new FormControl('', null),
        keywords: new FormControl('', null),
        topics: new FormControl('', null),
        countries: new FormControl('', null)
      });

      this.webForm = this.fb.group({
        platforms: new FormControl(platform, null),
        urls: new FormControl('', null)
      });
    }
  }

  getCardButtonLabel():string{
    return this.defaultSource ? "Replace card" : "Add card";
  }
  toggleReplaceCard(save?: boolean) {
    let ng = this;
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
        }
        if (save && this.replaceCard) {
          ng.saveRechargeCard();
          if (this.billingForm.valid) {
            ng.replaceCard = !ng.replaceCard;
            ng.verticalSlider.options = Object.assign({}, ng.verticalSlider.options, {readOnly: ng.replaceCard});
            ng.showConfirm = false;
          }
        } else {
          this.replaceCard = !this.replaceCard;
          this.verticalSlider.options = Object.assign({}, this.verticalSlider.options, {readOnly: this.replaceCard});
          this.showConfirm = false;
        }
        this.orderIsLoading = false;
      })

  }

  addUpdatePaper(content, index?: number) {
    this.failureMessage = undefined;
    if (index != null) {
      this.selectedIndex = index;
      this.selectedPaper = this.papers[index];
      this.createForm(this.selectedPaper as Paper);
    } else {
      this.selectedPaper = undefined;
      this.selectedIndex = undefined;
      this.createForm(null);
    }
    this.paperModelRef = this.modalService.open(content, {size: 'lg'});
  }

  handleConnectionError() {
    this.tabletConnectionFailed = true;
  }

  openPaperInstall(content) {
    this.tabletConnectionFailed = false;
    this.paperInstallModelRef = this.modalService.open(content, {size: 'lg', backdrop: 'static', keyboard: false});
  }

  setAutoRechargeWarning(event) {
    const checkbox = event.target;
    this.toggleShowWarning = checkbox.checked;
    localStorage.setItem("toggleAutoRechargeWarning", "" + Number(this.toggleShowWarning));
  }

  showAutoRecharge(content) {
    if (!this.modalService.hasOpenModals()) {
      this.autoRechargeModelRef = this.modalService.open(content, {size: 'lg'});
    }
  }

  test() {
    this.showAutoRecharge(this.autoRechargeContent);
  }

  updateDataLoadCount() {
    const ng = this;
    ng.db.collection("dataLoad").ref
      .where("createdBy", "==", ng.userPointer)
      .get()
      .then(function (querySnapshot) {
        ng.remainingDataLoads = (ng.subscription.data.plan.metadata.dataLoads - ng.totalDataLoadsFromRechargeOrder) - querySnapshot.docs.length;
        ng.canAddPaper = ng.remainingDataLoads > 0;
        ng.showHelp = ng.remainingDataLoads == ng.subscription.data.plan.metadata.dataLoads;
        ng.handleAutoRecharge();
      });
  }

  updateDownloadCount(){
    const ng = this;
    console.log(ng.userPointer)
    ng.db.collection("download").ref
      .where("createdBy", "==", ng.userPointer)
      .get()
      .then(function (querySnapshot) {
        ng.remainingDownloads = (ng.subscription.data.plan.metadata.downloads - ng.totalDownloadsFromRechargeOrder) - querySnapshot.docs.length;
        ng.canDownload = ng.remainingDownloads > 0;
        ng.showHelp = ng.remainingDownloads == ng.subscription.data.plan.metadata.downloads;
        console.log(3,ng.remainingDownloads ,ng.remainingDataLoads,ng.remainingPapers )
        let i = 0;
        for (let paper of ng.papers) {
          let count = 0;
          for (let download of querySnapshot.docs) {
            if (paper.id === download.data()['paper'].objectId) {
              count++;
            }
          }
          ng.downloads[i] = count;
          i++;
        }
        ng.handleAutoRecharge();
      });
    // this.paperService.getDownloadCount( null,this.userPointer ).subscribe( res =>{
    //   this.remainingDownloads = (this.subscription.downloads + this.totalDownloadsFromRechargeOrder)- res.count;
    //   this.canDownload = this.remainingDownloads > 0;
    //   this.showHelp = this.remainingDownloads == this.subscription.downloads;
    //
    //   let i = 0;
    //   for (let paper of this.papers) {
    //     let count = 0;
    //     for (var download of res.results) {
    //       if(paper.objectId === (download['paper'] as ObjectRef).objectId) {
    //         count ++;
    //       }
    //     }
    //     this.downloads[i] = count;
    //     i++;
    //   }
    //   this.handleAutoRecharge();
    // }, err =>{
    //   console.error(err);
    // });
  }

  doRemove(paper: Paper) {
    const ng = this;
    ng.db.collection('paper')
      .ref.where('id', '==', paper.id).get()
      .then(function (querySnapshot) {
        querySnapshot.forEach(function (doc) {
          doc.ref.delete().then(res => {
            ng.getUsersPapers(ng.userPointer);

          });
        });
      });
  }

  download(paper: Paper) {
    const ng = this;
    ng.selectedPaper = paper;
    console.log("selectedPaper:", ng.selectedPaper);
    ng.isDownloading = true;
    ng.downloadFailed = undefined;

    let download: Download = {
      createdAt: new Date().getTime(),
      subscription: {
        objectId: ng.subscription.id,
        className: 'Subscription',
        __type: 'Pointer'
      },
      order: {
        objectId: ng.order.id,
        className: 'Order',
        __type: 'Pointer'
      },
      paper: {
        objectId: paper.id,
        className: 'Paper',
        __type: 'Pointer'
      },
      createdBy: ng.userPointer
    }
    ng.db.collection('download').add(download).then(res => {
      let url = paper.type.toLowerCase() !== "web" ? "https://www.epaperweekly.com/paper/" + this.order.license + "/" + paper.id : paper.webPages[0].display;
      this.paperService.downloadPaper(url, this.user).subscribe(res => {
        let language = paper.preferredLanguage.length > 0 ? paper.preferredLanguage[0].code + "-" : "";
        let country = paper.countries && paper.countries['code'] ? paper.countries['code'] + "-" : "";
        let web = paper.type.toLowerCase() === "web" ? "web-" : ""

        this.updateDownloadCount();
        this.isDownloading = false;
        this.selectedPaper = undefined;
        this.downloadFailed = undefined;

        importedSaveAs(res as Blob,
          "epaperweekly-" + web + language.toLowerCase() + country.toLowerCase() + this.now.getTime() + ".pdf");
      }, err => {
        this.downloadFailed = true;
        this.isDownloading = false;
        console.error(err);
      });
    }).catch(error => {
      console.error(error);
      ng.success = false;
      ng.isLoading = false;
    });

    //
    //   this.paperService.addDownload({
    //     subscription:{
    //       objectId: this.subscription.objectId,
    //       className: 'Subscription',
    //       __type: 'Pointer'
    //     },
    //     order: {
    //       objectId: this.order.objectId,
    //       className: 'Order',
    //       __type: 'Pointer'
    //     },
    //     paper: {
    //       objectId: paper.objectId,
    //       className: 'Paper',
    //       __type: 'Pointer'
    //     },
    //     createdBy:this.userPointer
    //   }).subscribe(res => {
    //     let url = paper.type.toLowerCase() !== "web" ? "https://epaperweekly.herokuapp.com/paper/"+this.order.license+"/"+paper.objectId : paper.webPages[0].display;
    //     this.paperService.downloadPaper(url, this.user).subscribe(res => {
    //       let language  = paper.preferredLanguage.length > 0 ? paper.preferredLanguage[0].code+"-": "";
    //       let country = paper.countries && paper.countries['code'] ? paper.countries['code']+"-": "";
    //       let web = paper.type.toLowerCase() === "web" ? "web-" : ""
    //       importedSaveAs(res as Blob,
    //         "epaperweekly-"+web+language.toLowerCase()+country.toLowerCase()+this.now.getTime()+".pdf");
    //       this.updateDownloadCount();
    //       this.isDownloading = false;
    //       this.selectedPaper = undefined;
    //       this.downloadFailed = undefined;
    //     }, err=> {
    //       this.downloadFailed = true;
    //       this.isDownloading = false;
    //       console.error(err);
    //     })
    //   }, err => {
    //     console.error(err);
    //   });
  }

  dataLoad(paper: Paper) {
    let ng = this;
    console.log(ng.subscription, ng.order, paper.id)
    let dataLoad = {
      subscription: {
        objectId: ng.subscription.id,
        className: 'Subscription',
        __type: 'Pointer'
      },
      order: {
        objectId: ng.order.id,
        className: 'Order',
        __type: 'Pointer'
      },
      paper: {
        objectId: paper.id,
        className: 'Paper',
        __type: 'Pointer'
      },
      createdBy: ng.userPointer,
      createdAt: new Date()
    };
    console.log("dataLoad", dataLoad);
    ng.db.collection('dataLoad').add(dataLoad).then(res => {
      ng.isLoading = false;
      ng.dataLoads++;
      ng.updateDataLoadCount();
    }).catch(error => {
      console.error(error);
      ng.success = false;
      ng.isLoading = false;
    });
    // this.paperService.addDataLoad().subscribe(res => {
    //   this.dataLoads++;
    //   this.updateDataLoadCount();
    // }, err => {
    //   console.error(err);
    // });
  }

  topicsSelectionChanged(event) {
    this.topic = event.value
  }

  networksSelectionChanged(event) {
    this.network = event.value
  }

  platformSelectionChanged(event) {
    this.platform = event.value
    sessionStorage.setItem("platform", JSON.stringify(this.platform));
  }

  languageSelectionChanged(event) {
    console.log(event)
    this.language = event.value
  }

  countrySelectionChanged(event) {
    this.country = event.value
  }

  savePaper(paper: Paper, refresh?: boolean) {
    // save paper
    console.log("paper:", paper);
    console.log(refresh, this.selectedIndex, this.selectedPaper);
    const ng = this;
    if ((!this.selectedPaper && !paper.id) || refresh) {
      paper.uid = ng.user.uid;
      paper.id = uuid.v4();
      paper.createdAt = new Date().getTime();
      paper.updatedAt = new Date().getTime();

      //remove unwanted data
      for (let post of paper.posts) {
        delete (post['sentiment']);
        delete (post['social_shares_count']);
        delete (post['license_type']);
        delete (post['clusters']);
        delete (post['entities']);
        delete (post['categories']);
      }

      ng.db.collection('paper').add(paper).then(res => {
        if (ng.paperModelRef) {
          ng.paperModelRef.close();
        }
        ng.dataLoad(paper);
        ng.getUsersPapers(ng.userPointer);
        ng.isLoading = false;
      }).catch(error => {
        console.error(error);
        ng.success = false;
        ng.isLoading = false;
      });
    } else {
      console.log("editing");
      console.log("selected", ng.selectedPaper);
      paper.updatedAt = new Date().getTime();
      //update posts
      ng.paperService.getNewsPaperData(paper, false, new Date(), 1, 16).subscribe(res => {
        console.log(res)
        paper.posts = (res && res.stories) ? res.stories as Post[] : [];

      }, err => {
        console.error(err);
      });

      this.db.collection("paper").ref
        .where("id", "==", ng.selectedPaper.id).get()
        .then(function (querySnapshot) {
          if (!querySnapshot.empty) {
            querySnapshot.forEach(function (doc) {
              doc.ref.update(paper).then(res => {
                ng.success = true;
                ng.isLoading = false;
                ng.orderIsLoading = false;
                ng.selectedIndex = undefined;
                ng.selectedPaper = undefined;
                ng.getUsersPapers(ng.userPointer);
                ng.paperModelRef.close();
              })
            });
          }
        });
      // this.paperService.updatePaper(paper).subscribe(res => {
      //   //close if window open
      //   this.isLoading = false;
      //   if(this.paperModelRef){
      //     this.paperModelRef.close();
      //     this.getUsersPapers(this.userPointer);
      //   }
      // }, error => {
      //   this.success = false;
      //   this.isLoading = false;
      //   this.failureMessage = error;
      //   console.error(error);
      // });
    }
  }

  doSavePaper(paper?: Paper, refresh?: boolean, duplicate?: boolean) {
    this.isLoading = true;
    paper = paper ? paper : {
      includePhotos: this.includePhotos,
      createdBy: this.userPointer
    }
    paper.posts = [];
    if (!duplicate) {
      if (this.activeTab == 1) {
        paper.type = "News";
        paper.interests = this.newsForm.get('topics').value ? this.newsForm.get('topics').value : [];
        paper.networks = this.newsForm.get('networks').value ? this.newsForm.get('networks').value : [];
        paper.platforms = this.newsForm.get('platforms').value ? this.newsForm.get('platforms').value : null;
        paper.keywords = this.newsForm.get('keywords').value ? this.newsForm.get('keywords').value : [];
        paper.countries = this.newsForm.get('countries').value ? this.newsForm.get('countries').value : null;
        paper.preferredLanguage = this.newsForm.get('languages').value ? this.newsForm.get('languages').value : [];
        paper.webPages = [];
      } else if (this.activeTab == 2) {
        paper.type = "Research";
        paper.websites = this.researchForm.get('websites').value ? this.researchForm.get('websites').value : [];
        paper.people = this.researchForm.get('people').value ? this.researchForm.get('people').value : [];
        paper.platforms = this.researchForm.get('platforms').value ? this.researchForm.get('platforms').value : null;
        paper.organizations = this.researchForm.get('organizations').value ? this.researchForm.get('organizations').value : [];
        paper.interests = this.researchForm.get('topics').value ? this.researchForm.get('topics').value : [];
        paper.keywords = this.researchForm.get('keywords').value ? this.researchForm.get('keywords').value : [];
        paper.countries = this.researchForm.get('countries').value ? this.researchForm.get('countries').value : null
        paper.preferredLanguage = this.researchForm.get('languages').value ? this.researchForm.get('languages').value : [];
        paper.webPages = [];
      } else {
        paper.websites = [];
        paper.people = [];
        paper.keywords = [];
        paper.platforms = this.webForm.get('platforms').value ? this.webForm.get('platforms').value : null;
        paper.countries = null;
        paper.organizations = [];
        paper.preferredLanguage = [];
        paper.interests = [];
        paper.type = "Web";
        paper.quote = {};
        paper.posts = [];
        paper.webPages = this.webForm.get('urls').value ? this.webForm.get('urls').value : [];
      }
    }
    this.paperService.getNewsPaperData(paper, false, new Date(), 1, 16).subscribe(res => {
      console.log(res);
      if (paper.type.toLowerCase() === "web") {
        this.savePaper(paper, refresh);
        return;
      }

      paper.posts = (res && res.stories) ? res.stories as Post[] : [];
      this.paperService.getQuoteData({}, false).subscribe(res => {
        console.log("quotes", res);
        if (res.contents && res.contents.quotes && res.contents.quotes.length > 0) {
          paper.quote = {text: res.contents.quotes[0].quote, author: res.contents.quotes[0].author};
        }
        this.savePaper(paper, refresh);
      }, err => {
        this.success = false;
        this.isLoading = false;
        console.error(err);
      });
    }, err => {
      this.success = false;
      this.isLoading = false;
      console.error(err);
    });
  }

  countryChanged() {
    const country = this.billingForm.get('country').value;
    this.isInternational = country.toUpperCase() !== "US";
  }

  doCancel() {

  }

  doClose() {
    if (this.rechargeOrder.isActive) {
      this.getUsersPapers(this.userPointer);
    }
    if (this.rechargeModelRef) this.rechargeModelRef.close();
  }

  createOrRetrieveCustomer(customerId?: string, sourceId?: string): Observable<StripeCustomer> {
    const fullName: string[] = [];
    fullName.push(this.user.firstName);
    fullName.push(this.user.lastName);
    if (!customerId) {
      return this.payoutService.createStripeCustomer({
        source: sourceId,
        email: this.user.email,
        description:
          this.user.fullName ? this.user.fullName : fullName.join(' ') + ' (' + this.user.uid + ')' + ' card info'
      });
    } else {
      return this.payoutService.getStripeCustomer(customerId);
    }
  }

  rechargeSubscription(content){
    const ng = this;
    ng.rechargeModelRef = ng.modalService.open(content, {size: 'lg'});
    ng.orderSucceeded = false;
    ng.orderFailureMessage = undefined;
    ng.createRechargeForm();
    ng.createBillingForm();
    ng.fromIncrement = 0;
    ng.rechargeTotalPrice = 0;
    ng.rechargeTotal = 0;
    ng.remainingDownloads += ng.rechargeTotal;
    ng.remainingDataLoads += ng.rechargeTotal;
    console.log(4,ng.remainingDownloads ,ng.remainingDataLoads,ng.remainingPapers )
    console.log()

    ng.db.collection("paymentMethod").ref
      .where("owner.uid", "==", ng.user.uid)
      .limit(1)
      .get()
      .then(function (querySnapshot) {
        querySnapshot.forEach(function (doc) {
          ng.defaultPaymentMethod = doc.data() as PaymentMethod;
          ng.defaultSource = ng.defaultPaymentMethod.metaData.sources.data
          && ng.defaultPaymentMethod.metaData.sources.data.length > 0 ?
            ng.defaultPaymentMethod.metaData.sources.data[0] : ng.defaultPaymentMethod;
          ng.orderIsLoading = true;

          console.log(ng.defaultSource)

        });
      }).catch(function (error) {
      ng.orderIsLoading = false;
      console.error(error);
    });
    // this.payoutService.getPaymentMethod(this.userPointer,true).subscribe( res =>{
    //   this.defaultPaymentMethod = res.results[0];
    //   this.defaultSource = this.defaultPaymentMethod.metaData.sources.data[0];
    //   this.orderIsLoading = true;
    //   this.stripeService.elements(this.elementsOptions)
    //     .subscribe(elements => {
    //       this.elements = elements;
    //       // Only mount the element the first time
    //       if (!this.card) {
    //         this.card = this.elements.create('card', {
    //           style: {
    //             base: {
    //               iconColor: '#666EE8',
    //               color: '#31325F',
    //               lineHeight: '38px',
    //               fontWeight: 300,
    //               '::placeholder': {
    //                 color: '#CFD7E0'
    //               }
    //             }
    //           }
    //         });
    //         this.card.mount('#card-element');
    //         this.card.addEventListener('change', this.cardHandler);
    //       }
    //       this.orderIsLoading = false;
    //     })
    // }, err => {
    //   this.orderIsLoading = false;
    //   console.error(err);
    // });
  }

  doRecharge(qty?: number) {
    this.orderIsLoading = true;
    let order: StripeOrder = {
      currency: "usd",
      customer: this.user.customerId,
      "metadata[order_id]": this.order.id,
      "items[0][quantity]": qty ? qty : Number(this.rechargeForm.get('quantity').value),
      "items[0][parent]": "sku_GeAZV1gaorBdz4"
    };

    this.payoutService.createStripeOrder(order).subscribe(orderRes => {
      if (!orderRes.error) {
        order.customer = orderRes.customer;
        this.payoutService.createPaymentForStripeOrder(order, orderRes.id).subscribe(res => {
          this.showConfirm = false;
          if (!res.error) {
            this.rechargeOrder = {
              type: 'recharge',
              license: uuid.v4(),
              createdBy: this.userPointer,
              isActive: true,
              data: orderRes,
              dataLoads: qty ? this.rechargeQuantityOffset * qty : this.rechargeQuantityOffset * this.fromIncrement,
              downloads: qty ? this.rechargeQuantityOffset * qty : this.rechargeQuantityOffset * this.fromIncrement,
              autoRecharge: this.doAutoRecharge,
              customerId: orderRes.customer,
              subscription: {
                objectId: this.order.subscription.id,
                className: 'Subscription',
                __type: 'Pointer'
              }
            }

            this.db.collection('order').add(this.rechargeOrder).then(res => {
              this.orderIsLoading = false;
              this.orderSucceeded = true;
              if (this.modalService.hasOpenModals()) {
                this.autoRechargeModelRef.close();
              }
            }, err => {
              this.orderSucceeded = false;
              console.error(err);
            });
            // this.payoutService.storeOrder(this.rechargeOrder).subscribe(res => {
            //   this.orderIsLoading = false;
            //   this.orderSucceeded = true;
            //
            //   if(this.modalService.hasOpenModals()) {
            //     this.autoRechargeModelRef.close();
            //   }
            // }, err => {
            //   console.error(err);
            // })
          } else {
            this.orderFailureMessage = res.error;
            this.orderSucceeded = false;
          }
          this.orderIsLoading = false;
        })
      } else {
        console.error(orderRes.error.message);
        this.orderIsLoading = false;
      }
    })
  }

  saveRechargeCard() {
    const ng = this;
    this.orderIsLoading = true;
    const cardHolder = ng.billingForm.get('cardHolder').value;
    const street1 = ng.billingForm.get('street1').value;
    const street2 = ng.billingForm.get('street2').value;
    const city = ng.billingForm.get('city').value;
    const state = ng.billingForm.get('state').value ? this.billingForm.get('state').value : "";
    const country = ng.billingForm.get('country').value;
    const zip = ng.billingForm.get('zip').value;

    this.stripeService.createToken(ng.card, {
      name: cardHolder,
      address_line1: street1,
      address_line2: street2,
      address_city: city,
      address_state: state,
      address_country: country,
      address_zip: zip
    }).subscribe(token => {
      if (token.error) {
        ng.success = false;
        ng.isLoading = false;
        ng.orderIsLoading = false;
        ng.error = token.error.message;
        ng.replaceCard = true;
        return;
      }
      const localToken = token.token as Token;
      const fullName: string[] = [];
      fullName.push(ng.user.firstName);
      fullName.push(ng.user.lastName);
      sessionStorage.setItem('token', JSON.stringify(localToken));
      if (ng.billingForm.valid) {
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
          this.createOrRetrieveCustomer(customerId, localSource.id).subscribe(res => {
            let customer: StripeCustomer = res as StripeCustomer;
            ng.payoutService.updateStripeCustomer({
              source: source.source.id
            }, customerId).subscribe(cRes => {
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
                  type: 'stripe-recharge-' + token.token.type
              }
              ng.db.collection("paymentMethod").ref
                  .where("owner.uid","==", ng.user.uid).limit(1).get()
                  .then(function(querySnapshot){
                    if(!querySnapshot.empty) {
                      querySnapshot.forEach(function(doc) {
                        doc.ref.update(paymentMethod).then(res => {
                          ng.orderIsLoading = false;
                          ng.defaultSource = source.source;
                        })
                      });
                    }else{
                      ng.db.collection('paymentMethod').add(paymentMethod).then(res => {
                        ng.orderIsLoading = false;
                        ng.defaultSource = source.source;
                      }, err => {
                        console.error("payment-error:",err);
                        ng.orderIsLoading = false;
                      });
                    }
                  });

              ng.orderIsLoading = false;
            }, err => {
              ng.orderIsLoading = false;
            });
          });
        });
      } else {
        ng.validateAllFormFields(this.billingForm);
        ng.isLoading = false;
      }
    }, err => {
      console.error(err);
      ng.orderIsLoading = false;
    });

  }

  imageTOBase64(url, doc) {
    let ng = this;
    imageToBase64(url) // Image URL
      .then(
        response => {
          console.log(response);
          doc.addImage(response, "JPEG", 0, 0, 150, 150);
        }
      )
      .catch(error => {
          console.log(error); // Logs an error if there was one
        }
      );
  }

  generateDownload(paper: any) {
    let ng = this;
    ng.selectedPaper = paper;
    console.log("selectedPaper:", ng.selectedPaper);
    ng.isDownloading = true;
    ng.downloadFailed = undefined;

    let download: Download = {
      createdAt: new Date(),
      subscription: {
        objectId: ng.subscription.id,
        className: 'Subscription',
        __type: 'Pointer'
      },
      order: {
        objectId: ng.order.id,
        className: 'Order',
        __type: 'Pointer'
      },
      paper: {
        objectId: paper.id,
        className: 'Paper',
        __type: 'Pointer'
      },
      createdBy: ng.userPointer
    };

    //add download record
    ng.db.collection('download').add(download).then(res => {

      //set images
      const pendingCallsToLoadImages: any[] = [];
      for (let post of paper.posts.slice(0, 1)) {
        let imageUrl = post.media.length > 0 ? post.media[0].url : "https://www.epaperweekly.net/img/epaperweekly-no-news.png";
        pendingCallsToLoadImages.push(ng.paperService.downloadImageBase64(imageUrl));
      }
      //set QRCodes
      const pendingCallsToLoadQRCodes: any[] = [];
      for (let post of paper.posts) {
        let link = "https://www.epaperweekly.com";
        if (post.links) {
          link = Array.isArray(post.links) && post.links.length > 0 ? post.links[0].permalink : post.links.permalink;
        }
        pendingCallsToLoadQRCodes.push(ng.paperService.downloadQrCode(link, true, false, false));
      }
      //set external source pages
      // const pendingCallsToSourcePages:any[] = [];
      // for(let post of ng.paper.posts.slice(0,1)){
      //   let link = post.links && post.links.length > 0 ? post.links[0].permalink : "https://www.epaperweekly.com";
      //   pendingCallsToSourcePages.push(ng.paperService.getArticleSourceData(link,'json'));
      // }

      const pendingCallsToLoadBrandingImages: any[] = [];
      const logoUrls =
        ["https://www.epaperweekly.net/img/ep-weekly-logo.png",
          "https://www.epaperweekly.net/img/ep-powered.png"];
      for (let logoUrl of logoUrls) {
        pendingCallsToLoadBrandingImages.push(ng.paperService.downloadImageBase64(logoUrl));
      }
      //assemble data
      zip(
        zip(pendingCallsToLoadBrandingImages),
        zip(pendingCallsToLoadQRCodes),
        zip(pendingCallsToLoadImages))
        .pipe(map(([brandImages, qrCodes, postImages]) =>
          ({brandImages, qrCodes, postImages}))
        ).subscribe(map => {
        console.log("high")
        let pdfDoc = new jsPDF({unit: 'px', format: 'a4', orientation: 'p', precision: 0});
        console.log(map.qrCodes);

        let epLogo: string = (map.brandImages as any[])[1];
        let epWeeklyLogo: string = (map.brandImages as any[])[0];
        let featuredQRCode: any = map.qrCodes[0];
        let featuredImage: any = (map.postImages as any[])[0];

        //used to calculate links
        ng.numberRenderedPages = 1;
        //build paper
        pdfDoc = ng.setArticles(paper, pdfDoc);
        pdfDoc = ng.setHeader(epWeeklyLogo, featuredQRCode, featuredImage, paper, pdfDoc);
        pdfDoc = ng.setQRCodes(map.qrCodes.slice(1), pdfDoc);
        pdfDoc = ng.setSourcePages(paper, map.qrCodes, pdfDoc);
        pdfDoc = ng.setInlineLinks(paper, pdfDoc);
        pdfDoc = ng.setFooter(paper, pdfDoc);

        pdfDoc = ng.setBranding(epLogo, pdfDoc);
        let fileName = "epaperweekly-" + ng.now.getTime() + ".pdf";
        ng.loadFeaturedArticleImage(featuredImage, pdfDoc, fileName);

        ng.isAuthorized = true;
        ng.hasLoaded = true;
        ng.updateDownloadCount();
        ng.isDownloading = false;
        ng.selectedPaper = undefined;
        ng.downloadFailed = undefined;
      }, error => {
        ng.downloadFailed = true;
        ng.isDownloading = false;
        console.error(error);
        console.log(error.message)
      });
    }).catch(error => {
      console.error(error);
      ng.success = false;
      ng.isLoading = false;
    });
  }

  getFirstArticleWithMedia(articles: any[]): any {
    let article = {};
    for (let article$ of articles) {
      if (article$.media.length > 0) {
        article = article$;
        break;
      }
    }
    return article;
  }
  fileChange(event) {
    let fileList: FileList = event.target.files;
    if(fileList.length > 0) {
      let file: File = fileList[0];
      let formData: FormData = new FormData();
      formData.append('uploadFile', file, file.name);
      this.paperService.uploadToTablet(formData).subscribe(res =>{
        console.log(res);
      })
    }
  }
  pdfDownload() {
    let ng = this;//use this variable to access your class members inside then().
    ng.captureService.getImage(this.screen.nativeElement, true)
      .pipe(
        tap(img => {
          console.log(img);
        })
      ).subscribe();

  }

  setArticles(paper: any, doc: jsPDF): jsPDF {
    let ng = this;
    let col = 0;
    let row = 0;
    let countPerPage = 0;
    let count = 0;
    let height = 190;
    let width = 135;
    let leftMargin = 0;
    let topMargin = 0;
    let left: number = 0;
    let top: number = 180;
    let pageNum: number = 0;
    let titleHeight: number = 60;
    let imagesToLoad: any[] = [];

    for (let post of paper.posts.slice(1)) {
      left = col * width;
      top = row * height + 10;
      pageNum = doc.getCurrentPageInfo().pageNumber;
      topMargin = pageNum == 1 ? 220 : 10;

      let imageUrl = post.media.length > 0 ? post.media[0].url : "https://www.epaperweekly.net/img/epaperweekly-no-news.png";
      imagesToLoad.push(imageUrl);

      let sanitizedDescription = post.summary && post.summary.sentences.length > 0 && post.summary.sentences[0].trim().length > 0 ?
        post.body : "This article has no content.";
      let sanitizedTitle = post.title && post.title.trim().length > 0 ? post.title : sanitizedDescription;
      let sanitizedAuthor = post.author && post.author.name.trim().length > 0 ? post.author.name : "Anonymous";
      let sanitizedSource = Array.isArray(post.source) && post.source.length > 0 ? post.source.join(',') : post.source.name;

      doc.setFontSize(13).setFont(undefined, 'bold').text(ng.truncateText(7, sanitizedTitle).replace(/[\n\r]+/g, ''), 45 + left, topMargin + top,
        {maxWidth: width - 10, align: 'left', baseline: 'top'});
      ng.postLocations.set(count + "", {x: 45 + left, y: topMargin + top});
      doc.setFontSize(13).setFont(undefined, 'normal').text(ng.truncateText(30, sanitizedDescription).replace(/[^a-zA-Z0-9,;\-.!?$ ]/g, ''), 45 + left, (topMargin + top) + titleHeight,
        {maxWidth: width - 10, align: 'left'});
      doc.setFontSize(10).setFont(undefined, 'normal')
        .setTextColor("#3B3E40")
        .text(ng.truncateText(2, sanitizedAuthor), 165 + left, (topMargin + top) + titleHeight + 108, {
          maxWidth: 80,
          align: 'right',
          baseline: 'middle'
        });
      doc.setTextColor("#000000");
      doc.setFontSize(10).setFont(undefined, 'normal')
        .setTextColor("#3B3E40")
        .text(ng.truncateText(2, sanitizedSource), 165 + left, (topMargin + top) + titleHeight + 118, {
          maxWidth: 80,
          align: 'right',
          baseline: 'middle'
        });
      doc.setTextColor("#000000");
      if (col == 2) {
        row++;
        col = 0;
      } else {
        col++;
      }

      if (countPerPage >= ((pageNum > 1) ? 9 : 5)) {
        //used to determine link to article in pdf
        ng.numberRenderedPages++;
        doc.addPage();
        countPerPage = 0;
        col = 0;
        row = 0;
      } else {
        countPerPage++;
      }
      count++;
    }
    return doc;

  }

  setFooter(paper: any, doc: jsPDF): jsPDF {
    let currentPage = doc.getCurrentPageInfo().pageNumber;
    let docHeight = doc.internal.pageSize.height;
    let docWidth = doc.internal.pageSize.width;
    let leftGutter = 45;
    let ng = this;
    for (let i = 3, n = 1; i <= doc.getNumberOfPages(); i++, n++) {
      doc.setPage(i);
      doc.setFillColor(0, 0, 0);
      doc.rect(leftGutter, docHeight - 28, docWidth - 60, .5, 'F');
      doc.rect(leftGutter, docHeight - 30, docWidth - 60, .5, 'F');
      doc.setFontSize(12).setFont(undefined, 'normal')
        .text(i + "", ((docWidth / 2) + leftGutter / 2) - 20, docHeight - 10, {align: 'center'});
      doc.textWithLink("Front Page", docWidth - doc.getTextWidth("Front Page") - 15, docHeight - 10, {pageNumber: 1});
    }
    return doc;
  }

  setPageContent(index: number, qrCode: string, post: any, doc: jsPDF): jsPDF {
    let ng = this;
    let topMargin = 20;
    let leftGutter = 45;
    let pageWidth = doc.internal.pageSize.width;
    let pageHeight = doc.internal.pageSize.height;
    let firstPageMaxWords = 430;
    let maxWordsPerPage = 480;


    let sanitizedDescription = post.body && post.body.length > 0 && post.body.trim().length > 0 ?
      post.body : "This article has no content.";
    let sanitizedTitle = post.title && post.title.trim().length > 0 ? post.title : sanitizedDescription;
    let sanitizedAuthor = post.author && post.author.name.trim().length > 0 ? post.author.name : "Anonymous";
    let sanitizedSource = Array.isArray(post.source) && post.source.length > 0 ? post.source.join(',') : post.source.name;

    let pageData = ng.setArticlePageContent(index, doc, qrCode, sanitizedTitle,
      sanitizedDescription
        .replace(/(?:https?|ftp):\/\/[\n\S]+/g, '') //remove links
        .replace(/([^.@\s]+)(\.[^.@\s]+)*@([^.@\s]+\.)+([^.@\s]+)/, "") //remove emails
        .replace(/[\n\r]+/g, '').trim() //remove extra newline
      , firstPageMaxWords, post.words_count, maxWordsPerPage);

    ng.pageDataMap.set(post.id, pageData);


    //console.log(index,pageData);
    //doc.setPage(index);
    if (qrCode) {
      doc.addImage(qrCode, "PNG", leftGutter - 2, topMargin - 2, 30, 30);
    }
    doc.setFontSize(14).setFont(undefined, 'bold').text(
      ng.truncateText(30,
        sanitizedTitle.replace(/[\n\r]+/g, '\r').trim()), leftGutter + 40, topMargin,
      {maxWidth: pageWidth - 120, align: 'justify', baseline: 'top'});

    doc.setFillColor(0, 0, 0);
    doc.rect(leftGutter, topMargin + 40, pageWidth - 60, .2, 'F');

    doc.setFontSize(13).setFont(undefined, 'normal').text(
      ng.truncateText(firstPageMaxWords,
        sanitizedDescription
          .replace(/(?:https?|ftp):\/\/[\n\S]+/g, '')
          .replace(/([^.@\s]+)(\.[^.@\s]+)*@([^.@\s]+\.)+([^.@\s]+)/, "")
          .replace(/[\n\r]+/g, '').trim() //remove extra newline
        , true), leftGutter, topMargin + 60,
      {maxWidth: pageWidth - 60, align: 'justify', baseline: 'top', lineHeightFactor: 1.50});

    for (let p of pageData.pages) {
      doc.addPage();
      doc.setFontSize(13).setFont(undefined, 'normal').text(p, leftGutter, topMargin,
        {maxWidth: pageWidth - 60, align: 'justify', baseline: 'top', lineHeightFactor: 1.50});
    }

    return doc;
  }

  setPageImage(index: number, posts: any[], doc: jsPDF): jsPDF {
    doc.setPage(index);
    let post = posts[index];
    return doc;
  }

  setQRCodes(codes: string[], doc: jsPDF): jsPDF {
    let count = 0;
    let normal = 1;
    let col = 0;
    let row = 0;
    let countPerPage = 0;
    let height = 190;
    let width = 135;
    let leftMargin = 0;
    let topMargin = 0;
    let left: number = 0;
    let top: number = 180;
    let pageNum: number = 1;

    for (let base64 of codes) {
      left = col * width;
      top = row * height + 10;
      topMargin = pageNum == 1 ? 220 : 10;

      doc.setPage(pageNum);
      doc.addImage(base64, "PNG", left + 44, top + topMargin + 160, 25, 25);
      doc.setFillColor(0, 0, 0);
      doc.rect(left + 45, top + topMargin + 160 + 25, width - 10, .2, 'F');

      //doc.rect( 500, top + topMargin+160+25, left+44, top + topMargin+160+25);
      if (col == 2) {
        row++;
        col = 0;
      } else {
        col++;
      }

      if (countPerPage == ((pageNum > 1) ? 8 : 5)) {
        pageNum++;
        doc.setPage(pageNum)
        countPerPage = 0;
        col = 0;
        row = 0;
      } else {
        countPerPage++;
      }
      count++;
      normal++;
    }
    return doc;
  }

  setArticlePageContent(currentPage: number,
                        doc: jsPDF,
                        qrCode: string,
                        pageTitle: string,
                        pageText: string,
                        startFrom: number,
                        wordCount: number,
                        maxWordsPerPage: number): Page {
    let pageOffset: number = 2;
    let page: Page = {};
    let numPages = Math.abs(Math.ceil((wordCount - startFrom) / maxWordsPerPage));
    let wordsArray = pageText.split(" ");
    page.startPage = pageOffset + currentPage;
    page.endPage = page.startPage + numPages;
    page.wordCount = wordCount;
    page.pageCount = numPages;
    page.mainPage = doc.getCurrentPageInfo().pageNumber;
    page.maxWordCount = maxWordsPerPage;

    //break words into pages
    let pages: string[] = [];
    for (let w = startFrom; w < wordsArray.length; w += maxWordsPerPage) {
      const chunk: string[] = wordsArray.slice(w, w + maxWordsPerPage);
      pages.push(chunk.join(" "));
    }
    page.tittle = pageTitle;
    page.qrCodeData = qrCode;
    page.pages = pages;

    return page;
  }

  setInlineLinks(paper: any, doc: jsPDF): jsPDF {
    let ng = this;
    let count = 0;
    let offset = 2;
    let col = 0;
    let row = 0;
    let countPerPage = 0;
    let height = 190;
    let width = 135;
    let leftMargin = 0;
    let topMargin = 0;
    let left: number = 0;
    let top: number = 180;
    let pageNum: number = 1;

    for (let post of paper.posts.slice(1)) {
      left = col * width;
      top = row * height + 10;
      topMargin = pageNum == 1 ? 220 : 10;
      doc.setPage(pageNum);

      let pageData = ng.pageDataMap.get(post.id);
      let pg = pageData.mainPage;

      //get first item
      const iterator = ng.pageDataMap.entries();
      const firstIteration = iterator.next();
      const first = firstIteration.value;

      doc.link(left + 45, top + topMargin, width - 10, 185, {pageNumber: pg});

      if (col == 2) {
        row++;
        col = 0;
      } else {
        col++;
      }

      if (countPerPage == ((pageNum > 1) ? 8 : 5)) {
        pageNum++;
        doc.setPage(pageNum)
        countPerPage = 0;
        col = 0;
        row = 0;
      } else {
        countPerPage++;
      }
      count++;
      offset++;
    }
    return doc;
  }

  setBranding(logo: string, doc: jsPDF): jsPDF {
    const docHeight = doc.internal.pageSize.height;
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.addImage(logo, "PNG", 5, docHeight - 40, 30, 30);
      doc.link(5, docHeight - 40, 30, 30, {url: 'https://www.einkpads.com?utm_source=pdf-epaperweekly'});
    }

    return doc;
  }

  setSourcePages(paper: any, qrCodes: string[], doc: jsPDF): jsPDF {
    let ng = this;
    let n = 0;
    for (let post of paper.posts) {
      doc.addPage();
      //console.log(ng.pageCounts.get(post.id),post.words_count);
      let index = doc.getNumberOfPages() - 1;
      doc = ng.setPageContent(index, qrCodes[n], post, doc);
      n++;
    }
    return doc;
  }

  foundFlaggedWords(testString: string, words: string[]): boolean {
    let found = false;

    for (let word of words) {
      //console.log(word.toLowerCase(),testString.toLowerCase());
      found = testString.toLowerCase().indexOf(word.toLowerCase()) !== 1;
      if (found) break;
    }
    return found;
  }

  sanitizeParagraphs(text: string[], flagWord: any[]): string[] {
    let ng = this;
    let flaggedWords: string[] = [];

    for (let flagged of flagWord) {
      flaggedWords.push(flagged.name.trim());
    }
    //console.log(flaggedWords)
    let sanitized: string[] = [];
    for (let paragraph of text) {
      let words = paragraph.trim().split(" ");
      if (words.length > 10 || !ng.foundFlaggedWords(paragraph.trim(), flaggedWords)) {
        console.log(paragraph.trim())
        sanitized.push(paragraph.trim());
      }
    }
    return sanitized;
  }

  setSourceContentInPages(data: any, images: any, doc: jsPDF, paper: any, fileName: string) {
    let ng = this;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageRatio = pageWidth / pageHeight;

    let sources: any[] = paper.posts.map(({source}) => source);
    sources = sources.filter((value, index, self) =>
        index === self.findIndex((t) => (
          t.place === value.place && t.name === value.name
        ))
    );
    //console.dir(sources);

    for (let i = 0, n = 1; i < data.length; i++, n++) {

      let formattedParagraphs = ng.sanitizeParagraphs(data[i].match(/\(?[^\.\?\!]+[\.!\?]\)?/g), sources);
      console.dir(formattedParagraphs);

      let img = new Image(1024);
      //console.log("loaded data:",data[i]);
      img.src = images[i];//"https://api.apiflash.com/v1/urltoimage/cache/o1epmkp97j.png?access_key=be7f8523d83d4d24bfc7b556abeb8c71";//data[i];
      img.onload = function () {
        const imgWidth = img.width;
        const imgHeight = img.height;
        const imgRatio = imgWidth / imgHeight;
        doc.setPage(ng.numberRenderedPages + n);
        const wc = imgWidth / pageWidth;
        if (imgRatio >= pageRatio) {
          doc.addImage(img, 'JPEG', 0, (pageHeight - imgHeight / wc) / 2, pageWidth, imgHeight / wc, null, 'NONE');
        } else {
          const pi = pageRatio / imgRatio;
          doc.addImage(img, 'JPEG', (pageWidth - pageWidth / pi) / 2, 0, pageWidth / pi, (imgHeight / pi) / wc, null, 'NONE');
        }
        console.log(imgWidth, " x ", imgHeight, " pdf: ", doc.internal.pageSize.width, " x ", doc.internal.pageSize.height);
        doc.save(fileName);
      };
    }
  }

  setHeader(logo: string, topCode: string, topImage: string, paper: any, doc: jsPDF): jsPDF {
    const ng = this;
    let docWidth = doc.internal.pageSize.width;
    let width = 135;

    //logo
    let logoWidth = 820 * .20;
    let logoHeight = 132 * .20;
    let leftGutter = 45;

    let featuredPost = paper.posts[0];
    let sanitizedTitle = featuredPost.title
    let sanitizedDescription = featuredPost.summary && featuredPost.summary.sentences.length > 0 ? featuredPost.summary.sentences[0] : "This article has no content."
    let sanitizedAuthor = featuredPost.author && featuredPost.author.name.trim().length > 0 ? featuredPost.author.name : "Anonymous";

    let sourceCountry = featuredPost.source.locations && featuredPost.source.locations.length > 0 ? featuredPost.source.locations[0].country : "US"
    let country: any[] = Countries.filter(function (i) {
      return i.code === sourceCountry;
    });

    let paperDescription = paper.posts.length + " Articles";
    let urlToSite = 'https://www.epaperweekly.com?utm_source=pdf-epaperweekly';
    let paperDate = formatDate((paper.createdAt as number), 'fullDate', 'en-US');
    let sanitizedSource = Array.isArray(featuredPost.source) && featuredPost.source.length > 0 ? featuredPost.source.join(',') : featuredPost.source.name;

    doc.setPage(1);
    doc.addImage(logo, "PNG", ((docWidth + leftGutter) / 2 - logoWidth / 2), 8, logoWidth, logoHeight);
    doc.addImage(topCode, "PNG", 45, 185, 25, 25);

    doc.setFontSize(9).setFont(undefined, 'bold')
      .text(ng.truncateText(5, paperDate), leftGutter, 20,
        {maxWidth: width - 10, align: 'left'});
    doc.setFontSize(9).setFont(undefined, 'normal')
      .text(ng.truncateText(6, "Today's Paper"), leftGutter, 28,
        {maxWidth: width - 10, align: 'left'});

    doc.setFontSize(9).setFont(undefined, 'bold')
      .text(ng.truncateText(6, paperDescription), docWidth - 10, 20,
        {maxWidth: width - 10, align: 'right'});
    doc.setFontSize(9).setFont(undefined, 'normal')
      .text(ng.truncateText(4, country[0].name), docWidth - 10, 28,
        {maxWidth: width - 10, align: 'right'});

    //doc.addImage(topImage, "JPEG", (docWidth / 2) - 42, 50, 906 * 0.28, 555 * 0.28);
    //create link to article
    doc.link(leftGutter, 40, docWidth - 20, 170, {pageNumber: ng.numberRenderedPages + 1});

    //create link to epaperweekly.com
    doc.link(((docWidth + leftGutter) / 2 - logoWidth / 2), 8, logoWidth, logoHeight,
      {url: urlToSite});


    doc.setFillColor(0, 0, 0);
    doc.rect(leftGutter, 40, docWidth - 56, .2, 'F');
    // var height = doc.internal.pageSize.getHeight();
    //pdfDoc.line(45, 45, 570, 45);
    doc.setLineWidth(0.2);
    doc.line(docWidth - 10, 215, leftGutter, 215);

    doc.setLineWidth(0.2);
    doc.line(docWidth - 10, 218, leftGutter, 218);

    doc.setFontSize(13).setFont(undefined, 'bold')
      .text(ng.truncateText(8, sanitizedTitle), 45, 60,
        {maxWidth: width - 10, align: 'left'});
    doc.setFontSize(13).setFont(undefined, 'normal')
      .text(ng.truncateText(28, sanitizedDescription), 45, 90,
        {maxWidth: width - 10, align: 'left'});
    doc.setFontSize(10).setFont(undefined, 'normal')
      .setTextColor("#3B3E40")
      .text(ng.truncateText(25, sanitizedAuthor), 165, 195,
        {maxWidth: 100, align: 'right', baseline: 'middle'})
    doc.setFontSize(9).setFont(undefined, 'normal')
      .text(ng.truncateText(4, sanitizedSource), 165, 208,
        {maxWidth: width - 10, align: 'right'});
    return doc;
  }

  loadFeaturedArticleImage(imageData: string, doc: any, fileName: string) {
    let docWidth = doc.internal.pageSize.width;
    let img = new Image(docWidth / 2);
    img.src = imageData;//"https://api.apiflash.com/v1/urltoimage/cache/o1epmkp97j.png?access_key=be7f8523d83d4d24bfc7b556abeb8c71";//data[i];
    img.onload = function () {
      doc.setPage(1);
      const imgWidth = img.width;
      const imgHeight = img.height;
      const imgRatio = imgWidth / imgHeight;
      const maxWidth = 906 * 0.28;
      const maxHeight = 555 * 0.28;
      const pageRatio = maxWidth / maxHeight;

      const wc = imgWidth / maxWidth;

      if (imgRatio >= maxWidth) {
        doc.addImage(img, 'JPEG', (docWidth / 2) - 42, 50, maxWidth, imgHeight / wc, null, 'NONE');
      } else {
        const pi = pageRatio / imgRatio;
        doc.addImage(img, 'JPEG', (docWidth / 2) - 42, 50, maxWidth, (imgHeight / pi) / wc, null, 'NONE');
      }
      doc.save(fileName);
    };
  }

  truncateText(wordsToCut: number, text: string, hideEllipsis = false) {
    let wordsArray = text.split(" ");
    // This will keep our generated text
    let truncated = "";
    let hasTruncated = false;
    for (let i = 0; i < wordsToCut; i++) {
      let word = (wordsArray[i]) ? wordsArray[i] : "";
      truncated += word + ((i < wordsToCut - 1) ? " " : "");
    }
    return truncated.trim() + (wordsArray.length > wordsToCut && !hideEllipsis ? "..." : "");
  }

  convertBase64ToBlobData(base64Data: string, contentType: string = 'image/png', sliceSize = 512, fileName: string) {
    const byteCharacters = atob(base64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
      let file = new File([byteArray], fileName, {type: contentType});
      return file;
    }
  }

  validateAllFormFields(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control instanceof FormControl) {
        control.markAsTouched({onlySelf: true});
      } else if (control instanceof FormGroup) {
        this.validateAllFormFields(control);
      }
    });
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

  rechargeConfirm() {
    this.showConfirm = true;
  }

  setIncludePhotos(value: boolean) {
    this.includePhotos = value;
  }

  autoRechargePlan(value: boolean) {
    this.doAutoRecharge = value;
  }

  public quantityUpdate(event) {
    this.rechargeForm.get('quantity').patchValue(event.from);
  }

  public quantityChange(event) {
    this.rechargeTotalPrice = event * this.rechargePrice;
    this.rechargeTotal = event * this.rechargeQuantityOffset;
    this.rechargeForm.get('quantity').patchValue(event);
    this.fromIncrement = event;

  }

  public quantityFinish(event) {
    //console.log('durationFinish',event)
  }

  private handleAutoRecharge() {
    const toggleAutoRechargeWarning = localStorage.getItem("toggleAutoRechargeWarning") ?
      Number(localStorage.getItem("toggleAutoRechargeWarning")) : 0;
    if (toggleAutoRechargeWarning > 0 && (this.remainingDataLoads <= 0 || this.remainingDownloads <= 0)) {
      this.showAutoRecharge(this.autoRechargeContent);
    } else if (this.remainingDataLoads <= 0 || this.remainingDownloads <= 0) {
      this.doRecharge(1);
    }
  }

  getInterests(paper: Paper) {
    let interests: any[] = [];
    for (let interest of paper.interests) {
      interests.push(interest['name']);
    }
    return "Topics: " + interests.join(", ");
  }

  getLanguages(paper: Paper) {
    let languages: any[] = [];
    for (let language of paper.preferredLanguage) {
      languages.push(language['code']);
    }
    return "Languages: " + languages.join(", ");
  }

  getNetworks(paper: Paper) {
    let networks: any[] = [];
    for (let language of paper.networks) {
      networks.push(networks['name']);
    }
    return "Networks: " + networks.join(", ");
  }

  getKeywords(paper: Paper) {
    let keywords: any[] = [];
    for (let keyword of paper.keywords) {
      keywords.push(keyword['display']);
    }
    return "Keywords: " + keywords.join(", ");
  }

  getWebsites(paper: Paper) {
    let websites: any[] = [];
    for (let web of paper.websites) {
      websites.push(web['display']);
    }
    return "Websites: " + websites.join(", ");
  }

  getWebPages(paper: Paper) {
    let webPages: any[] = [];
    for (let web of paper.webPages) {
      webPages.push(web['display']);
    }
    return "URL's: " + webPages.join(", ");
  }


  getPeople(paper: Paper) {
    let people: any[] = [];
    for (let p of paper.people) {
      people.push(p['display']);
    }
    return "People: " + people.join(", ");
  }

  getOrganizations(paper: Paper) {
    let orgs: any[] = [];
    for (let o of paper.organizations) {
      orgs.push(o['display']);
    }
    return "Organizations: " + orgs.join(", ");
  }

  goUpgrade() {
    this.router.navigateByUrl('/settings');
  }

  onInputBlurred(event) {

  }

  onInputFocused(event) {

  }

  onSelected(event) {

  }

  onItemRemoved(event) {

  }

  onTextChange(event) {

  }

  onItemAdded(event) {

  }

}
