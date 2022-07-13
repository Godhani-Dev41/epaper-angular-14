import { HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable()
export class CacheInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.method === "GET") {
      const httpRequest = req.clone({
        headers: new HttpHeaders({
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Expires": "Sat, 01 Jan 2000 00:00:00 GMT"
        })
      });
      return next.handle(httpRequest);
    }
    return next.handle(req);
  }
}
