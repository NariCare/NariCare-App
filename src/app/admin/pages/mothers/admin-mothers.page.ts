import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Subject, Subscription, combineLatest, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import { AdminApiService } from '../../admin-api.service';
import { MotherListItem, MotherListQuery, Segment, babyAge, fmtWhen, fullName, initials } from '../../admin.models';

type Sort = NonNullable<MotherListQuery['sort']>;

@Component({
  selector: 'app-admin-mothers',
  templateUrl: './admin-mothers.page.html',
  styleUrls: ['./admin-mothers.page.scss']
})
export class AdminMothersPage implements OnInit, OnDestroy {
  segment: Segment = 'with_baby';
  q: Required<Omit<MotherListQuery, 'segment'>> = { search: '', page: 1, limit: 20, sort: 'recent', includeDeleted: false };
  items: MotherListItem[] = [];
  total = 0;
  loading = true;
  error = false;
  readonly fmtWhen = fmtWhen;
  readonly fullName = fullName;
  readonly initials = initials;
  readonly babyAge = babyAge;
  private search$ = new Subject<string>();
  private reload$ = new BehaviorSubject<void>(undefined);
  private subs = new Subscription();

  constructor(private route: ActivatedRoute, private router: Router, private api: AdminApiService) {}

  get isPregnant(): boolean { return this.segment === 'pregnant'; }
  get pages(): number { return Math.max(1, Math.ceil(this.total / this.q.limit)); }

  ngOnInit(): void {
    this.segment = this.route.snapshot.data['segment'] || 'with_baby';
    this.subs.add(combineLatest([this.route.queryParamMap, this.reload$]).pipe(
      map(([p]) => ({
        search: p.get('search') || '',
        page: Math.max(1, Number(p.get('page')) || 1),
        limit: 20,
        sort: (['recent', 'name', 'joined'].includes(p.get('sort') || '') ? p.get('sort') : 'recent') as Sort,
        includeDeleted: p.get('includeDeleted') === 'true'
      })),
      tap(q => { this.q = q; this.loading = true; this.error = false; }),
      switchMap(q => this.api.mothers({ segment: this.segment, ...q }).pipe(catchError(() => of(null))))
    ).subscribe(r => {
      this.loading = false;
      if (!r) { this.error = true; return; }
      this.items = r.items;
      this.total = r.total;
    }));
    this.subs.add(this.search$.pipe(debounceTime(350), distinctUntilChanged()).subscribe(s => this.update({ search: s.trim() || null, page: null })));
  }

  onSearch(v: string): void { this.search$.next(v); }
  setSort(sort: Sort): void { this.update({ sort: sort === 'recent' ? null : sort, page: null }); }
  toggleDeleted(v: boolean): void { this.update({ includeDeleted: v || null, page: null }); }
  go(page: number): void { this.update({ page: page > 1 ? page : null }); }
  retry(): void { this.reload$.next(); }

  ariaSort(s: Sort): string | null {
    return this.q.sort === s ? (s === 'name' ? 'ascending' : 'descending') : null;
  }

  open(m: MotherListItem): void { this.router.navigate(['/admin/mothers', m.userId]); }

  trackBy = (_: number, m: MotherListItem) => m.userId;

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  private update(params: Record<string, any>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
