import { Component, ElementRef, HostListener, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { BackendAuthService } from '../../services/backend-auth.service';
import { DateOnlyUtil } from '../../shared/utils/date-only.util';
import { AdminApiService } from '../admin-api.service';
import { DASHBOARD_MAX_DAYS, DateRange, fmtWhen } from '../admin.models';

interface NavItem { label: string; link: string; icon: string; exact?: boolean; expertOnly?: boolean; }

const NAV: NavItem[] = [
  { label: 'Dashboard', link: '/admin', icon: 'grid-outline', exact: true },
  { label: 'Mothers with baby', link: '/admin/mothers', icon: 'people-outline' },
  { label: 'Pregnant mothers', link: '/admin/pregnant', icon: 'heart-outline' },
  { label: 'AI Ground Truth', link: '/admin/ai-review', icon: 'chatbubbles-outline' },
  { label: 'Lactation Consultants', link: '/admin/lcs', icon: 'medkit-outline' },
  { label: 'Back to NariCare app', link: '/tabs/dashboard', icon: 'arrow-back-outline', expertOnly: true }
];

@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.scss'],
  // Shared .adm-* classes for every admin page live here, scoped under .adm
  encapsulation: ViewEncapsulation.None
})
export class AdminShellComponent implements OnDestroy {
  @ViewChild('main', { static: true }) main!: ElementRef<HTMLElement>;
  navOpen = false;
  rangeOpen = false;
  search = '';
  draft: DateRange;
  readonly isAdmin: boolean;
  readonly nav: NavItem[];
  readonly userName: string;
  readonly userInitial: string;
  readonly presets = [7, 30, 90];
  private sub: Subscription;

  constructor(private router: Router, private auth: BackendAuthService, public api: AdminApiService) {
    const user = this.auth.getCurrentUser();
    this.isAdmin = user?.role === 'admin';
    // LCs (experts) keep their regular app, so give them a way back to it
    this.nav = this.isAdmin ? NAV.filter(n => !n.expertOnly) : NAV.filter(n => n.link === '/admin/ai-review' || n.expertOnly);
    this.userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || (this.isAdmin ? 'Admin' : 'Expert');
    this.userInitial = this.userName.charAt(0).toUpperCase();
    this.draft = { ...this.api.range$.value };
    // Close the drawer and move focus to content on every route change
    this.sub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.navOpen = false;
      this.main.nativeElement.scrollTop = 0;
    });
  }

  get rangeLabel(): string {
    const r = this.api.range$.value;
    return `${fmtWhen(r.from, 'dd MMM y')} - ${fmtWhen(r.to, 'dd MMM y')}`;
  }

  get rangeShort(): string {
    const r = this.api.range$.value;
    return `${fmtWhen(r.from, 'd MMM')} - ${fmtWhen(r.to, 'd MMM')}`;
  }

  onSearch(): void {
    this.router.navigate(['/admin/mothers'], { queryParams: { search: this.search.trim() || null } });
  }

  toggleRange(): void {
    this.draft = { ...this.api.range$.value };
    this.rangeOpen = !this.rangeOpen;
  }

  preset(days: number): void {
    const now = new Date();
    this.draft = {
      from: DateOnlyUtil.formatLocalDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1)),
      to: DateOnlyUtil.formatLocalDate(now)
    };
  }

  get draftError(): string {
    const { from, to } = this.draft;
    if (!from || !to || from > to) return 'From must be on or before To.';
    const days = Math.round((DateOnlyUtil.parseLocalDate(to).getTime() - DateOnlyUtil.parseLocalDate(from).getTime()) / 86400000) + 1;
    return days > DASHBOARD_MAX_DAYS ? `Pick up to ${DASHBOARD_MAX_DAYS} days.` : '';
  }

  get draftInvalid(): boolean { return !!this.draftError; }

  applyRange(): void {
    if (this.draftInvalid) return;
    this.api.range$.next({ ...this.draft });
    this.rangeOpen = false;
  }

  focusMain(): void { this.main.nativeElement.focus(); }

  signOut(): void { this.auth.logout(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.navOpen = false; this.rangeOpen = false; }

  ngOnDestroy(): void { this.sub.unsubscribe(); }
}
