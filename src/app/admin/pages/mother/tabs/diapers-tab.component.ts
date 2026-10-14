import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, combineLatest, of } from 'rxjs';
import { catchError, filter, switchMap, tap } from 'rxjs/operators';
import { fmtDay } from '../../../../models/daily-summary.model';
import { DateOnlyUtil } from '../../../../shared/utils/date-only.util';
import { AdminApiService } from '../../../admin-api.service';
import { BabyDetail, DiaperItem, fmtWhen } from '../../../admin.models';

// Soiled = poop or both, matching the daily summary
const isWet = (d: DiaperItem) => d.changeType === 'pee' || d.changeType === 'both';
const isSoiled = (d: DiaperItem) => d.changeType === 'poop' || d.changeType === 'both';
const TYPE_LABEL: Record<string, string> = { pee: 'Wet', poop: 'Soiled', both: 'Wet and soiled' };

@Component({
  selector: 'app-diapers-tab',
  styleUrls: ['./tabs.scss'],
  template: `
    <section class="adm-card">
      <div class="adm-card-head">
        <h2>Diapers</h2>
        <p class="sub">{{ rangeLabel }} · change the range in the top bar</p>
      </div>
      <div class="tab-sum" *ngIf="!loading && !error">
        <span class="adm-badge">{{ items.length }} changes</span>
        <span class="adm-badge">{{ wet }} wet</span>
        <span class="adm-badge orange">{{ soiled }} soiled</span>
      </div>
      <div class="adm-error" *ngIf="error" role="alert"><span>Couldn't load diapers.</span><button type="button" class="adm-btn ghost sm" (click)="reload()">Try again</button></div>
      <div class="adm-table-wrap stack" *ngIf="!error">
        <table class="adm-table stack">
          <caption class="sr-only">Diaper changes, newest first</caption>
          <thead><tr><th scope="col">Date</th><th scope="col">Time</th><th scope="col">Type</th><th scope="col">Wetness</th><th scope="col">Notes</th></tr></thead>
          <tbody>
            <tr *ngFor="let d of items">
              <td data-label="Date">{{ fmtDay(d.date, 'd MMM y') }}</td>
              <td data-label="Time">{{ to12(d.time) }}</td>
              <td data-label="Type">{{ typeLabel(d.changeType) }}</td>
              <td data-label="Wetness">{{ (d.wetness | titlecase) || '-' }}</td>
              <td data-label="Notes">{{ d.notes || '-' }}</td>
            </tr>
          </tbody>
        </table>
        <p class="adm-empty" *ngIf="!loading && !items.length">No diaper changes in this range.</p>
        <p class="adm-empty" *ngIf="loading" role="status">Loading...</p>
      </div>
    </section>
  `
})
export class DiapersTabComponent implements OnChanges, OnDestroy {
  @Input() baby!: BabyDetail;
  readonly fmtDay = fmtDay;
  readonly to12 = DateOnlyUtil.to12Hour;
  items: DiaperItem[] = [];
  wet = 0;
  soiled = 0;
  loading = true;
  error = false;
  private baby$ = new BehaviorSubject<BabyDetail | null>(null);
  private sub: Subscription;

  constructor(private api: AdminApiService) {
    this.sub = combineLatest([this.baby$.pipe(filter(Boolean)), this.api.range$]).pipe(
      tap(() => { this.loading = true; this.error = false; }),
      switchMap(([b, r]) => this.api.diapers(b!.id, r).pipe(catchError(() => of(null))))
    ).subscribe(res => {
      this.loading = false;
      if (!res) { this.error = true; this.items = []; return; }
      this.items = res.items;
      this.wet = res.items.filter(isWet).length;
      this.soiled = res.items.filter(isSoiled).length;
    });
  }

  get rangeLabel(): string { const r = this.api.range$.value; return `${fmtWhen(r.from)} to ${fmtWhen(r.to)}`; }
  typeLabel(t: string): string { return TYPE_LABEL[t] || t || '-'; }
  reload(): void { this.baby$.next(this.baby); }

  ngOnChanges(): void { if (this.baby?.id !== this.baby$.value?.id) this.baby$.next(this.baby); }
  ngOnDestroy(): void { this.sub.unsubscribe(); }
}
