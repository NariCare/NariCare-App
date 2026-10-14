import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, combineLatest, of } from 'rxjs';
import { catchError, filter, switchMap, tap } from 'rxjs/operators';
import { fmtDay } from '../../../../models/daily-summary.model';
import { DateOnlyUtil } from '../../../../shared/utils/date-only.util';
import { AdminApiService } from '../../../admin-api.service';
import { MoodItem, fmtWhen } from '../../../admin.models';

@Component({
  selector: 'app-mood-tab',
  styleUrls: ['./tabs.scss'],
  template: `
    <section class="adm-card">
      <div class="adm-card-head">
        <h2>Mood check-ins</h2>
        <p class="sub">{{ rangeLabel }} · change the range in the top bar</p>
      </div>
      <div class="adm-error" *ngIf="error" role="alert"><span>Couldn't load mood check-ins.</span><button type="button" class="adm-btn ghost sm" (click)="reload()">Try again</button></div>
      <p class="adm-empty" *ngIf="loading" role="status">Loading...</p>
      <p class="adm-empty" *ngIf="!loading && !error && !items.length">No mood check-ins in this range.</p>
      <ul class="adm-list" *ngIf="!loading && items.length">
        <li *ngFor="let m of items" class="mood-row">
          <span class="ic"><img src="assets/Emotional check-in.svg" alt="" width="20" height="20"></span>
          <div class="grow">
            <div class="when">{{ fmtDay(m.date, 'd MMM y') }}, {{ to12(m.time) }}</div>
            <p *ngIf="m.concerning.length" class="mood-line"><strong>Flagged as concerning:</strong>
              <span class="tab-tags"><span class="adm-badge orange" *ngFor="let t of m.concerning">{{ t }}</span></span></p>
            <p *ngIf="m.struggles.length" class="mood-line"><strong>Struggles:</strong>
              <span class="tab-tags"><span class="adm-badge" *ngFor="let t of m.struggles">{{ t }}</span></span></p>
            <p *ngIf="m.positives.length" class="mood-line"><strong>Positives:</strong>
              <span class="tab-tags"><span class="adm-badge green" *ngFor="let t of m.positives">{{ t }}</span></span></p>
            <p *ngIf="m.crisisAlert" class="mood-line"><span class="adm-badge orange">Crisis alert</span></p>
            <p *ngIf="m.gratefulFor" class="mood-line"><strong>Grateful for:</strong> {{ m.gratefulFor }}</p>
            <p *ngIf="m.proudOfToday" class="mood-line"><strong>Proud of today:</strong> {{ m.proudOfToday }}</p>
            <p *ngIf="m.tomorrowGoal" class="mood-line"><strong>Tomorrow's goal:</strong> {{ m.tomorrowGoal }}</p>
            <p *ngIf="m.notes" class="mood-line"><strong>Notes:</strong> {{ m.notes }}</p>
          </div>
        </li>
      </ul>
    </section>
  `,
  styles: ['.mood-row { align-items: flex-start !important; } .mood-line { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 6px; font-size: 13px; }']
})
export class MoodTabComponent implements OnChanges, OnDestroy {
  @Input() userId!: string;
  readonly fmtDay = fmtDay;
  readonly to12 = DateOnlyUtil.to12Hour;
  items: MoodItem[] = [];
  loading = true;
  error = false;
  private user$ = new BehaviorSubject<string>('');
  private sub: Subscription;

  constructor(private api: AdminApiService) {
    this.sub = combineLatest([this.user$.pipe(filter(Boolean)), this.api.range$]).pipe(
      tap(() => { this.loading = true; this.error = false; }),
      switchMap(([id, r]) => this.api.mood(id, r).pipe(catchError(() => of(null))))
    ).subscribe(res => {
      this.loading = false;
      if (!res) { this.error = true; this.items = []; return; }
      this.items = res.items.map(m => ({ ...m, struggles: m.struggles || [], positives: m.positives || [], concerning: m.concerning || [] }));
    });
  }

  get rangeLabel(): string { const r = this.api.range$.value; return `${fmtWhen(r.from)} to ${fmtWhen(r.to)}`; }
  reload(): void { this.user$.next(this.userId); }

  ngOnChanges(): void { if (this.userId !== this.user$.value) this.user$.next(this.userId); }
  ngOnDestroy(): void { this.sub.unsubscribe(); }
}
