import {Identifiable} from './identifiable';
import {Pointer} from './pointer';
import {User} from "./user";

export interface PaymentMethod extends Identifiable {
  title?: string,
  id?: string,
  description?: string,
  isDefault?: boolean,
  isActive?: boolean,
  isDebit?: boolean,
  cardInfo?: string,
  customerId?: string,
  owner: Pointer | User,
  card?:any,
  uuid?: string,
  type: string,
  metaData?: any
}
