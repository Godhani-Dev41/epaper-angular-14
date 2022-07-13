import {Identifiable} from './identifiable';
import {Address} from "./address";

export interface User extends Identifiable {
  id? :string,
  uid?:string,
  displayName?:string,
  firstName?: string,
  lastName?: string,
  fullName?: string,
  username?: string,
  email?: string,
  password?: string,
  phone?: string,
  tempPassword?: string,
  isActive?: boolean,
  emailVerified?: boolean,
  authData?: any,
  customerId?: string;
  address?: Address;
  authToken?: string,
  stsTokenManager?:any,
  sessionToken?: string
}
