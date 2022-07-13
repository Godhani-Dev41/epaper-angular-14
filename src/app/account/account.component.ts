import { Component, OnInit } from '@angular/core';
import {AbstractControl, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {User} from '../shared/user';
import {ObjectRef} from '../shared/object-ref';
import {DataResponse} from '../shared/data-response';
import {AccountService} from './account.service';
import {AuthenticationService} from './authentication.service';
import {Pointer} from '../shared/pointer';
import * as uuid from 'uuid';
import {Router} from '@angular/router';
import {
  getAuth,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateEmail,
  updatePassword
} from "@angular/fire/auth";

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
  providers: [AccountService]
})
export class AccountComponent implements OnInit {
  public accountForm: FormGroup;
  private userPointer: Pointer;
  public hasSubmitted: boolean;

  public user: User;
  constructor(private fb: FormBuilder,
              private router: Router,
              private authenticationService: AuthenticationService,
              private accountService: AccountService) { }

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
      this.createAccountForm(this.user);
    }, err => {
      console.log(err);
    });

  }

  createAccountForm(withUser: User) {
    if(withUser) {
      this.accountForm = this.fb.group({
        username: new FormControl(withUser.email,  Validators.email),
        password: new FormControl('', [Validators.required, Validators.minLength(8)]),
        verifyPassword: new FormControl('', [Validators.compose(
          [Validators.required, this.validateAreEqual.bind(this)]
        )])
      });
    }else {
      this.accountForm = this.fb.group({
        username: new FormControl('',  Validators.email),
        password: new FormControl('', [Validators.required, Validators.minLength(8)]),
        verifyPassword: new FormControl('', [Validators.compose(
          [Validators.required, this.validateAreEqual.bind(this)]
        )])
      });
    }

  }

  private validateAreEqual(fieldControl: FormControl) {
    if(!this.accountForm){return}
    return fieldControl.value === this.accountForm.get("password").value ? null : {
      NotEqual: true
    };
  }

  saveAccount() {
    let ng = this;
    const authToken:string = uuid.v4();

    if(this.accountForm.valid) {
      let localUser: User = {
        username: this.accountForm.get("username").value as string,
        password: this.accountForm.get("password").value as string,
        emailVerified: false,
        authToken: authToken
      }
      const auth = getAuth();
        signInWithEmailAndPassword(auth,auth.currentUser.email,localUser.password)
        .then(function(userCredential) {
          updateEmail(auth.currentUser, localUser.username)
            .then(() => {
              updatePassword(userCredential.user,localUser.password).then(() => {
                sendEmailVerification(auth.currentUser).then(()=>{

                });
                ng.authenticationService.saveUser(userCredential.user);
                ng.hasSubmitted = true;
              },err=>{
                console.error(err)
              })
            }, err => {
              console.error(err)
            });
        },err=>{
          console.error(err);
        })



      // this.accountService.updateUser(localUser, this.user.objectId).subscribe(res => {
      //
      //   let userRef: ObjectRef = {
      //     objectId: this.user.objectId,
      //     sessionToken: this.user.sessionToken
      //   }
      //   this.authenticationService.getUser(userRef, false).subscribe(res => {
      //     this.user = (res as DataResponse).results[0];
      //     this.accountService.accountUpdateVerify(this.user, authToken).subscribe(res => {
      //       console.log(res);
      //       this.hasSubmitted = true;
      //     }, err => {
      //       console.error(err);
      //     })
      //   }, err => {
      //     console.log(err)
      //   });
      // }, err => {
      //   console.log(err)
      // });
    }else{
      console.log("form not valid")
    }
  }
}
