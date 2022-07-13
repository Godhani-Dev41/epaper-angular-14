import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {Subscription} from "rxjs";
import {AuthenticationService} from "../authentication.service";
import {User} from "../../shared/user";
import {getAuth, updateProfile} from "@angular/fire/auth";

@Component({
  selector: 'app-verify',
  templateUrl: './verify.component.html',
  styleUrls: ['./verify.component.scss']
})
export class VerifyComponent implements OnInit {
  private routeSub: Subscription;
  constructor(private route: ActivatedRoute,
              private router: Router,
              private authenticationService: AuthenticationService) {

  }

  ngOnInit() {
    //remove verify check from session
    //sessionStorage.removeItem("X-User")
    this.routeSub = this.route.params.subscribe(params => {
      const token: string = params['token'] as string;
      let verifyToken: string = localStorage.getItem("verify")
      console.log(token);
      console.log(verifyToken)
      if(token == verifyToken){
        localStorage.removeItem("verify");
        sessionStorage.setItem("X-User-verify-token",token);
        this.router.navigateByUrl('/signin');
      }else{

      }
      this.authenticationService.getUserByAuthToken(token).subscribe(res => {
        let user: User = res['results'][0] as User;
        if(user || res['results'].length  > 0) {
          if(!user.emailVerified) {
            this.authenticationService.setEmailVerified(true,user.objectId).subscribe( res => {
              sessionStorage.setItem("X-User-verify-token",token);
              user = res as User;
              this.authenticationService.saveUser(user);
              sessionStorage.removeItem("verifySent");
              this.router.navigateByUrl('/signin');
            }, err => {
              console.log(err);
            });
          } else {
            sessionStorage.removeItem("X-User-verify-token");
            this.router.navigateByUrl('/signin');
          }

        }else{
          this.router.navigateByUrl('/signin');
        }

      }, err => {
        console.log(err);
      });
    });
  }

}
