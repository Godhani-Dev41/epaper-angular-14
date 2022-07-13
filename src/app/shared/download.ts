import {Identifiable} from "./identifiable";
import {Paper} from "./paper";
import {Order} from "./order";
import {Subscription} from "./subscription";
import {User} from "./user";
import {Pointer} from "./pointer";
import firebase from "firebase/compat";

export interface Download extends Identifiable{
  paper: Paper | Pointer,
  order?: Order | Pointer,
  subscription?: Subscription | Pointer,
  createdBy? : User | Pointer
}
