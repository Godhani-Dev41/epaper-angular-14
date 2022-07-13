export interface StripeSubscription {
  customer?: string,
  items?: any[],
  expand?: string[],
  "items[0][plan]"?: string,
  "items[0][price]"?:string,
  "expand[0]"?:string,
  "metadata[order_id]"?:string,
  "metadata[user_id]"?:string,
  "items[0][id]"?:string,
  "items[0][quantity]"?:number,
  "metadata[plan]"?:string,
  proration_behavior?:string,
  trial_period_days?:number,
  cancel_at_period_end?:boolean,
  metadata?: any,
  coupon?:string,
  billing_cycle_anchor?:number | string
}
