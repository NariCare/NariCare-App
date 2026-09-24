import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, filter } from 'rxjs/operators';
import { BackendAuthService } from '../services/backend-auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private backendAuthService: BackendAuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    // Check localStorage first for immediate response
    const token = localStorage.getItem('naricare_token');
    
    if (!token) {
      this.router.navigate(['/auth/login']);
      return of(false);
    }

    // Wait for auth service to complete initialization, then allow. A valid
    // token is enough: the current user may still be loading after init, and
    // requiring it here caused a transient failure that bounced the first
    // navigation (only working after a refresh).
    return this.backendAuthService.initialized$.pipe(
      filter(initialized => initialized), // Only proceed when initialized
      take(1),
      // Admins never use the mother flow
      map(() => this.backendAuthService.getCurrentUser()?.role === 'admin' ? this.router.parseUrl('/admin') : true)
    );
  }
}