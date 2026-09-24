import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { TrackerSummaryService } from '../../../../services/tracker-summary.service';
import { BackendAuthService } from '../../../../services/backend-auth.service';
import { DateOnlyUtil } from '../../../../shared/utils/date-only.util';
import {
  CALENDAR_DAY_NOTE, DailySummaryDay, PUMPING_DEFINITION, addDays, emptyDay, shareText, summaryCsv, summaryShareText
} from '../../../../models/daily-summary.model';

type Range = 7 | 14 | 30 | 92; // 92 = "All", the API maximum

@Component({
  selector: 'app-daily-history',
  templateUrl: './daily-history.page.html',
  styleUrls: ['../../feeds-history/history-page.scss', '../ds-common.scss', './daily-history.page.scss']
})
export class DailyHistoryPage implements OnInit, OnDestroy {
  readonly today = DateOnlyUtil.formatLocalDate();
  readonly ranges: { value: Range; label: string; aria: string }[] = [
    { value: 7, label: '7D', aria: 'Last 7 days' },
    { value: 14, label: '14D', aria: 'Last 14 days' },
    { value: 30, label: '30D', aria: 'Last 30 days' },
    { value: 92, label: 'All', aria: 'All, up to 92 days' }
  ];
  readonly notes = [
    `Pump* ${PUMPING_DEFINITION.charAt(0).toLowerCase()}${PUMPING_DEFINITION.slice(1)}`,
    'Avg is the average direct feed length for the day.',
    `${CALENDAR_DAY_NOTE} "-" means nothing was logged that day.`
  ];

  babyId = '';
  range: Range = 7;
  loading = true;
  error = false;
  exporting = false;
  history: DailySummaryDay[] = [];

  private days = new Map<string, DailySummaryDay>();
  private loadedFrom = this.today;
  private sub = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private summary: TrackerSummaryService,
    private auth: BackendAuthService,
    private toast: ToastController
  ) {}

  ngOnInit(): void {
    this.babyId = this.route.snapshot.paramMap.get('babyId') || '';
    if (!this.babyId) { this.router.navigate(['/tabs/growth']); return; }
    this.setRange(7);
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get backHref(): string { return `/tabs/growth/daily-summary/${this.babyId}`; }
  get rangeLabel(): string { return this.range === 92 ? 'last 92 days' : `last ${this.range} days`; }

  setRange(r: Range): void {
    this.range = r;
    const from = addDays(this.today, -(r - 1));
    if (from < this.loadedFrom || !this.days.size) this.load(from, this.days.size ? addDays(this.loadedFrom, -1) : this.today);
    else this.rebuild();
  }

  retry(): void { this.setRange(this.range); }

  openDay(day: DailySummaryDay): void { this.router.navigate(['/tabs/growth/daily-summary', this.babyId, 'day', day.date]); }

  async share(): Promise<void> {
    const msg = await shareText(summaryShareText(this.history, this.babyName(), this.rangeLabel));
    if (msg) this.showToast(msg);
  }

  async exportCsv(): Promise<void> {
    if (!this.history.length || this.exporting) return;
    this.exporting = true;
    const from = this.history[this.history.length - 1].date;
    const name = `naricare-daily-summary-${from}-${this.today}.csv`;
    const csv = summaryCsv(this.history);
    const nav: any = navigator;
    try {
      const file = typeof File !== 'undefined' ? new File([csv], name, { type: 'text/csv' }) : null;
      if (file && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: 'NariCare Daily Summary' });
        this.showToast('CSV ready to share');
      } else {
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.showToast('CSV downloaded');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') this.showToast("Couldn't export CSV");
    } finally {
      this.exporting = false;
    }
  }

  private babyName(): string | undefined {
    return this.auth.getCurrentUser()?.babies?.find((b: any) => b.id === this.babyId)?.name;
  }

  private load(from: string, to: string): void {
    this.loading = true;
    this.error = false;
    this.sub.add(this.summary.getDailySummary(this.babyId, from, to).subscribe({
      next: r => {
        r.days.forEach(d => this.days.set(d.date, d));
        if (from < this.loadedFrom) this.loadedFrom = from;
        this.loading = false;
        this.rebuild();
      },
      error: () => { this.loading = false; this.error = true; }
    }));
  }

  private rebuild(): void {
    this.history = Array.from({ length: this.range }, (_, i) => {
      const date = addDays(this.today, -i);
      return this.days.get(date) || emptyDay(date);
    });
  }

  private async showToast(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2500, position: 'bottom' });
    await t.present();
  }
}
