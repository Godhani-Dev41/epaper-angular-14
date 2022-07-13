import {Identifiable} from "./identifiable";

export interface Subscription extends Identifiable{
  id? :string,
  uid?:string,
  price:number,
  name:string,
  data?:any,
  metadata?:any,
  currency?:string,
  trial_period_days?:number,
  product?:string,
  usage_type?:string,
  amount?:number,
  amount_decimal?:number,
  billing_scheme?:number,
  created?:number,
  interval?:string,
  interval_count?:string,
  nickname:string,
  object?:string,
  active?:boolean,
  downloads:number,
  papers:number,
  dataLoads:number,
  articleMax:number
}
