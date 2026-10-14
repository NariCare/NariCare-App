import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

/**
 * Fail requests that stall instead of hanging forever (e.g. the save spinner
 * that sat on "Saving..." for a minute on a slow connection). Writes get a
 * slightly longer budget than reads.
 */
@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  private readonly readTimeoutMs = 15000;
  private readonly writeTimeoutMs = 20000;
  private readonly aiTimeoutMs = 60000; // AI replies (two model calls) can exceed 20s

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const ms = req.url.includes('/chatbot/') ? this.aiTimeoutMs : isWrite ? this.writeTimeoutMs : this.readTimeoutMs;
    return next.handle(req).pipe(
      timeout(ms),
      catchError(err => {
        if (err?.name === 'TimeoutError') {
          return throwError(() => new Error('The request took too long. Please check your connection and try again.'));
        }
        return throwError(() => err);
      })
    );
  }
}
