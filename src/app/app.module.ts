import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import {environment} from '../environments/environment';
import {
  PAYPAL_API,
  PAYPAL_TOKEN_API,
  PS_ROOT,
  QUOTES_API,
  STRIPE_API,
  STRIPE_PUB_KEY,
  DEFAULT_TIMEOUT,
  NEWS_API,
  WEBHOSE_API
} from './shared/global';
import {AccountModule} from './account/account.module';
import {RouterModule, Routes} from '@angular/router';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import { HeaderComponent } from './header.component';
import { FooterComponent } from './footer.component';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {AppStateService} from './app-state.service';
import { provideFirebaseApp, getApp, initializeApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { StripeModule } from "stripe-angular";
import {PaperModule} from "./paper/paper.module";
import { SubscriptionComponent } from './subscription/subscription.component';
import {ProfileModule} from "./profile/profile.module";
import { HomeComponent } from './home/home.component';
import { CareerComponent } from './career.component';
import { AboutComponent } from './about.component';
import { TermsComponent } from './terms.component';
import {getAuth, provideAuth} from "@angular/fire/auth";
import {AngularFireModule} from "@angular/fire/compat";
import { NgxCaptureModule } from 'ngx-capture';
import {CacheInterceptor} from "./shared/cacheInterceptor";

export const MAIN_ROUTES: Routes  = [
  { path: '', component: HomeComponent},
  { path: 'plans', component: SubscriptionComponent},
  { path: 'careers', component: CareerComponent},
  { path: 'about', component: AboutComponent},
  { path: 'terms', component: TermsComponent},
  { path: 'plan/:id', component: SubscriptionComponent},
];

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    SubscriptionComponent,
    HomeComponent,
    CareerComponent,
    AboutComponent,
    TermsComponent
  ],
  imports: [
    BrowserModule,
    AccountModule,
    ProfileModule,
    PaperModule,
    NgxCaptureModule,
    HttpClientModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    StripeModule.forRoot(environment.stripePubKey),
    NgbModule,
    RouterModule.forRoot(MAIN_ROUTES),

    AngularFireModule.initializeApp(environment.firebase)
  ],
  providers: [
    {provide: PAYPAL_TOKEN_API, useValue: environment.payPalTokenApiUrl},
    {provide: PAYPAL_API, useValue: environment.payPalApiUrl},
    {provide: STRIPE_API, useValue: environment.stripeApiUrl},
    {provide: NEWS_API, useValue: environment.newsAylienApiUrl},
    {provide: WEBHOSE_API, useValue: environment.webHoseApiUrl},
    {provide: QUOTES_API, useValue: environment.quotesApiUrl},
    {provide: PS_ROOT, useValue: environment.apiUrl}, AppStateService,
    {provide: STRIPE_PUB_KEY, useValue: environment.stripePubKey},
    { provide: DEFAULT_TIMEOUT, useValue: environment.DEFAULT_TIMEOUT }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
