import { Component, OnDestroy, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { TrackerSummaryService } from '../../../services/tracker-summary.service';
import { BackendAuthService } from '../../../services/backend-auth.service';
import { DateOnlyUtil } from '../../../shared/utils/date-only.util';
import { DailySummaryDay, PUMPING_DEFINITION, fmtAvg } from '../../../models/daily-summary.model';

type Range = 7 | 14 | 30;
type Dir = 'up' | 'down' | 'same';

interface Metric { label: string; value: string; unit?: string; img?: string; icon?: string; tone: 'pink' | 'lavender'; }
interface Compare { label: string; value: string; dir: Dir; delta: string; aria: string; }

const addDays = (date: string, n: number): string => {
  const d = DateOnlyUtil.parseLocalDate(date);
  return DateOnlyUtil.formatLocalDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

const emptyDay = (date: string): DailySummaryDay => ({
  date, hasData: false,
  feeding: { directSessions: 0, averageDurationMinutes: null, formulaMl: 0 },
  pumping: { sessions: 0, outputMl: 0 },
  diapers: { pee: 0 },
  additional: { poop: 0, expressedMilkGivenMl: 0 }
});

@Component({
  selector: 'app-daily-summary',
  templateUrl: './daily-summary.page.html',
  styleUrls: ['../feeds-history/history-page.scss', './daily-summary.page.scss']
})
export class DailySummaryPage implements OnInit, OnDestroy {
  readonly today = DateOnlyUtil.formatLocalDate();
  readonly definition = PUMPING_DEFINITION;
  readonly ranges: Range[] = [7, 14, 30];

  babyId = '';
  selectedDate = this.today;
  range: Range = 7;
  loading = true;
  loaded = false;
  error = false;
  detailsOpen = false;

  selected: DailySummaryDay = emptyDay(this.today);
  overview: Metric[] = [];
  compare: Compare[] | null = null;
  history: DailySummaryDay[] = [];
  details: Metric[] = [];
  additional: Metric[] = [];

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
    this.load(addDays(this.today, -30), this.today);
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get isToday(): boolean { return this.selectedDate === this.today; }
  get dateLabel(): string { return formatDate(DateOnlyUtil.parseLocalDate(this.selectedDate), 'd MMM y', 'en-US'); }
  get daySub(): string {
    return this.isToday ? 'Today (so far)' : formatDate(DateOnlyUtil.parseLocalDate(this.selectedDate), 'EEEE', 'en-US');
  }
  get compareTitle(): string { return this.isToday ? 'Compared with yesterday' : 'Compared with the day before'; }

  retry(): void {
    const from = this.days.size ? addDays(this.loadedFrom, -14) : addDays(this.today, -30);
    this.load(from, this.days.size ? addDays(this.loadedFrom, -1) : this.today);
  }

  step(n: number): void {
    const next = addDays(this.selectedDate, n);
    if (next > this.today) return;
    this.selectedDate = next;
    // Keep the previous day loaded too, for the comparison row.
    if (addDays(next, -1) < this.loadedFrom) this.load(addDays(next, -14), addDays(this.loadedFrom, -1));
    this.rebuild();
  }

  setRange(r: Range): void { this.range = r; this.rebuild(); }

  openDay(day: DailySummaryDay | null = null): void {
    if (day) { this.selectedDate = day.date; this.rebuild(); }
    this.detailsOpen = true;
  }

  async share(): Promise<void> {
    const text = this.shareText();
    const title = 'NariCare Daily Summary';
    const nav: any = navigator;
    try {
      if (nav.share) { await nav.share({ title, text }); return; }
    } catch (e: any) {
      if (e?.name === 'AbortError') return; // user closed the share sheet
    }
    try {
      await nav.clipboard.writeText(text);
      this.showToast('Summary copied');
    } catch {
      this.showToast("Couldn't share summary");
    }
  }

  private load(from: string, to: string): void {
    this.loading = !this.days.size;
    this.error = false;
    this.sub.add(this.summary.getDailySummary(this.babyId, from, to).subscribe({
      next: r => {
        r.days.forEach(d => this.days.set(d.date, d));
        if (from < this.loadedFrom) this.loadedFrom = from;
        this.loading = false;
        this.loaded = true;
        this.rebuild();
      },
      error: () => { this.loading = false; this.error = true; }
    }));
  }

  private dayOf(date: string): DailySummaryDay { return this.days.get(date) || emptyDay(date); }

  private rebuild(): void {
    const d = this.selected = this.dayOf(this.selectedDate);
    const prev = this.dayOf(addDays(this.selectedDate, -1));
    const v = (n: number) => (d.hasData ? String(n) : '-');
    this.overview = [
      { label: 'Direct feeds', value: v(d.feeding.directSessions), img: 'assets/Fed directly.svg', tone: 'pink' },
      { label: 'Pumping sessions', value: v(d.pumping.sessions), img: 'assets/Pump.svg', tone: 'lavender' },
      { label: 'Pumped output', value: v(d.pumping.outputMl), unit: 'mL', img: 'assets/Pumping journey.svg', tone: 'lavender' },
      { label: 'Formula intake', value: v(d.feeding.formulaMl), unit: 'mL', img: 'assets/Formula.svg', tone: 'pink' },
      { label: 'Wet diapers', value: v(d.diapers.pee), img: 'assets/Diaper change.svg', tone: 'lavender' }
    ];
    this.details = [
      this.overview[0],
      { label: 'Average direct feed', value: d.hasData ? fmtAvg(d.feeding.averageDurationMinutes) : '-', icon: 'time-outline', tone: 'pink' },
      ...this.overview.slice(1)
    ];
    this.additional = [
      { label: 'Poop count', value: v(d.additional.poop), icon: 'ellipse-outline', tone: 'lavender' },
      { label: 'Expressed milk given', value: v(d.additional.expressedMilkGivenMl), unit: 'mL', icon: 'water-outline', tone: 'pink' }
    ];
    this.compare = d.hasData && prev.hasData ? [
      this.cmp('Direct', 'direct feeds', d.feeding.directSessions, prev.feeding.directSessions),
      this.cmp('Pumps', 'pumping sessions', d.pumping.sessions, prev.pumping.sessions),
      this.cmp('Pumped', 'mL pumped', d.pumping.outputMl, prev.pumping.outputMl, ' mL'),
      this.cmp('Formula', 'mL formula', d.feeding.formulaMl, prev.feeding.formulaMl, ' mL'),
      this.cmp('Pee', 'wet diapers', d.diapers.pee, prev.diapers.pee)
    ] : null;
    this.history = Array.from({ length: this.range }, (_, i) => this.dayOf(addDays(this.today, -i)));
  }

  private cmp(label: string, noun: string, now: number, before: number, unit = ''): Compare {
    const diff = now - before;
    const dir: Dir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
    const delta = dir === 'same' ? 'Same' : `${Math.abs(diff)}${unit}`;
    const vs = dir === 'same' ? 'same as' : `${Math.abs(diff)} ${dir === 'up' ? 'more' : unit ? 'less' : 'fewer'} than`;
    return { label, value: `${now}${unit}`, dir, delta, aria: `${now} ${noun}, ${vs} the previous day` };
  }

  // Plain-text table for the share sheet; columns padded so rows line up in monospace apps.
  private shareText(): string {
    const name = this.auth.getCurrentUser()?.babies?.find((b: any) => b.id === this.babyId)?.name;
    const fmt = (date: string, f: string) => formatDate(DateOnlyUtil.parseLocalDate(date), f, 'en-US');
    const oldest = this.history[this.history.length - 1]?.date || this.today;
    const widths = [11, 6, 6, 6, 8, 8, 4];
    const line = (cols: string[]) => cols.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('').trimEnd();
    const rows = this.history.map(d => line([
      d.date === this.today ? 'Today' : fmt(d.date, 'EEE d MMM'),
      ...(d.hasData
        ? [String(d.feeding.directSessions), fmtAvg(d.feeding.averageDurationMinutes), String(d.pumping.sessions),
          `${d.pumping.outputMl}mL`, `${d.feeding.formulaMl}mL`, String(d.diapers.pee)]
        : ['-', '-', '-', '-', '-', '-'])
    ]));
    return [
      `NariCare Daily Summary${name ? ` for ${name}` : ''}`,
      `${fmt(oldest, 'd MMM y')} to ${fmt(this.today, 'd MMM y')} (last ${this.range} days)`,
      '',
      line(['Date', 'Direct', 'Avg', 'Pump*', 'Pumped', 'Formula', 'Pee']),
      ...rows,
      '',
      `* ${this.definition}`,
      'Generated from NariCare.'
    ].join('\n');
  }

  private async showToast(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2500, position: 'bottom' });
    await t.present();
  }
}
