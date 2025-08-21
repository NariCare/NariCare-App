import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, delay, switchMap } from 'rxjs/operators';
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

    // If token exists, check auth service state
    return this.backendAuthService.isAuthenticated().pipe(
      take(1),
      switchMap(isAuthenticated => {
        if (isAuthenticated) {
          return of(true);
        }
        
        // Wait a moment for service to initialize
        return this.backendAuthService.isAuthenticated().pipe(
          delay(100),
          take(1),
          map(isAuth => {
            if (!isAuth) {
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