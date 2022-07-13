import {Component, Inject, OnInit} from '@angular/core';
import {FormBuilder} from "@angular/forms";
import {STRIPE_PUB_KEY} from "../../shared/global";
import {AuthenticationService} from "../authentication.service";
import {Router} from "@angular/router";
import {PayoutService} from "../payout/payout.service";
import {StripeService} from "ngx-stripe";
import {User} from "../../shared/user";
import {getAuth, sendEmailVerification} from "@angular/fire/auth";

@Component({
  selector: 'app-signup-confirm',
  templateUrl: './signup-confirm.component.html',
  styleUrls: ['./signup-confirm.component.scss'],
  providers:[PayoutService, AuthenticationService]
})
export class SignupConfirmComponent implements OnInit {
  public user: User;
  public hasSubmitted;
  public isResending;
  constructor(private fb: FormBuilder,
              @Inject(STRIPE_PUB_KEY)  key: string,
              private authenticationService: AuthenticationService,
              private router: Router,
              private paymentService: PayoutService,
              private stripeService: StripeService) {
  }

  ngOnInit() {
    this.user = this.authenticationService.getAuthenticatedUser();
    sessionStorage.removeItem("coupon");
    if(!sessionStorage.getItem("token")) {
      sessionStorage.setItem("token",this.user.stsTokenManager.accessToken);
      const auth = getAuth();
      sendEmailVerification(auth.currentUser)
        .then(() => {
          // Email verification sent!

          // ...
        }, err => {
          console.error(err)
        });
    }
  }
  goSignIn(){
    this.router.navigateByUrl('/papers');
  }
  verify() {
    this.isResending = true;
    const auth = getAuth();
    sendEmailVerification(auth.currentUser)
      .then(() => {
        this.isResending = false;
        this.hasSubmitted = true;
      }, err => {
        this.isResending = false;
        this.hasSubmitted = true;
        console.error(err)
      });
  }
}
