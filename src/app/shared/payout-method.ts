import {Pointer} from './pointer';
import {Identifiable} from './identifiable';

export interface PayoutMethod extends Identifiable {
  title?: string,
  description?: string,
  isDefault?: boolean,
  isActive?: boolean,
  customerId?: string,
  account?: string,
  phone?: string,
  owner: Pointer,
  card?:any,
  type: string,
  metaData?: any
}
