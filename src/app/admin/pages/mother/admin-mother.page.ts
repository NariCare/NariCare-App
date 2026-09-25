import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Subscription, combineLatest, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import { AdminApiService } from '../../admin-api.service';
import { BabyDetail, MotherDetail, babyAge, fmtWhen, fullName, initials } from '../../admin.models';

export type ProfileTab = 'overview' | 'feeding' | 'growth' | 'diapers' | 'mood' | 'ai' | 'events' | 'account';

const BABY_TABS: [ProfileTab, string][] = [
  ['overview', 'Overview'], ['feeding', 'Feeding Journey'], ['growth', 'Growth'], ['diapers', 'Diapers'],
  ['mood', 'Mood'], ['ai', 'AI Conversations'], ['events', 'Event Logs'], ['account', 'Account']
];
const PREGNANT_TABS: [ProfileTab, string][] = [
  ['overview', 'Overview'], ['mood', 'Mood'], ['ai', 'AI Conversations'], ['events', 'Event Logs'], ['account', 'Account']
];

@Component({
  selector: 'app-admin-mother',
  templateUrl: './admin-mother.page.html',
  styleUrls: ['./admin-mother.page.scss']
})
export class AdminMotherPage implements OnInit, OnDestroy {
  detail: MotherDetail | null = null;
  loading = true;
  error = false;
  tab: ProfileTab = 'overview';
  babyId: string | null = null;
  readonly fmtWhen = fmtWhen;
  readonly fullName = fullName;
  readonly initials = initials;
  readonly babyAge = babyAge;
  private reload$ = new BehaviorSubject<void>(undefined);
  private subs = new Subscription();

  constructor(private route: ActivatedRoute, private router: Router, private api: AdminApiService) {}

  get babies(): BabyDetail[] {
    const all = this.detail?.babies || [];
    const active = all.filter(b => b.isActive !== false);
    return active.length ? active : all;
  }
  get hasBaby(): boolean { return this.babies.length > 0; }
  get tabs(): [ProfileTab, string][] { return this.hasBaby ? BABY_TABS : PREGNANT_TABS; }
  get baby(): BabyDetail | null { return this.babies.find(b => b.id === this.babyId) || this.babies[0] || null; }
  get segmentLink(): string { return this.hasBaby ? '/admin/mothers' : '/admin/pregnant'; }

  ngOnInit(): void {
    this.subs.add(combineLatest([this.route.paramMap.pipe(map(p => p.get('userId') || ''), distinctUntilChanged()), this.reload$]).pipe(
      tap(() => { this.loading = true; this.error = false; }),
      switchMap(([id]) => this.api.mother(id).pipe(catchError(() => of(null))))
    ).subscribe(d => {
      this.loading = false;
      if (!d) { this.error = true; return; }
      this.detail = d;
      this.syncTab();
    }));
    this.subs.add(this.route.queryParamMap.subscribe(p => {
      this.tab = (p.get('tab') as ProfileTab) || 'overview';
      this.babyId = p.get('baby');
      this.syncTab();
    }));
  }

  select(tab: ProfileTab): void { this.nav({ tab: tab === 'overview' ? null : tab }); }

  selectBaby(id: string): void { this.nav({ baby: id }); }

  onTabKey(e: KeyboardEvent, i: number): void {
    const n = this.tabs.length;
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : -1;
    if (next < 0) return;
    e.preventDefault();
    this.select(this.tabs[next][0]);
    setTimeout(() => (document.getElementById(`mp-tab-${this.tabs[next][0]}`) as HTMLElement | null)?.focus());
  }

  retry(): void { this.reload$.next(); }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  // Fall back to Overview when a tab doesn't exist for this segment
  private syncTab(): void {
    if (this.detail && !this.tabs.some(t => t[0] === this.tab)) this.tab = 'overview';
  }

  private nav(queryParams: Record<string, string | null>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
