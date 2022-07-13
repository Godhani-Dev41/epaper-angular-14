import {Inject, Injectable, InjectionToken} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams, HttpResponse} from "@angular/common/http";
import {PS_ROOT, QUOTES_API, WEBHOSE_API, NEWS_API, DEFAULT_TIMEOUT} from "../shared/global";
import {ObjectRef} from "../shared/object-ref";
import {count, Observable} from "rxjs";
import { of } from 'rxjs';
import {Order} from "../shared/order";
import {DataResponse} from "../shared/data-response";
import {Error} from "../shared/error";
import {map} from "rxjs/operators";
import {User} from "../shared/user";
import {Paper} from "../shared/paper";
import {Pointer} from "../shared/pointer";
import {Download} from "../shared/download";
import {DataLoad} from "../shared/data-load";

@Injectable({
  providedIn: 'root'
})
export class PaperService {
  private readonly apiUrl: string;
  private readonly webHoseApiUrl: string;
  private readonly newsApiUrl: string;
  private readonly quoteApiUrl: string;
  constructor(private http: HttpClient,
              @Inject(PS_ROOT) apiRoot: string,
              @Inject(WEBHOSE_API) webHoseApiRoot: string,
              @Inject(NEWS_API) newsApiRoot: string,
              @Inject(DEFAULT_TIMEOUT) timeout: number,
              @Inject(QUOTES_API) quoteApiRoot: string) {
    this.apiUrl = apiRoot;
    this.webHoseApiUrl = webHoseApiRoot;
    this.newsApiUrl = newsApiRoot;
    this.quoteApiUrl = quoteApiRoot;
  }

  getOrdersByLicense(license: string): Observable<Order | ObjectRef | DataResponse | Error> {
    let params: HttpParams = new HttpParams();
    params = params.set('searchQuery',
      JSON.stringify( {license:  license}));
    params = params.set('urlSlug', '/classes/Order/');
    params = params.set('parameters', '?include=paper,&order=updatedAt');
    const options = { withCredentials: true, params:params};
    return this.http.get<DataResponse | Error>(this.apiUrl, options).pipe(
      map((response: DataResponse) => {
        return response;
      })
    );
  }

  getOrdersByOwner(owner: Pointer, type?:string): Observable<Order | ObjectRef | DataResponse | Error> {
    let params: HttpParams = new HttpParams();
    let queryObject: any = {createdBy:  owner};
    if(type){
      queryObject.type = type;
    }
    params = params.set('searchQuery',
      JSON.stringify( queryObject));
    params = params.set('urlSlug', '/classes/Order');
    params = params.set('parameters', '?include=subscription,&order=updatedAt');
    const options = { withCredentials: true, params:params};
    return this.http.get<DataResponse | Error>(this.apiUrl, options).pipe(
      map((response: DataResponse) => {
        return response;
      })
    );
  }

  getDownloadCount(subscription?: Pointer, user?: Pointer) : Observable<any>{
    let data: any = {};
    let params: HttpParams = new HttpParams();
    if(subscription){
      data.subscription = subscription;
    }
    if(user){
      data.createdBy = user;
    }
    params = params.set('searchQuery', JSON.stringify(data));
    params = params.set('urlSlug', '/classes/Download');
    params = params.set('parameters', '?count=1');

    const options = { withCredentials: true, params:params};
    return this.http.get<DataResponse | Error>(this.apiUrl, options).pipe(
      map((response: DataResponse) => {
        return response;
      })
    );
  }

  getPapersCount(user: Pointer) : Observable<any>{
    let data: any = {};
    let params: HttpParams = new HttpParams();
    data.createdBy = user;
    params = params.set('searchQuery', JSON.stringify(data));
    params = params.set('urlSlug', '/classes/Paper');
    params = params.set('parameters', '?count=1');
    const options = { withCredentials: true, params:params};
    return this.http.get<DataResponse | Error>(this.apiUrl, options).pipe(
      map((response: DataResponse) => {
        return response;
      })
    );
  }

  public performBatch(withRequests: any[]) {
    let headers: HttpHeaders = new HttpHeaders();
    headers.append('Content-Type', 'application/x-www-form-urlencoded');
    let params: HttpParams = new HttpParams();
    params = params.set('urlSlug', '/batch');
    params = params.set('data', JSON.stringify(withRequests));
    const options = { headers: headers};
    return this.http.post<any>(this.apiUrl, params, options);
  }

  getDataLoadCount(subscription?: Pointer, user?: Pointer) : Observable<any>{
    let data:any = {};
    let params: HttpParams = new HttpParams();
    if(subscription){
      data.subscription = subscription;
    }
    if(user){
      data.createdBy = user;
    }
    params = params.set('searchQuery', JSON.stringify(data));
    params = params.set('urlSlug', '/classes/DataLoad');
    params = params.set('parameters', '?count=1');
    const options = { withCredentials: true, params:params};
    return this.http.get<DataResponse | Error>(this.apiUrl, options).pipe(
      map((response: DataResponse) => {
        return response;
      })
    );
  }

  savePaper(withPaper: Paper): Observable<any> {
    let headers: HttpHeaders = new HttpHeaders();
    headers.append('Content-Type', 'application/x-www-form-urlencoded');
    let params: HttpParams = new HttpParams();
    params = params.set('urlSlug', '/classes/Paper/' );
    params = params.set('data',JSON.stringify(withPaper));
    const options = { headers: headers};
    return this.http.post<any>(this.apiUrl, params, options).pipe(
      map((response: any) => {
          return response;
        }
      ));
  }

  public updatePaper(withPaper: Paper): Observable<any> {
    let headers: HttpHeaders = new HttpHeaders();
    headers = headers.append('Content-Type', 'application/json');
    if(withPaper.updatedAt)delete(withPaper.updatedAt);
    if(withPaper.createdAt)delete(withPaper.createdAt);
    let data: any = {
      urlSlug: '/classes/Paper/' + withPaper.objectId,
      data: withPaper
    }
    const options = { headers: headers};
    return this.http.put<any>(this.apiUrl, JSON.stringify(data), options);
  }

  downloadPaper(url: string, user: User): Observable<any>{
    let headers: HttpHeaders = new HttpHeaders();
    headers = headers.append('timeout',""+DEFAULT_TIMEOUT);
    let params: HttpParams = new HttpParams();
    params = params.set('url',url);
    params = params.set('token',user.stsTokenManager.accessToken);

    return this.http.get('https://www.epaperweekly.net/paper-fb.php',
      { headers:headers,params:params,responseType: 'blob' });
  }

  downloadImageBase64(url: string): Observable<any>{
    let params: HttpParams = new HttpParams();
    params = params.set('url',url);
    return this.http.get('https://www.epaperweekly.net/imageToBase64.php',
      { params:params,responseType: 'text' });
  }

  getArticleSourceData(url: string, responseType:any): Observable<any>{
    let params: HttpParams = new HttpParams();
    params = params.set('url',url);
    params = params.set('type',responseType);
    return this.http.get('https://www.epaperweekly.net/post-page.php',
      { params:params,responseType: responseType });
  }


  getArticleSourceTextData(url:string): Observable<any>{
    return this.http.get(url,
      {responseType: 'text' });
  }

  downloadQrCode(url: string, invert:boolean, logo:boolean,label:boolean): Observable<any>{
    let params: HttpParams = new HttpParams();
    params = params.set('url',url);
    if(invert)params = params.set('invert', invert);
    if(logo) params = params.set('logo',logo);
    if(label) params = params.set('label',label);
    return this.http.get('https://www.epaperweekly.net/qrcode.php',
      { params:params,responseType: 'text' });
  }


  addDownload(download: Download){
    let headers: HttpHeaders = new HttpHeaders();
    headers.append('Content-Type', 'application/x-www-form-urlencoded');
    let params: HttpParams = new HttpParams();
    params = params.set('urlSlug', '/classes/Download/');
    params = params.set('data', JSON.stringify(download));
    const options = { headers: headers};
    return this.http.post<any>(this.apiUrl, params, options);
  }

  addDataLoad(dataLoad: DataLoad){
    let headers: HttpHeaders = new HttpHeaders();
    headers.append('Content-Type', 'application/x-www-form-urlencoded');
    let params: HttpParams = new HttpParams();
    params = params.set('urlSlug', '/classes/DataLoad/');
    params = params.set('data', JSON.stringify(dataLoad));
    const options = { headers: headers};
    return this.http.post<any>(this.apiUrl, params, options);
  }

  gePaperData(paper:Paper, isTest:boolean, fromDate: Date, size: number) : Observable<any> {
    if(paper.type.toLowerCase() === "web") {
      return of<any[]>([]);
    }

    let params: HttpParams = new HttpParams();

    let categories: string[] = [];
    let languages: string[] = [];
    let networks: string[] = [];
    let keywords: string[] = [];
    let websites: string[] = [];
    let people: string[] = [];
    let organizations: string[] = [];

    let networksString: string;
    let websitesString: string;
    let categoryString: string;

    for (let cat of paper.interests) {
      categories.push("site_category:"+cat.code);
    }
    for (let cat of paper.preferredLanguage) {
      languages.push("language:"+cat.name);
    }
    for (let keys of paper.keywords) {
      keywords.push(keys.display);
    }
    if(paper.type.toLowerCase() === "research") {
      for (let web of paper.websites) {
        websites.push(web.display);
      }
      for (let person of paper.people) {
        people.push("\""+person.display+"\"");
      }
      for (let org of paper.organizations) {
        organizations.push("\""+org.display+"\"");
      }
    } else if (paper.type.toLowerCase() === "news") {
      for (let net of paper.networks) {
        networks.push("site:"+net.code);
      }
    }

    networksString = networks.length > 0 ? " (" +networks.join(" OR ")+") " :"";
    websitesString = websites.length > 0 ? " (" +websites.join(" OR ")+") " :"";
    categoryString = categories.length > 0 ?  " ("+categories.join(" OR ")+") " : "";

    params = params.set('ts',''+fromDate.getTime());
    params = params.set('size',''+size);
    params = params.set('parameters', categoryString+languages.join(" OR ")
      + ((keywords.length > 1) ? ' text:('+keywords.join(" OR ")+')' : ((keywords.length == 1) ?' text:'+keywords.join("") : ""))
      + ((people.length > 1) ? ' person:('+people.join(" OR ")+')' : ((people.length == 1) ?' person:'+people.join("") : ""))
      + ((organizations.length > 1) ? ' organization:('+organizations.join(" OR ")+')' : ((organizations.length == 1) ?' organization:'+organizations.join("") : ""))
      + ((paper.type.toLowerCase() === "news") ? networksString : websitesString)
      + ((paper.countries) ? " thread.country:"+paper.countries["code"]+" " : "")
      + " has_video:false domain_rank:<1000 "
      +(paper.type.toLowerCase() === "news" ? "site_type:news" : "(site_type:news OR site_type:blogs OR site_type:discussions)")
    );

    console.log(paper,params)

    const options = { withCredentials: false, params:params};
    return this.http.get<any>(isTest ? "http://localhost:4200/assets/data/news.json" : this.webHoseApiUrl, options).pipe(
      map((response: any) => {
        return response;
      })
    );
  }

  getPaperData(paper:Paper, isTest:boolean, fromDate: Date, size: number) : Observable<any> {
    if(paper.type.toLowerCase() === "web") {
      return of<any[]>([]);
    }

    let params: HttpParams = new HttpParams();

    let categories: string[] = [];
    let languages: string[] = [];
    let networks: string[] = [];
    let keywords: string[] = [];
    let websites: string[] = [];
    let people: string[] = [];
    let organizations: string[] = [];

    let networksString: string;
    let websitesString: string;
    let categoryString: string;

    for (let cat of paper.interests) {
      categories.push("site_category:"+cat.code);
    }
    for (let cat of paper.preferredLanguage) {
      languages.push("language:"+cat.name);
    }
    for (let keys of paper.keywords) {
      keywords.push(keys.display);
    }
    if(paper.type.toLowerCase() === "research") {
      for (let web of paper.websites) {
        websites.push(web.display);
      }
      for (let person of paper.people) {
        people.push("\""+person.display+"\"");
      }
      for (let org of paper.organizations) {
        organizations.push("\""+org.display+"\"");
      }
    } else if (paper.type.toLowerCase() === "news") {
      for (let net of paper.networks) {
        networks.push("site:"+net.code);
      }
    }

    networksString = networks.length > 0 ? " (" +networks.join(" OR ")+") " :"";
    websitesString = websites.length > 0 ? " (" +websites.join(" OR ")+") " :"";
    categoryString = categories.length > 0 ?  " ("+categories.join(" OR ")+") " : "";

    params = params.set('ts',''+fromDate.getTime());
    params = params.set('size',''+size);
    params = params.set('parameters', categoryString+languages.join(" OR ")
      + ((keywords.length > 1) ? ' text:('+keywords.join(" OR ")+')' : ((keywords.length == 1) ?' text:'+keywords.join("") : ""))
      + ((people.length > 1) ? ' person:('+people.join(" OR ")+')' : ((people.length == 1) ?' person:'+people.join("") : ""))
      + ((organizations.length > 1) ? ' organization:('+organizations.join(" OR ")+')' : ((organizations.length == 1) ?' organization:'+organizations.join("") : ""))
      + ((paper.type.toLowerCase() === "news") ? networksString : websitesString)
      + ((paper.countries) ? " thread.country:"+paper.countries["code"]+" " : "")
      + " has_video:false domain_rank:<1000 "
      +(paper.type.toLowerCase() === "news" ? "site_type:news" : "(site_type:news OR site_type:blogs OR site_type:discussions)")
    );

    console.log(paper,params)

    const options = { withCredentials: false, params:params};
    return this.http.get<any>(isTest ? "http://localhost:4200/assets/data/news.json" : this.webHoseApiUrl, options).pipe(
      map((response: any) => {
        return response;
      })
    );
  }

  getNewsPaperData(paper:Paper, isTest:boolean, fromDate: Date, page: number,pageSize:number) : Observable<any> {
    if(paper.type.toLowerCase() === "web") {
      return of<any[]>([]);
    }
  console.log("here")
    let params: HttpParams = new HttpParams();
    let languages: any[] = [];
    let networks: any[] = [];
    let keywords: any[] = [];
    let sources: any[] = [];
    let countries: any[] = [];

    for (let cat of paper.preferredLanguage) {
      languages.push(cat.code);
    }
    for (let keys of paper.keywords) {
      keywords.push(keys.display);
    }
    if (paper.type.toLowerCase() === "news") {
      for (let net of paper.networks) {
        networks.push(net.code);
      }
      for (let net of paper.networks) {
        sources.push(net.name);
      }
      for(let c of Array.isArray(paper.countries) ? paper.countries : [paper.countries]) {
        countries.push(c.code.toLowerCase());
      }
    }
    console.log("done")
    params = params.set('ts',''+fromDate.getTime());
    params = params.set('cursor',page);
    params = params.set('pageSize',pageSize);
    params = params.set('language',languages.length > 0 ? languages.join(',') :languages[0]);
    params = params.set('sortBy','popularity');
    params = params.set('keywords',
      ((keywords && keywords.length > 1) ? ' ('+keywords.join(" OR ")+')' : ((keywords && keywords.length == 1) ?' '+keywords.join("") : "")));

    console.log((sources && sources.length > 0 ? sources.join(","): "us"));
    params = params.set('sources',(sources && sources.length > 0 ? sources.join(","): ""));
    params = params.set('domains',networks && networks.length > 0 ?  networks.join(",") :"");

    console.log(paper,params)

    const options = { withCredentials: false, params:params};
    return this.http.get<any>(isTest ? "http://localhost:4200/assets/data/news.json" : this.newsApiUrl, options).pipe(
      map((response: any) => {
        return response;
      })
    );
  }

  getQuoteData(paramData:any, isTest:boolean) : Observable<any>{
    let params: HttpParams = new HttpParams();
    params = params.set('parameters', 'category=inspire');
    const options = { withCredentials: false, params:params};
    return this.http.get<any>(isTest ? "http://localhost:4200/assets/data/news.json" : this.quoteApiUrl, options).pipe(
      map((response: any) => {
        return response;
      })
    );
  }

  public removePaper(paper: Paper) {
    let headers: HttpHeaders = new HttpHeaders();
    headers = headers.append('Content-Type', 'application/json');
    let params: HttpParams = new HttpParams();
    params = params.set('urlSlug','/classes/Paper/Delete/' + paper.objectId);
    const options = { headers: headers, params: params};
    return this.http.get<any>(this.apiUrl, options);
  }

  uploadToTablet(formData:any): Observable<any>  {
    const url = 'http://10.11.99.1/upload';
    let headers: HttpHeaders = new HttpHeaders();
    /** In Angular 5, including the header Content-Type can invalidate your request */
    headers.append('Content-Type', 'multipart/form-data');
    headers.append('Accept', 'application/json');
    return this.http.post(url, formData, { headers: headers }).pipe(
    //return this.http.get<DataResponse | Error>(url, {}).pipe(
      map((response: DataResponse) => {
        return response;
      })
    );
  }

  getPaper(id: string): Observable<any> {
    let params: HttpParams = new HttpParams();
    params = params.set('searchQuery',
      JSON.stringify( {objectId:  id}));
    params = params.set('urlSlug', '/classes/Paper');
    params = params.set('parameters', '?order=updatedAt');
    const options = { withCredentials: true, params:params};
    return this.http.get<DataResponse | Error>(this.apiUrl, options).pipe(
      map((response: DataResponse) => {
        return response;
      })
    );
  }

  getPapers(withUser: ObjectRef | User): Observable<Order | ObjectRef | DataResponse | Error> {
    const userPointer = {
      objectId: withUser.objectId,
      className: '_User',
      __type: 'Pointer'
    }
    let params: HttpParams = new HttpParams();
    params = params.set('searchQuery',
      JSON.stringify( {createdBy:  userPointer}));
    params = params.set('urlSlug', '/classes/Paper');
    params = params.set('parameters', '?order=updatedAt');
    const options = { withCredentials: true, params:params};
    return this.http.get<DataResponse | Error>(this.apiUrl, options).pipe(
      map((response: DataResponse) => {
        return response;
      })
    );
  }
}
