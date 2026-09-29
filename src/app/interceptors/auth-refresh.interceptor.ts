import { Injectable, Injector } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ApiService } from '../services/api.service';

/**
 * A request rejected with 401 (expired access token) is retried once after renewing the session.
 * Only when the renewal itself fails does the 401 reach ApiService.handleError, which signs her out.
 */
@Injectable()
export class AuthRefreshInterceptor implements HttpInterceptor {
  // Lazy lookup: ApiService depends on HttpClient, which depends on this interceptor
  constructor(private injector: Injector) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError(err => {
        const bearer = req.headers.get('Authorization');
        const retryable = err instanceof HttpErrorResponse && err.status === 401
          && !!bearer && bearer !== 'Bearer ' && !req.url.includes('/auth/');
        if (!retryable) return throwError(() => err);
        const api = this.injector.get(ApiService);
        if (!api.hasRefreshToken()) return throwError(() => err);
        return from(api.refreshSession()).pipe(
          switchMap(token => token
            ? next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))
            : throwError(() => err))
        );
      })
    );
  }
}
