import { Component, OnDestroy, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TrackerSummaryService } from '../../../../services/tracker-summary.service';
import { BackendAuthService } from '../../../../services/backend-auth.service';
import { DateOnlyUtil } from '../../../../shared/utils/date-only.util';
import {
  CALENDAR_DAY_NOTE, CareMetric, DailySummaryDay, DayTimelineEvent, PUMPING_DEFINITION, TimelineKind,
  addDays, careMetrics, emptyDay, fmtAvg, fmtDay, shareText, summaryShareText
} from '../../../../models/daily-summary.model';

type Filter = 'all' | 'feeds' | 'pumping' | 'diapers';
interface TimelineRow extends DayTimelineEvent { time12: string; tone: string; img?: string; icon?: string; }

const FILTER_KINDS: Record<Filter, TimelineKind[] | null> = {
  all: null, feeds: ['direct', 'expressed', 'formula'], pumping: ['pump'], diapers: ['diaper']
};

@Component({
  selector: 'app-day-details',
  templateUrl: './day-details.page.html',
  styleUrls: ['../../feeds-history/history-page.scss', '../ds-common.scss', './day-details.page.scss']
})
export class DayDetailsPage implements OnInit, OnDestroy {
  readonly today = DateOnlyUtil.formatLocalDate();
  readonly definition = PUMPING_DEFINITION;
  readonly calendarNote = CALENDAR_DAY_NOTE;
  readonly filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'feeds', label: 'Feeds' }, { id: 'pumping', label: 'Pumping' }, { id: 'diapers', label: 'Diapers' }
  ];

  babyId = '';
  date = this.today;
  loading = true;
  error = false;
  timelineError = false;
  filter: Filter = 'all';

  day: DailySummaryDay = emptyDay(this.today);
  rows: CareMetric[] = [];
  events: TimelineRow[] = [];

  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private summary: TrackerSummaryService,
    private auth: BackendAuthService,
    private toast: ToastController
  ) {}

  ngOnInit(): void {
    this.babyId = this.route.snapshot.paramMap.get('babyId') || '';
    const date = this.route.snapshot.paramMap.get('date') || '';
    if (!this.babyId) { this.router.navigate(['/tabs/growth']); return; }
    this.go(/^\d{4}-\d{2}-\d{2}$/.test(date) && date <= this.today ? date : this.today);
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  get isToday(): boolean { return this.date === this.today; }
  get longDate(): string { return fmtDay(this.date, 'EEEE, d MMMM y'); }
  get navMain(): string { return fmtDay(this.date, 'd MMMM y'); }
  get navSub(): string { return this.isToday ? 'Today (so far)' : fmtDay(this.date, 'EEEE'); }
  get backHref(): string { return `/tabs/growth/daily-summary/${this.babyId}`; }
  get shown(): TimelineRow[] {
    const kinds = FILTER_KINDS[this.filter];
    return kinds ? this.events.filter(e => kinds.includes(e.kind)) : this.events;
  }
  get filterLabel(): string { return this.filters.find(f => f.id === this.filter)!.label; }

  step(n: number): void {
    const next = addDays(this.date, n);
    if (next <= this.today) this.go(next);
  }

  pick(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= this.today) this.go(v);
  }

  setFilter(ev: Event): void { this.filter = (ev.target as HTMLSelectElement).value as Filter; }

  retry(): void { this.go(this.date); }

  async share(): Promise<void> {
    const name = this.auth.getCurrentUser()?.babies?.find((b: any) => b.id === this.babyId)?.name;
    const msg = await shareText(summaryShareText([this.day], name, this.isToday ? 'today so far' : 'one day'));
    if (msg) this.showToast(msg);
  }

  trackEvent(_: number, e: TimelineRow): string { return e.id; }

  private go(date: string): void {
    this.date = date;
    this.location.replaceState(`/tabs/growth/daily-summary/${this.babyId}/day/${date}`);
    this.loading = true;
    this.error = false;
    this.timelineError = false;
    this.sub?.unsubscribe();
    this.sub = forkJoin({
      day: this.summary.getDailySummary(this.babyId, date, date).pipe(map(r => r.days.find(d => d.date === date) || emptyDay(date))),
      events: this.summary.getDayTimeline(this.babyId, date).pipe(
        map(t => t.events),
        catchError(() => { this.timelineError = true; return of([] as DayTimelineEvent[]); })
      )
    }).subscribe({
      next: ({ day, events }) => {
        this.day = day;
        this.rows = this.buildRows(day);
        this.events = events.map(e => this.toRow(e));
        this.loading = false;
      },
      error: () => { this.day = emptyDay(date); this.rows = []; this.events = []; this.loading = false; this.error = true; }
    });
  }

  private buildRows(d: DailySummaryDay): CareMetric[] {
    const [direct, ...rest] = careMetrics(d);
    return [
      direct,
      { label: 'Average duration', value: fmtAvg(d.feeding.averageDurationMinutes), icon: 'time-outline', tone: 'pink' },
      ...rest,
      { label: 'Poop count', value: String(d.additional.poop), icon: 'ellipse', tone: 'brown' },
      { label: 'Expressed milk given', value: String(d.additional.expressedMilkGivenMl), unit: 'mL', icon: 'water-outline', tone: 'pink' }
    ];
  }

  private toRow(e: DayTimelineEvent): TimelineRow {
    const time12 = e.time ? DateOnlyUtil.to12Hour(e.time) : 'No time';
    const look: Record<TimelineKind, Pick<TimelineRow, 'tone' | 'img' | 'icon'>> = {
      direct: { tone: 'pink', img: 'assets/Fed directly.svg' },
      expressed: { tone: 'yellow', icon: 'water' },
      formula: { tone: 'green', img: 'assets/Formula.svg' },
      pump: { tone: 'lavender', img: 'assets/Pump.svg' },
      diaper: /poop/i.test(e.title) && !/pee/i.test(e.title) ? { tone: 'brown', icon: 'ellipse' } : { tone: 'lavender', img: 'assets/Diaper change.svg' }
    };
    return { ...e, time12, ...(look[e.kind] || look.diaper) };
  }

  private async showToast(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2500, position: 'bottom' });
    await t.present();
  }
}
