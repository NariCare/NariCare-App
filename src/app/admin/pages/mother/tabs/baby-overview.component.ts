import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import * as Highcharts from 'highcharts';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { DailySummaryDay, addDays, careMetrics, emptyDay, fmtAvg, fmtDay, summaryCsv, CareMetric } from '../../../../models/daily-summary.model';
import { DateOnlyUtil } from '../../../../shared/utils/date-only.util';
import { AdminApiService } from '../../../admin-api.service';
import { AiPair, BabyDetail, EventItem, FeedItem, downloadCsv, fmtWhen } from '../../../admin.models';
import { SERIES, axisTitle, baseOptions } from '../../../components/admin-chart.component';
import { FEED_META, eventIcon } from './record-meta';

type TrendRange = '7D' | '14D' | '30D' | '3M' | 'All';
interface Compare { m: CareMetric; delta: number; }
interface Source { key: FeedItem['type']; label: string; color: string; count: number; pct: number; }

const TREND_DAYS: Record<Exclude<TrendRange, 'All'>, number> = { '7D': 7, '14D': 14, '30D': 30, '3M': 90 };
const WET = '#5b8def';
const SOILED = '#e8915a';

@Component({
  selector: 'app-baby-overview',
  templateUrl: './baby-overview.component.html',
  styleUrls: ['./baby-overview.component.scss']
})
export class BabyOverviewComponent implements OnChanges, OnDestroy {
  @Input() baby!: BabyDetail;
  @Input() userId!: string;

  readonly today = DateOnlyUtil.formatLocalDate();
  readonly ranges: TrendRange[] = ['7D', '14D', '30D', '3M', 'All'];
  readonly fmtAvg = fmtAvg;
  readonly fmtDay = fmtDay;
  readonly fmtWhen = fmtWhen;
  readonly to12 = DateOnlyUtil.to12Hour;
  readonly feedMeta = FEED_META;
  readonly eventIcon = eventIcon;

  date = this.today;
  range: TrendRange = '7D';
  day: DailySummaryDay | null = null;
  metrics: CareMetric[] = [];
  compare: Compare[] = [];
  pairState: 'loading' | 'error' | 'ok' = 'loading';

  trendDays: DailySummaryDay[] = [];
  trendState: 'loading' | 'error' | 'ok' = 'loading';
  trend?: Highcharts.Options;
  trendSummary = '';
  diapers?: Highcharts.Options;
  diaperSummary = '';

  sources: Source[] = [];
  sourceTotal = 0;
  sourceChart?: Highcharts.Options;
  recentFeeds: FeedItem[] | null = null;
  recentAi: AiPair[] | null = null;
  recentEvents: EventItem[] | null = null;

  private pair$ = new Subject<void>();
  private trend$ = new Subject<void>();
  private subs = new Subscription();
  private rail = new Subscription();

  constructor(private api: AdminApiService) {
    this.subs.add(this.pair$.pipe(switchMap(() => {
      this.pairState = 'loading';
      return this.api.dailySummary(this.baby.id, addDays(this.date, -1), this.date).pipe(catchError(() => of(null)));
    })).subscribe(r => {
      if (!r) { this.pairState = 'error'; return; }
      const find = (d: string) => r.days.find(x => x.date === d) || emptyDay(d);
      this.day = find(this.date);
      const prev = careMetrics(find(addDays(this.date, -1)));
      this.metrics = careMetrics(this.day);
      this.compare = this.metrics.map((m, i) => ({ m, delta: Number(m.value) - Number(prev[i].value) }));
      this.pairState = 'ok';
    }));
    this.subs.add(this.trend$.pipe(switchMap(() => {
      this.trendState = 'loading';
      return this.api.dailySummary(this.baby.id, this.trendFrom(), this.today).pipe(catchError(() => of(null)));
    })).subscribe(r => {
      if (!r) { this.trendState = 'error'; return; }
      this.trendDays = this.fill(r.days, this.trendFrom(), this.today);
      this.buildTrend();
      this.trendState = 'ok';
    }));
  }

  get isToday(): boolean { return this.date === this.today; }
  get yesterdayLabel(): string { return fmtDay(addDays(this.date, -1), 'dd MMM y'); }

  ngOnChanges(c: SimpleChanges): void {
    if (!c['baby'] || c['baby'].previousValue?.id === this.baby?.id) return;
    this.date = this.today;
    this.pair$.next();
    this.trend$.next();
    this.loadRail();
  }

  setDate(v: string): void {
    if (!v || v > this.today) return;
    this.date = v;
    this.pair$.next();
  }

  setRange(r: TrendRange): void { this.range = r; this.trend$.next(); }

  retryPair(): void { this.pair$.next(); }
  retryTrend(): void { this.trend$.next(); }

  exportCsv(): void {
    const name = (this.baby.name || 'baby').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadCsv(summaryCsv(this.trendDays), `naricare-${name}-${this.trendFrom()}-to-${this.today}.csv`);
  }

  delta(n: number): string { return n > 0 ? `+${n}` : String(n); }

  ngOnDestroy(): void { this.subs.unsubscribe(); this.rail.unsubscribe(); }

  private trendFrom(): string {
    if (this.range === 'All') return this.baby.dateOfBirth?.slice(0, 10) || addDays(this.today, -89);
    return addDays(this.today, -(TREND_DAYS[this.range] - 1));
  }

  // One row per calendar day, newest first, so gaps show as "-"
  private fill(days: DailySummaryDay[], from: string, to: string): DailySummaryDay[] {
    const byDate = new Map(days.map(d => [d.date, d]));
    const out: DailySummaryDay[] = [];
    for (let d = to; d >= from; d = addDays(d, -1)) out.push(byDate.get(d) || emptyDay(d));
    return out;
  }

  private buildTrend(): void {
    const days = [...this.trendDays].reverse();
    const pick = (f: (d: DailySummaryDay) => number) => days.map(d => (d.hasData ? f(d) : null));
    const n = days.length;
    const logged = days.filter(d => d.hasData);
    const sum = (f: (d: DailySummaryDay) => number) => logged.reduce((s, d) => s + f(d), 0);
    this.trendSummary = `Daily trend for ${n} days, ${logged.length} with entries: ${sum(d => d.feeding.directSessions)} direct feeds, `
      + `${sum(d => d.pumping.sessions)} pumping sessions, ${sum(d => d.pumping.outputMl)} mL pumped, ${sum(d => d.feeding.formulaMl)} mL formula.`;
    this.trend = Highcharts.merge(baseOptions(280), {
      xAxis: { categories: days.map(d => fmtDay(d.date, 'd MMM')), tickInterval: n > 60 ? 14 : n > 14 ? 7 : n > 7 ? 2 : 1 },
      yAxis: [
        { title: axisTitle('Count'), min: 0, allowDecimals: false },
        { title: axisTitle('Volume (mL)'), min: 0, opposite: true, gridLineWidth: 0 }
      ],
      legend: { enabled: true },
      tooltip: { shared: true },
      plotOptions: { series: { connectNulls: false } },
      series: [
        { type: 'column', name: 'Pumped output (mL)', yAxis: 1, color: SERIES.pumped, data: pick(d => d.pumping.outputMl), tooltip: { valueSuffix: ' mL' } },
        { type: 'column', name: 'Formula intake (mL)', yAxis: 1, color: SERIES.formula, data: pick(d => d.feeding.formulaMl), tooltip: { valueSuffix: ' mL' } },
        { type: 'line', name: 'Direct feeds', color: SERIES.direct, data: pick(d => d.feeding.directSessions) },
        { type: 'line', name: 'Pumping sessions', color: SERIES.pump, data: pick(d => d.pumping.sessions) }
      ]
    } as Highcharts.Options);

    const week = days.slice(-7);
    this.diaperSummary = `Diapers in the last 7 days: ${week.reduce((s, d) => s + d.diapers.pee, 0)} wet, ${week.reduce((s, d) => s + d.additional.poop, 0)} soiled.`;
    this.diapers = Highcharts.merge(baseOptions(180), {
      xAxis: { categories: week.map(d => fmtDay(d.date, 'd MMM')) },
      yAxis: { min: 0, allowDecimals: false },
      legend: { enabled: false },
      tooltip: { shared: true },
      series: [
        { type: 'column', name: 'Wet', color: WET, data: week.map(d => d.diapers.pee) },
        { type: 'column', name: 'Soiled', color: SOILED, data: week.map(d => d.additional.poop) }
      ]
    } as Highcharts.Options);
  }

  private loadRail(): void {
    const week = { from: addDays(this.today, -6), to: this.today };
    this.recentFeeds = this.recentAi = this.recentEvents = null;
    this.sourceChart = undefined;
    this.rail.unsubscribe();
    this.rail = new Subscription();
    this.rail.add(this.api.feeds(this.baby.id, week).pipe(catchError(() => of({ items: [] as FeedItem[] }))).subscribe(r => {
      this.recentFeeds = r.items.slice(0, 5);
      this.buildSources(r.items);
    }));
    this.rail.add(this.api.aiConversations(this.userId, 1, 5).pipe(catchError(() => of({ items: [] as AiPair[] }))).subscribe(r => (this.recentAi = r.items.slice(0, 5))));
    this.rail.add(this.api.events(this.userId, null, 5).pipe(catchError(() => of({ items: [] as EventItem[] }))).subscribe(r => (this.recentEvents = r.items.slice(0, 5))));
  }

  // Count of feeding records by type; never mL share
  private buildSources(items: FeedItem[]): void {
    const keys: FeedItem['type'][] = ['direct', 'expressed', 'formula'];
    this.sourceTotal = items.length;
    this.sources = keys.map(k => {
      const count = items.filter(f => f.type === k).length;
      return { key: k, label: FEED_META[k].label, color: FEED_META[k].color, count, pct: items.length ? Math.round((count / items.length) * 100) : 0 };
    });
    this.sourceChart = Highcharts.merge(baseOptions(150), {
      chart: { spacing: [0, 0, 0, 0] },
      title: { text: String(this.sourceTotal), verticalAlign: 'middle', y: 0, style: { fontSize: '20px', fontWeight: '700', color: '#1f2140' } },
      subtitle: { text: 'Total feeds', verticalAlign: 'middle', y: 18, style: { fontSize: '11px', color: '#5d5f7a' } },
      legend: { enabled: false },
      tooltip: { pointFormat: '<b>{point.y}</b> records' },
      series: [{ type: 'pie', name: 'Feeds', innerSize: '70%', size: '100%', data: this.sources.map(s => ({ name: s.label, y: s.count, color: s.color })) }]
    } as Highcharts.Options);
  }
}
