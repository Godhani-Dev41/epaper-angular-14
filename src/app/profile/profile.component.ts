import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  NgModel,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import {User} from '../shared/user';
import {Pointer} from '../shared/pointer';
import {AuthenticationService} from '../account/authentication.service';
import {AccountService} from '../account/account.service';
import {ObjectRef} from '../shared/object-ref';
import {DataResponse} from '../shared/data-response';
import {Router} from '@angular/router';
import {PayoutService} from "../account/payout/payout.service";
import {getAuth, updateProfile} from "@angular/fire/auth";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  providers: [AccountService,PayoutService]
})
export class ProfileComponent implements OnInit {
  public profileForm: FormGroup;
  private userPointer: Pointer;
  public user: User;
  public shouldEditEmail: boolean;
  public submitted: boolean;
  private selectedFile: File;

  constructor(private sfb: FormBuilder,
              private ofb: FormBuilder,
              private router: Router,
              private authenticationService: AuthenticationService,
              private paymentService: PayoutService,
              private accountService: AccountService) { }

  ngOnInit() {
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

      this.createProfileForm(this.user);
    }, err => {
      console.log(err);
    });
  }
  createProfileForm(withUser: User) {
    if(withUser) {
      this.profileForm = this.sfb.group({
        firstName: new FormControl(withUser.displayName.split(" ")[0], Validators.required),
        lastName: new FormControl(withUser.displayName.split(" ")[1], Validators.required)
      });
    }else {
      this.profileForm = this.sfb.group({
        firstName: new FormControl('', Validators.required),
        lastName: new FormControl('', Validators.required)
      });
    }
  }

  onFileChanged(event) {
    this.selectedFile = event.target.files[0];
    console.log(this.selectedFile)
    const uploadData = new FormData();
    uploadData.append('myFile', this.selectedFile, this.selectedFile.name);
    this.accountService.uploadPhoto(this.user,this.selectedFile,uploadData).subscribe( res => {
      console.log(res);
    }, err => {
     console.error(err);
    })
  }

  saveUserProfile() {
    if (this.profileForm.valid) {
      let localUser: User = {
        firstName: this.profileForm.get("firstName").value,
        lastName: this.profileForm.get("lastName").value
      };
      let auth = getAuth();
      let nameArray = [localUser.firstName, localUser.lastName];
      nameArray = nameArray.filter(Boolean);
      updateProfile(auth.currentUser, {displayName:nameArray.join(" ")}).then( ()=>{
        this.submitted = true;
        this.authenticationService.saveUser(auth.currentUser);
      },err =>{
        console.error(err);
      });
    }else{
      this.submitted = false;
    }
  }

  doChangeEmail() {
    this.router.navigateByUrl('/account');
  }
}
