import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { fmtDay } from '../../../../models/daily-summary.model';
import { AdminApiService } from '../../../admin-api.service';
import { BabyDetail, GrowthRecord } from '../../../admin.models';

@Component({
  selector: 'app-growth-tab',
  styleUrls: ['./tabs.scss'],
  template: `
    <div class="adm-stack">
      <section class="adm-card">
        <div class="adm-card-head">
          <h2>Growth Chart</h2>
          <div class="adm-seg" role="group" aria-label="Measurement">
            <button type="button" [attr.aria-pressed]="kind === 'weight'" (click)="kind = 'weight'">Weight</button>
            <button type="button" [attr.aria-pressed]="kind === 'height'" (click)="kind = 'height'">Height</button>
          </div>
        </div>
        <div class="adm-error" *ngIf="error" role="alert"><span>Couldn't load growth records.</span><button type="button" class="adm-btn ghost sm" (click)="load()">Try again</button></div>
        <p class="adm-empty" *ngIf="loading" role="status">Loading...</p>
        <div class="gt-chart" *ngIf="!loading && !error">
          <app-weight-chart [weightRecords]="chartRecords" [kind]="kind" [babyGender]="sex" [babyBirthDate]="baby.dateOfBirth"
                            [babyBirthWeight]="baby.birthWeight"></app-weight-chart>
        </div>
      </section>

      <section class="adm-card">
        <div class="adm-card-head"><h2>Growth records</h2></div>
        <div class="adm-table-wrap stack">
          <table class="adm-table stack">
            <caption class="sr-only">Weight and height records, newest first</caption>
            <thead><tr><th scope="col">Date</th><th scope="col" class="num">Weight</th><th scope="col" class="num">Height</th><th scope="col">Notes</th></tr></thead>
            <tbody>
              <tr *ngFor="let r of newestFirst">
                <td data-label="Date">{{ fmtDay(r.date, 'd MMM y') }}</td>
                <td data-label="Weight" class="num">{{ r.weightKg != null ? r.weightKg + ' kg' : '-' }}</td>
                <td data-label="Height" class="num">{{ r.heightCm != null ? r.heightCm + ' cm' : '-' }}</td>
                <td data-label="Notes">{{ r.notes || '-' }}</td>
              </tr>
            </tbody>
          </table>
          <p class="adm-empty" *ngIf="!loading && !records.length">No growth records yet.</p>
        </div>
      </section>
    </div>
  `,
  styles: ['.gt-chart { height: 360px; }']
})
export class GrowthTabComponent implements OnChanges, OnDestroy {
  @Input() baby!: BabyDetail;
  readonly fmtDay = fmtDay;
  kind: 'weight' | 'height' = 'weight';
  records: GrowthRecord[] = [];
  chartRecords: { date: string; weight: number | null; height: number | null }[] = [];
  loading = true;
  error = false;
  private sub?: Subscription;
  private loadedId = '';

  constructor(private api: AdminApiService) {}

  get sex(): 'male' | 'female' { return this.baby.gender === 'male' ? 'male' : 'female'; }
  get newestFirst(): GrowthRecord[] { return [...this.records].reverse(); }

  ngOnChanges(): void { if (this.baby?.id && this.baby.id !== this.loadedId) this.load(); }

  load(): void {
    this.loadedId = this.baby.id;
    this.loading = true;
    this.error = false;
    this.sub?.unsubscribe();
    this.sub = this.api.growth(this.baby.id).pipe(catchError(() => of(null))).subscribe(r => {
      this.loading = false;
      if (!r) { this.error = true; return; }
      this.records = r.records;
      // Shape the WHO chart already reads (weight / height / date)
      this.chartRecords = r.records.map(x => ({ date: x.date, weight: x.weightKg, height: x.heightCm }));
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
