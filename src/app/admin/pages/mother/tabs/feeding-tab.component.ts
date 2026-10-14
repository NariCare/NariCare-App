import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, combineLatest, forkJoin, of } from 'rxjs';
import { catchError, filter, switchMap, tap } from 'rxjs/operators';
import { fmtDay } from '../../../../models/daily-summary.model';
import { DateOnlyUtil } from '../../../../shared/utils/date-only.util';
import { AdminApiService } from '../../../admin-api.service';
import { BabyDetail, FeedItem, PumpItem, fmtWhen } from '../../../admin.models';
import { FEED_META, feedDetail, sideLabel } from './record-meta';

type Kind = FeedItem['type'] | 'pump';
interface Row { id: string; date: string; time: string | null; kind: Kind; detail: string; notes: string | null; }

const KINDS: { key: Kind | 'all'; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'direct', label: 'Direct feeds' }, { key: 'expressed', label: 'Expressed milk' },
  { key: 'formula', label: 'Formula' }, { key: 'pump', label: 'Pumping sessions' }
];
const PUMP_META = { label: 'Pumping session', img: 'assets/Pump sessions.svg', tone: 'lavender' };

@Component({
  selector: 'app-feeding-tab',
  styleUrls: ['./tabs.scss'],
  template: `
    <section class="adm-card">
      <div class="adm-card-head">
        <h2>Feeding Journey</h2>
        <p class="sub">{{ rangeLabel }} · change the range in the top bar</p>
      </div>
      <div class="tab-chips adm-seg" role="group" aria-label="Filter by type">
        <button *ngFor="let k of kinds" type="button" [attr.aria-pressed]="kind === k.key" (click)="kind = k.key">
          {{ k.label }} ({{ count(k.key) }})
        </button>
      </div>
      <div class="adm-error" *ngIf="error" role="alert"><span>Couldn't load feeds.</span><button type="button" class="adm-btn ghost sm" (click)="reload()">Try again</button></div>
      <div class="adm-table-wrap stack" *ngIf="!error">
        <table class="adm-table stack">
          <caption class="sr-only">Feeding records, newest first</caption>
          <thead><tr><th scope="col">Type</th><th scope="col">Date</th><th scope="col">Time</th><th scope="col">Details</th><th scope="col">Notes</th></tr></thead>
          <tbody>
            <tr *ngFor="let r of shown">
              <td data-label="Type"><span class="tab-row-title"><img [src]="meta(r.kind).img" alt="">{{ meta(r.kind).label }}</span></td>
              <td data-label="Date">{{ fmtDay(r.date, 'd MMM y') }}</td>
              <td data-label="Time">{{ to12(r.time) }}</td>
              <td data-label="Details">{{ r.detail }}</td>
              <td data-label="Notes">{{ r.notes || '-' }}</td>
            </tr>
          </tbody>
        </table>
        <p class="adm-empty" *ngIf="!loading && !shown.length">No records in this range.</p>
        <p class="adm-empty" *ngIf="loading" role="status">Loading...</p>
      </div>
    </section>
  `
})
export class FeedingTabComponent implements OnChanges, OnDestroy {
  @Input() baby!: BabyDetail;
  readonly kinds = KINDS;
  readonly fmtDay = fmtDay;
  readonly to12 = DateOnlyUtil.to12Hour;
  kind: Kind | 'all' = 'all';
  rows: Row[] = [];
  loading = true;
  error = false;
  private baby$ = new BehaviorSubject<BabyDetail | null>(null);
  private sub: Subscription;

  constructor(private api: AdminApiService) {
    this.sub = combineLatest([this.baby$.pipe(filter(Boolean)), this.api.range$]).pipe(
      tap(() => { this.loading = true; this.error = false; }),
      switchMap(([b, r]) => forkJoin([this.api.feeds(b!.id, r), this.api.pumps(b!.id, r)]).pipe(catchError(() => of(null))))
    ).subscribe(res => {
      this.loading = false;
      if (!res) { this.error = true; this.rows = []; return; }
      const [f, p] = res;
      this.rows = [
        ...f.items.map(x => ({ id: x.id + x.type, date: x.date, time: x.time, kind: x.type as Kind, detail: feedDetail(x), notes: x.notes })),
        ...p.items.map((x: PumpItem) => ({
          id: 'p' + x.id, date: x.date, time: x.time, kind: 'pump' as Kind, notes: x.notes,
          detail: [x.ml != null ? `${x.ml} mL` : '', x.durationMin != null ? `${x.durationMin} min` : '', sideLabel(x.side)].filter(Boolean).join(' · ') || '-'
        }))
      ].sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
    });
  }

  get shown(): Row[] { return this.kind === 'all' ? this.rows : this.rows.filter(r => r.kind === this.kind); }
  get rangeLabel(): string { const r = this.api.range$.value; return `${fmtWhen(r.from)} to ${fmtWhen(r.to)}`; }

  count(k: Kind | 'all'): number { return k === 'all' ? this.rows.length : this.rows.filter(r => r.kind === k).length; }
  meta(k: Kind) { return k === 'pump' ? PUMP_META : FEED_META[k]; }
  reload(): void { this.baby$.next(this.baby); }

  ngOnChanges(): void { if (this.baby?.id !== this.baby$.value?.id) this.baby$.next(this.baby); }
  ngOnDestroy(): void { this.sub.unsubscribe(); }
}
