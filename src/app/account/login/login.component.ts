import {Component, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
import {AbstractControl, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {AccountService} from '../account.service';
import {ActivatedRoute, ActivatedRouteSnapshot, Router} from '@angular/router';
import {User} from '../../shared/user';
import {DataResponse} from '../../shared/data-response';
import {AppStateService} from '../../app-state.service';
import {AuthenticationService} from '../authentication.service';
import {Error} from '../../shared/error';
import {ObjectRef} from '../../shared/object-ref';
import {PayoutService} from "../payout/payout.service";
import {environment} from '../../../environments/environment';
import {AngularFireAuth} from "@angular/fire/compat/auth";
import {getAuth, getIdToken} from "@angular/fire/auth";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  providers: [AccountService]
})
export class LoginComponent implements OnInit, OnDestroy {
  @Output() public notifyHeaderOnLoginPage: EventEmitter<boolean> = new EventEmitter<boolean>();

  public response: DataResponse | Error;
  public user: User;
  public loginForm: FormGroup;
  public loginSuccess: boolean;
  public loginFailureMessage: string;
  public showVerifyMessage: boolean;

  constructor(private accountService: AccountService,
              private router: Router,
              private route: ActivatedRoute,
              public auth: AngularFireAuth,
              private appStateService: AppStateService,
              private authenticationService: AuthenticationService,
              private fb: FormBuilder) {
    let lastActivatedRouteSnapshot: ActivatedRouteSnapshot = this.route.snapshot.pathFromRoot[this.route.snapshot.pathFromRoot.length -1];
    this.authenticationService.user = null;
    this.notifyHeaderOnLoginPage.next(lastActivatedRouteSnapshot.routeConfig.path === 'signin');
    this.appStateService.setIsOnLoginPage(true);

  }

  ngOnInit() {
    this.createLoginForm();
    if(sessionStorage.getItem("X-User-verify-token")){
      this.showVerifyMessage = true;
    }
  }

  ngOnDestroy() {
    this.appStateService.setIsOnLoginPage(false);
  }

  createLoginForm(){
    this.loginForm = this.fb.group({
      username: new FormControl('', Validators.required),
      password: new FormControl('', Validators.required)
    });
  }

  doLogin() {
    const usernameControl: AbstractControl = this.loginForm.get('username');
    const passwordControl: AbstractControl = this.loginForm.get('password');

    if(usernameControl.valid && usernameControl.valid){
      let _this = this;
      _this.auth.signInWithEmailAndPassword(usernameControl.value,passwordControl.value)
        .catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        if (errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found') {
          _this.loginFailureMessage = "Your username or password is incorrect."
        } else {
          _this.loginFailureMessage = errorMessage
        }
        _this.loginSuccess = false;
        console.log(error);
      })
        .then(function(result) {
          if(result && result['user']) {
            console.log(result);

            // getIdToken(result['user'], false)
            //   .then((idToken) => {
            //     // idToken can be passed back to server.
            //     console.log(idToken)
            //
            //     _this.auth.signInWithCustomToken(idToken)
            //       .then((userCredential) => {
            //         // Signed in
            //         const user = userCredential.user;
            //        console.log("signed in: ", user)
            //       })
            //       .catch((error) => {
            //         const errorCode = error.code;
            //         const errorMessage = error.message;
            //         // ...
            //       });
            //
            //   })
            //   .catch((error) => {
            //     // Error occurred.
            //   });


            sessionStorage.setItem('X-User', JSON.stringify(result['user']))
            _this.loginSuccess = true;
            _this.loginFailureMessage = null;
            if (sessionStorage.getItem("X-User-verify-token"))sessionStorage.removeItem("X-User-verify-token");
            _this.router.navigateByUrl('/papers');
          }
        });
      // this.authenticationService.userSignIn(usernameControl.value, passwordControl.value).subscribe(
      //   (res: User | ObjectRef | DataResponse | Error) => {
      //     console.log(res, this.authenticationService.user);
      //     if(res['error']){
      //       this.loginFailureMessage = (res as Error).error;
      //       this.loginSuccess = false;
      //     } else {
      //       this.showVerifyMessage = false;
      //       sessionStorage.removeItem("X-User-verify-token");
      //       this.loginSuccess = true;
      //       this.loginFailureMessage = null;
      //       this.router.navigateByUrl('/papers');
      //     }
      //   }, err => {
      //     console.log(err);
      //   }
      // )

    }

  }
}
