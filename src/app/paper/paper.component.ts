import {Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {NgxMasonryOptions} from "ngx-masonry";
import {PaperService} from "./paper.service";
import {AuthenticationService} from "../account/authentication.service";
import {User} from "../shared/user";
import {ActivatedRoute, Router} from "@angular/router";
import {
  Subscription,
  tap,
  zip,
  map,
  of,
  forkJoin,
  from,
  concatMap,
  concat,
  toArray,
  Observable,
  delay,
  mergeMap, scan
} from "rxjs";
import {Paper} from "../shared/paper";
import {Order} from "../shared/order";
//import {Post} from "../shared/post";
import {Pointer} from "../shared/pointer";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {saveAs as importedSaveAs} from "file-saver";
import {NgxCaptureService} from "ngx-capture";
import * as imageToBase64 from 'image-to-base64/browser';
import {formatDate} from "@angular/common";
import jsPDF from "jspdf";
import {Countries} from "../shared/countries";
import {Page} from "../shared/page";

@Component({
  selector: 'app-paper',
  templateUrl: './paper.component.html',
  styleUrls: ['./paper.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [PaperService, AuthenticationService]
})

export class PaperComponent implements OnInit {
  @ViewChild('screen') screen: any;

  public numColumns: number = 2;
  public gutterSize: number = 0;
  public maxWidth: number = 1404;
  public today: Date;
  public user: User;
  public userPointer: Pointer;
  public hasLoaded: boolean = false;
  public isAuthorized: boolean;
  public location: string;
  public paper: Paper;
  public showQuote:boolean = false;
  public colWidth: number = (this.maxWidth / this.numColumns) - (this.numColumns * this.gutterSize );
  public numberRenderedPages:number = 0;
  public pageDataMap = new Map();

  public options: NgxMasonryOptions = {
    horizontalOrder: true,
    fitWidth: false,
    columnWidth: this.colWidth
  };

  private routeSub: Subscription;
  private license:string;
  private pId:string;
  private sessionToken:string;
  private postLocations = new Map();
  constructor(public paperService: PaperService,
              private route: ActivatedRoute,
              private router: Router,
              private db: AngularFirestore,
              private captureService:NgxCaptureService,
              public auth: AngularFireAuth,
              public authenticationService: AuthenticationService) {
  }

  ngOnInit() {
    const ng = this;
    this.today = new Date();
    console.log(this.today)
    this.routeSub = ng.route.params.subscribe(params => {
      ng.license = params['license'] as string;
      ng.pId = params['pid'] as string;
      ng.sessionToken = params['token'] as string;


      //build header


      // this.auth.signInWithCustomToken(sessionToken).then((userCredential) => {
      //   // Signed in
      //   const user = userCredential.user;
      //   console.log("signed in: ", user)
      // }).catch((error) => {
      //     const errorCode = error.code;
      //     const errorMessage = error.message;
      // });

      //let authUser = this.authenticationService.getAuthenticatedUser();
      //if(authUser.stsTokenManager.accessToken != undefined){
        ng.db.collection("order").ref
          .where("license", "==", ng.license)
          .limit(1)
          .get()
          .then(function (querySnapshot) {
            querySnapshot.forEach(function (doc) {
              let order: Order = doc.data() as Order;
              if(order) {
                ng.db.collection("paper").ref
                  .where("id", "==", ng.pId)
                  .limit(1)
                  .get()
                  .then(function (querySnapshot) {
                    querySnapshot.forEach(function (doc) {
                      ng.paper = doc.data() as Paper;
                      ng.location = ng.paper.countries ? ng.paper.countries['name'] : "Somewhere";
                      ng.isAuthorized = true;
                      ng.hasLoaded = true;
                    })
                  })
                  .catch(error => {
                    console.error(error);
                  });

                // ng.captureService
                //   .getImage(ng.screen.nativeElement, true)
                //   .pipe(
                //     tap(img => {
                //       let file = ng.convertBase64ToBlobData(img,'image/png',512,"screen.png");
                //       importedSaveAs(file, "screen.png");
                //     })
                //   )
                //   .subscribe();
              }else{
                ng.hasLoaded = true;
                ng.isAuthorized = false;
              }
            });
          });
     // }
    });
  }
  imageTOBase64(url,doc){
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
  download() {
    let ng = this;
    ng.db.collection("order").ref
      .where("license", "==", ng.license)
      .limit(1)
      .get()
      .then(function (querySnapshot) {
        querySnapshot.forEach(function (doc) {
          let order: Order = doc.data() as Order;
          if (order) {
            ng.db.collection("paper").ref
              .where("id", "==", ng.pId)
              .limit(1)
              .get()
              .then(function (querySnapshot) {
                querySnapshot.forEach(function (doc) {
                  ng.paper = doc.data() as Paper;
                  //set images
                  const pendingCallsToLoadImages:any[]= [];
                  for(let post of ng.paper.posts.slice(0,1)){
                    let imageUrl = post.media.length > 0 ? post.media[0].url:"https://www.epaperweekly.net/img/epaperweekly-no-news.png";
                    pendingCallsToLoadImages.push(ng.paperService.downloadImageBase64(imageUrl));
                  }
                  //set QRCodes
                  const pendingCallsToLoadQRCodes:any[] = [];
                  for(let post of ng.paper.posts){
                    let link = "https://www.epaperweekly.com";
                    if(post.links) {
                      link = Array.isArray(post.links) && post.links.length > 0 ? post.links[0].permalink : post.links.permalink;
                    }
                    pendingCallsToLoadQRCodes.push(ng.paperService.downloadQrCode(link,true,false,false));
                  }
                  //set external source pages
                  // const pendingCallsToSourcePages:any[] = [];
                  // for(let post of ng.paper.posts.slice(0,1)){
                  //   let link = post.links && post.links.length > 0 ? post.links[0].permalink : "https://www.epaperweekly.com";
                  //   pendingCallsToSourcePages.push(ng.paperService.getArticleSourceData(link,'json'));
                  // }

                  const pendingCallsToLoadBrandingImages:any[] = [];
                  const logoUrls =
                    ["https://www.epaperweekly.net/img/ep-weekly-logo.png",
                      "https://www.epaperweekly.net/img/ep-powered.png"];
                  for(let logoUrl of logoUrls){
                    pendingCallsToLoadBrandingImages.push(ng.paperService.downloadImageBase64(logoUrl));
                  }
                  //assemble data
                  zip(
                    zip(pendingCallsToLoadBrandingImages),
                    zip(pendingCallsToLoadQRCodes),
                    zip(pendingCallsToLoadImages))
                    .pipe(map(([brandImages,qrCodes, postImages]) =>
                        ({ brandImages,qrCodes, postImages}))
                  ).subscribe(map => {
                    let pdfDoc = new jsPDF({unit: 'px', format: 'a4', orientation: 'p', precision: 0});
                    console.log( map.qrCodes);

                    let epLogo:string = (map.brandImages as any[])[1];
                    let epWeeklyLogo:string = (map.brandImages as any[])[0];
                    let featuredQRCode:any = map.qrCodes[0];
                    let featuredImage:any = (map.postImages as any[])[0];

                    //used to calculate links
                    ng.numberRenderedPages = 1;
                    //build paper
                    pdfDoc = ng.setArticles(pdfDoc);
                    pdfDoc = ng.setHeader(epWeeklyLogo,featuredQRCode,featuredImage,ng.paper,pdfDoc);
                    pdfDoc = ng.setQRCodes(map.qrCodes.slice(1),pdfDoc);
                    pdfDoc = ng.setSourcePages(ng.paper, map.qrCodes, pdfDoc);
                    pdfDoc = ng.setInlineLinks(ng.paper,pdfDoc);
                    pdfDoc = ng.setFooter(ng.paper, pdfDoc);

                    pdfDoc = ng.setBranding(epLogo,pdfDoc);
                    ng.loadFeaturedArticleImage(featuredImage,pdfDoc);
                    //pdfDoc.save("test.pdf")
                    //will save the doc
                    // let articleTextUrls:any[] = map.dataFromPages.map(({ extracted_text }) => extracted_text);
                    // let articleImageUrls:any[] = map.dataFromPages.map(({ url }) => url);
                    // let pendingCallsToSourceText:any[] = [];
                    // for(let url of articleTextUrls){
                    //   pendingCallsToSourceText.push(ng.paperService.getArticleSourceTextData(url));
                    // }
                    // zip(pendingCallsToSourceText).subscribe(data =>{
                    //   ng.setSourceContentInPages(data,articleImageUrls,pdfDoc,ng.paper,"test.pdf");
                    // });
                  });

                  ng.isAuthorized = true;
                  ng.hasLoaded = true;
                })
              })
              .catch(error => {
                console.error(error);
              });

            // ng.captureService
            //   .getImage(ng.screen.nativeElement, true)
            //   .pipe(
            //     tap(img => {
            //       let file = ng.convertBase64ToBlobData(img,'image/png',512,"screen.png");
            //       importedSaveAs(file, "screen.png");
            //     })
            //   )
            //   .subscribe();
          } else {
            ng.hasLoaded = true;
            ng.isAuthorized = false;
          }
        });
      });
  }
  getFirstArticleWithMedia(articles:any[]) :any{
    let article = {};
    for(let article$ of articles){
      if(article$.media.length > 0){
        article = article$;
        break;
      }
    }
    return article;
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
  setArticles(doc:jsPDF):jsPDF{
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
    let imagesToLoad:any[] = [];

    for (let post of ng.paper.posts.slice(1)) {
      left = col * width;
      top = row * height + 10;
      pageNum = doc.getCurrentPageInfo().pageNumber;
      topMargin = pageNum == 1 ? 220 : 10;

      let imageUrl = post.media.length > 0 ? post.media[0].url:"https://www.epaperweekly.net/img/epaperweekly-no-news.png";
      imagesToLoad.push(imageUrl);

      let sanitizedDescription =  post.summary && post.summary.sentences.length > 0 && post.summary.sentences[0].trim().length > 0?
        post.body: "This article has no content.";
      let sanitizedTitle = post.title && post.title.trim().length > 0 ? post.title :sanitizedDescription;
      let sanitizedAuthor = post.author && post.author.name.trim().length > 0 ? post.author.name : "Anonymous";
      let sanitizedSource = Array.isArray(post.source) && post.source.length > 0 ? post.source.join(',') : post.source.name;

      doc.setFontSize(13).setFont(undefined, 'bold').text(ng.truncateText(7,sanitizedTitle).replace(/[\n\r]+/g, ''), 45 + left, topMargin + top,
        {maxWidth: width-10, align: 'left',baseline:'top'});
      ng.postLocations.set(count+"",{x:45 + left,y:topMargin + top});
      doc.setFontSize(13).setFont(undefined, 'normal').text(ng.truncateText(30,sanitizedDescription).replace(/[^a-zA-Z0-9,;\-.!?$ ]/g, ''), 45 + left, (topMargin + top) +titleHeight,
        {maxWidth: width - 10, align: 'left'});
      doc.setFontSize(10).setFont(undefined, 'normal')
        .setTextColor("#3B3E40")
        .text(ng.truncateText(2, sanitizedAuthor), 165 + left, (topMargin + top) +titleHeight +108, {maxWidth: 80, align: 'right',baseline:'middle'});
      doc.setTextColor("#000000");
      doc.setFontSize(10).setFont(undefined, 'normal')
        .setTextColor("#3B3E40")
        .text(ng.truncateText(2,sanitizedSource), 165 + left, (topMargin + top) +titleHeight +118, {maxWidth: 80, align: 'right',baseline:'middle'});
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
  setFooter(paper:any,doc:jsPDF):jsPDF {
    let currentPage = doc.getCurrentPageInfo().pageNumber;
    let docHeight = doc.internal.pageSize.height;
    let docWidth = doc.internal.pageSize.width;
    let leftGutter = 45;
    let ng = this;
    for(let i = 3, n = 1; i <= doc.getNumberOfPages(); i++,n++){
      doc.setPage(i);
      doc.setFillColor(0,0,0);
      doc.rect(leftGutter, docHeight - 28, docWidth - 60, .5, 'F');
      doc.rect(leftGutter, docHeight - 30, docWidth - 60, .5, 'F');
      doc.setFontSize(12).setFont(undefined, 'normal')
        .text(i+"",((docWidth / 2)+leftGutter / 2 )-20, docHeight-10,{align:'center'});
      doc.textWithLink("Front Page",docWidth - doc.getTextWidth("Front Page")-15,docHeight-10,{pageNumber:1});
    }
    return doc;
  }
  setPageContent(index:number,qrCode:string,post:any,doc:jsPDF):jsPDF{
    let ng = this;
    let topMargin = 20;
    let leftGutter = 45;
    let pageWidth = doc.internal.pageSize.width;
    let pageHeight = doc.internal.pageSize.height;
    let firstPageMaxWords = 430;
    let maxWordsPerPage = 480;


    let sanitizedDescription =  post.body && post.body.length > 0 && post.body.trim().length > 0?
      post.body: "This article has no content.";
    let sanitizedTitle = post.title && post.title.trim().length > 0 ? post.title :sanitizedDescription;
    let sanitizedAuthor = post.author && post.author.name.trim().length > 0 ? post.author.name : "Anonymous";
    let sanitizedSource = Array.isArray(post.source) && post.source.length > 0 ? post.source.join(',') : post.source.name;

    let pageData = ng.setArticlePageContent(index,doc,qrCode,sanitizedTitle,
      sanitizedDescription
        .replace(/(?:https?|ftp):\/\/[\n\S]+/g, '') //remove links
        .replace(/([^.@\s]+)(\.[^.@\s]+)*@([^.@\s]+\.)+([^.@\s]+)/,"") //remove emails
        .replace(/[\n\r]+/g, '').trim() //remove extra newline
      ,firstPageMaxWords,post.words_count,maxWordsPerPage);

    ng.pageDataMap.set(post.id,pageData);


    //console.log(index,pageData);
    //doc.setPage(index);
    if(qrCode){
      doc.addImage(qrCode, "PNG", leftGutter -2, topMargin -2, 30, 30);
    }
    doc.setFontSize(14).setFont(undefined, 'bold').text(
      ng.truncateText(30,
        sanitizedTitle.replace(/[\n\r]+/g, '\r').trim()), leftGutter +40, topMargin,
      {maxWidth: pageWidth - 120, align: 'justify',baseline:'top'});

    doc.setFillColor(0,0,0);
    doc.rect(leftGutter, topMargin+40, pageWidth - 60, .2, 'F');

    doc.setFontSize(13).setFont(undefined, 'normal').text(
      ng.truncateText(firstPageMaxWords,
        sanitizedDescription
          .replace(/(?:https?|ftp):\/\/[\n\S]+/g, '')
          .replace(/([^.@\s]+)(\.[^.@\s]+)*@([^.@\s]+\.)+([^.@\s]+)/,"")
          .replace(/[\n\r]+/g, '').trim() //remove extra newline
        ,true), leftGutter, topMargin + 60,
      {maxWidth: pageWidth - 60, align: 'justify',baseline:'top',lineHeightFactor:1.50});

    for(let p of pageData.pages){
        doc.addPage();
        doc.setFontSize(13).setFont(undefined, 'normal').text(p, leftGutter, topMargin,
        {maxWidth: pageWidth - 60, align: 'justify',baseline:'top',lineHeightFactor:1.50});
    }

    return doc;
  }
  setPageImage(index:number,posts:any[],doc:jsPDF):jsPDF{
    doc.setPage(index);
    let post = posts[index];
    return doc;
  }
  setQRCodes(codes:string[],doc:jsPDF):jsPDF {
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

    for(let base64 of codes){
      left = col * width;
      top = row * height + 10;
      topMargin = pageNum == 1 ? 220 : 10;

      doc.setPage(pageNum);
      doc.addImage(base64, "PNG", left + 44, top + topMargin + 160, 25, 25);
      doc.setFillColor(0,0,0);
      doc.rect(left+45, top + topMargin+160+25, width-10, .2, 'F');

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

  setArticlePageContent(currentPage:number,
                        doc:jsPDF,
                        qrCode: string,
                        pageTitle: string,
                        pageText:string,
                        startFrom:number,
                        wordCount:number,
                        maxWordsPerPage:number):Page{
    let pageOffset: number = 2;
    let page:Page = {};
    let numPages = Math.abs(Math.ceil((wordCount - startFrom) / maxWordsPerPage));
    let wordsArray = pageText.split(" ");
    page.startPage = pageOffset+currentPage;
    page.endPage = page.startPage + numPages;
    page.wordCount = wordCount;
    page.pageCount = numPages;
    page.mainPage = doc.getCurrentPageInfo().pageNumber;
    page.maxWordCount = maxWordsPerPage;

    //break words into pages
    let pages:string[] = [];
    for (let w = startFrom; w < wordsArray.length; w += maxWordsPerPage) {
      const chunk:string[] = wordsArray.slice(w, w + maxWordsPerPage);
      pages.push(chunk.join(" "));
    }
    page.tittle = pageTitle;
    page.qrCodeData = qrCode;
    page.pages = pages;

    return page;
  }

  setInlineLinks(paper:any,doc:jsPDF):jsPDF {
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

    for(let post of paper.posts.slice(1)){
      left = col * width;
      top = row * height + 10;
      topMargin = pageNum == 1 ? 220 : 10;
      doc.setPage(pageNum);

      let pageData = ng.pageDataMap.get(post.id);
      let pg = pageData.mainPage;

      //get first item
      const iterator =  ng.pageDataMap.entries();
      const firstIteration = iterator.next();
      const first = firstIteration.value;

      doc.link(left+45, top + topMargin, width-10,185,{pageNumber:pg});

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
  setBranding(logo:string,doc:jsPDF):jsPDF{
    const docHeight = doc.internal.pageSize.height;
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++){
      doc.setPage(i);
      doc.addImage(logo, "PNG", 5, docHeight - 40 , 30, 30);
      doc.link(5,docHeight - 40 , 30, 30, {url:'https://www.einkpads.com?utm_source=pdf-epaperweekly'});
    }

    return doc;
  }
  setSourcePages(paper:any,qrCodes:string[],doc:jsPDF):jsPDF{
    let ng = this;
    let n = 0;
    for(let post of paper.posts){
      doc.addPage();
      //console.log(ng.pageCounts.get(post.id),post.words_count);
      let index = doc.getNumberOfPages()-1;
      doc = ng.setPageContent(index,qrCodes[n],post,doc);
      n++;
    }
    return doc;
  }
  foundFlaggedWords(testString:string,words:string[]):boolean{
    let found = false;

    for(let word of words) {
      //console.log(word.toLowerCase(),testString.toLowerCase());
      found = testString.toLowerCase().indexOf(word.toLowerCase()) !== 1;
      if (found) break;
    }
    return found;
  }
  sanitizeParagraphs(text:string[],flagWord:any[]):string[]{
    let ng = this;
    let flaggedWords:string[] = [];

    for(let flagged of flagWord){
      flaggedWords.push(flagged.name.trim());
    }
    //console.log(flaggedWords)
    let sanitized:string[] = [];
    for(let paragraph of text){
      let words = paragraph.trim().split(" ");
      if(words.length > 10 || !ng.foundFlaggedWords(paragraph.trim(),flaggedWords)) {
        console.log(paragraph.trim())
        sanitized.push(paragraph.trim());
      }
    }
    return sanitized;
  }
  setSourceContentInPages(data:any,images:any,doc:jsPDF,paper:any,fileName:string){
    let ng = this;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageRatio = pageWidth / pageHeight;

    let sources:any[] = paper.posts.map(({ source }) => source);
    sources = sources.filter((value, index, self) =>
        index === self.findIndex((t) => (
          t.place === value.place && t.name === value.name
        ))
    );
    //console.dir(sources);

    for (let i = 0, n = 1; i < data.length; i++,n++) {

      let formattedParagraphs = ng.sanitizeParagraphs(data[i].match(/\(?[^\.\?\!]+[\.!\?]\)?/g),sources);
      console.dir(formattedParagraphs);

      let img = new Image(1024);
      //console.log("loaded data:",data[i]);
      img.src = images[i];//"https://api.apiflash.com/v1/urltoimage/cache/o1epmkp97j.png?access_key=be7f8523d83d4d24bfc7b556abeb8c71";//data[i];
      img.onload = function () {
        const imgWidth = img.width;
        const imgHeight = img.height;
        const imgRatio = imgWidth / imgHeight;
        doc.setPage(ng.numberRenderedPages+n);
        const wc = imgWidth / pageWidth;
        if (imgRatio >= pageRatio) {
          doc.addImage(img, 'JPEG', 0, (pageHeight - imgHeight / wc) / 2, pageWidth, imgHeight / wc, null, 'NONE');
        }
        else {
          const pi = pageRatio / imgRatio;
          doc.addImage(img, 'JPEG', (pageWidth - pageWidth / pi) / 2, 0, pageWidth / pi, (imgHeight / pi) / wc, null, 'NONE');
        }
        console.log(imgWidth," x ",imgHeight," pdf: ",doc.internal.pageSize.width," x ",doc.internal.pageSize.height);
        doc.save(fileName);
      };
    }
  }
  setHeader(logo:string,topCode:string, topImage:string,paper:any,doc:jsPDF):jsPDF{
    const ng = this;
    let docWidth = doc.internal.pageSize.width;
    let width = 135;

    //logo
    let logoWidth = 820 * .20;
    let logoHeight = 132 * .20;
    let leftGutter = 45;

    let featuredPost = paper.posts[0];
    let sanitizedTitle = featuredPost.title
    let sanitizedDescription = featuredPost.summary && featuredPost.summary.sentences.length > 0 ? featuredPost.summary.sentences[0] :"This article has no content."
    let sanitizedAuthor = featuredPost.author && featuredPost.author.name.trim().length > 0 ? featuredPost.author.name : "Anonymous";

    let sourceCountry = featuredPost.source.locations && featuredPost.source.locations.length > 0 ? featuredPost.source.locations[0].country: "US"
    let country:any[] = Countries.filter(function(i) {
      return i.code === sourceCountry;
    });

    let paperDescription = paper.posts.length + " Articles";
    let urlToSite = 'https://www.epaperweekly.com?utm_source=pdf-epaperweekly';
    let paperDate = formatDate((paper.createdAt as number),'fullDate','en-US');
    let sanitizedSource = Array.isArray(featuredPost.source) && featuredPost.source.length > 0 ? featuredPost.source.join(',') : featuredPost.source.name;

    doc.setPage(1);
    doc.addImage(logo, "PNG", ((docWidth + leftGutter) / 2 - logoWidth / 2), 8 , logoWidth, logoHeight);
    doc.addImage(topCode, "PNG", 45, 185, 25, 25);

    doc.setFontSize(9).setFont(undefined, 'bold')
      .text(ng.truncateText(5,paperDate), leftGutter, 20,
        {maxWidth: width - 10, align: 'left'});
    doc.setFontSize(9).setFont(undefined, 'normal')
      .text(ng.truncateText(6,"Today's Paper"), leftGutter, 28,
        {maxWidth: width - 10, align: 'left'});

    doc.setFontSize(9).setFont(undefined, 'bold')
      .text(ng.truncateText(6,paperDescription), docWidth-10, 20,
        {maxWidth: width - 10, align: 'right'});
    doc.setFontSize(9).setFont(undefined, 'normal')
      .text(ng.truncateText(4,country[0].name), docWidth-10, 28,
        {maxWidth: width - 10, align: 'right'});

    //doc.addImage(topImage, "JPEG", (docWidth / 2) - 42, 50, 906 * 0.28, 555 * 0.28);
    //create link to article
    doc.link(leftGutter, 40, docWidth-20, 170, {pageNumber:ng.numberRenderedPages+1});

    //create link to epaperweekly.com
    doc.link(((docWidth + leftGutter) / 2 - logoWidth / 2), 8 , logoWidth, logoHeight,
      {url:urlToSite});


    doc.setFillColor(0,0,0);
    doc.rect(leftGutter,40, docWidth - 56, .2, 'F');
    // var height = doc.internal.pageSize.getHeight();
    //pdfDoc.line(45, 45, 570, 45);
    doc.setLineWidth(0.2);
    doc.line(docWidth-10, 215, leftGutter, 215);

    doc.setLineWidth(0.2);
    doc.line(docWidth-10, 218, leftGutter, 218);

    doc.setFontSize(13).setFont(undefined, 'bold')
      .text(ng.truncateText(8,sanitizedTitle), 45, 60,
        {maxWidth: width - 10, align: 'left'});
    doc.setFontSize(13).setFont(undefined, 'normal')
      .text(ng.truncateText(28,sanitizedDescription), 45, 90,
        {maxWidth: width - 10, align: 'left'});
    doc.setFontSize(10).setFont(undefined, 'normal')
      .setTextColor("#3B3E40")
      .text(ng.truncateText(25,sanitizedAuthor), 165, 195,
        {maxWidth: 100, align: 'right',baseline:'middle'})
    doc.setFontSize(9).setFont(undefined, 'normal')
      .text(ng.truncateText(4,sanitizedSource), 165, 208,
        {maxWidth: width - 10, align: 'right'});
    return doc;
  }
  loadFeaturedArticleImage(imageData:string,doc:any){
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
      }
      else {
        const pi = pageRatio / imgRatio;
        doc.addImage(img, 'JPEG', (docWidth / 2) - 42, 50, maxWidth, (imgHeight / pi) / wc, null, 'NONE');
      }
      doc.save("test.pdf")
    };
  }
  truncateText(wordsToCut:number, text:string, hideEllipsis = false){
    let wordsArray = text.split(" ");
    // This will keep our generated text
    let truncated = "";
    let hasTruncated = false;
    for(let i = 0; i < wordsToCut; i++) {
      let word = (wordsArray[i])?wordsArray[i]:"";
      truncated += word + ((i < wordsToCut - 1) ? " " : "");
    }
    return truncated.trim()+(wordsArray.length > wordsToCut && !hideEllipsis? "..." :"");
  }
  convertBase64ToBlobData(base64Data: string, contentType: string='image/png', sliceSize=512,fileName:string) {
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
}

