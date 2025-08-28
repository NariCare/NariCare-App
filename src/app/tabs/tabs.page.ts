import { Component, OnInit, OnDestroy } from '@angular/core';
import { BackendAuthService } from '../services/backend-auth.service';
import { User } from '../models/user.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss']
})
export class TabsPage implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();

  constructor(private authService: BackendAuthService) {}

  ngOnInit() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  shouldShowTrackerTab(): boolean {
    return this.currentUser?.role !== 'admin' && this.currentUser?.role !== 'expert';
  }
}