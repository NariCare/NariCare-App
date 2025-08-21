import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, switchMap, filter } from 'rxjs/operators';
import { BackendAuthService } from '../services/backend-auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private backendAuthService: BackendAuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    // Check localStorage first for immediate response
    const token = localStorage.getItem('naricare_token');
    
    if (!token) {
      this.router.navigate(['/auth/login']);
      return of(false);
    }

    // Wait for auth service to complete initialization
    return this.backendAuthService.initialized$.pipe(
      filter(initialized => initialized), // Only proceed when initialized
      take(1),
      switchMap(() => {
        // Now check authentication status
        return this.backendAuthService.isAuthenticated().pipe(
          take(1),
          map(isAuthenticated => {
            if (!isAuthenticated) {
              this.router.navigate(['/auth/login']);
              return false;
            }
            return true;
          })
        );
      })
    );
  }
}