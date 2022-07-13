import {PageContent} from "./page-content";

export interface Page {
  id? :string,
  pageCount?:number,
  wordCount?:number,
  maxWordCount?:number,
  startPage?:number,
  endPage?:number,
  url?:string,
  pages?: string[],
  mainPage?:number,
  tittle?:string,
  qrCodeData?:string
}
