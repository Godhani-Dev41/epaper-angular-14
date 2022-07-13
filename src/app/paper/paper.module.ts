import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaperComponent } from './paper.component';
import {RouterModule, Routes} from "@angular/router";
import {NgxMasonryModule} from "ngx-masonry";
import {AuthenticationService} from "../account/authentication.service";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import {NgxCaptureModule} from "ngx-capture";
import {ClipboardModule} from "ngx-clipboard";
import { QRCodeModule } from 'angularx-qrcode';

export const PAPER_ROUTES: Routes = [
  { path: 'paper/:license/:pid', component: PaperComponent},
  { path: 'paper/:license/:pid/:token', component: PaperComponent}
];

@NgModule({
  declarations: [PaperComponent],
  providers: [
    AuthenticationService,
    AngularFireAuth],
  imports: [
    CommonModule,
    NgxMasonryModule,
    NgxCaptureModule,
    QRCodeModule,
    RouterModule.forChild(PAPER_ROUTES)
  ]
})
export class PaperModule { }
