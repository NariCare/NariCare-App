import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { BackendAuthService } from '../services/backend-auth.service';

// Admins see everything under /admin; experts only the AI review queue.
@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate, CanActivateChild {
  constructor(private backendAuthService: BackendAuthService, private router: Router) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    if (!localStorage.getItem('naricare_token')) return of(this.router.parseUrl('/auth/login'));
    return this.backendAuthService.initialized$.pipe(
      filter(Boolean),
      take(1),
      map(() => {
        const role = this.backendAuthService.getCurrentUser()?.role;
        if (role === 'admin') return true;
        if (role === 'expert') return state.url.startsWith('/admin/ai-review') || this.router.parseUrl('/admin/ai-review');
        return this.router.parseUrl(role ? '/tabs/dashboard' : '/auth/login');
      })
    );
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    return this.canActivate(route, state);
  }
}
