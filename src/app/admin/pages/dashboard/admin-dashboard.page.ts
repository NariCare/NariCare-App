import { Component, OnDestroy, OnInit } from '@angular/core';
import * as Highcharts from 'highcharts';
import { Subscription, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { fmtDay } from '../../../models/daily-summary.model';
import { AdminApiService } from '../../admin-api.service';
import { DashboardData, DateCount, categoryLabel, flagLabel, fmtWhen } from '../../admin.models';
import { SERIES, axisTitle, baseOptions } from '../../components/admin-chart.component';

interface Tile { label: string; value: number | null; icon: string; tone: string; link?: string; }
interface ChartCard { options: Highcharts.Options; summary: string; }

const STATUS_COLORS = { pending: '#e0a526', approved: '#3f9e6e', rejected: '#d9487f', corrected: '#6464d3' };

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss']
})
export class AdminDashboardPage implements OnInit, OnDestroy {
  data: DashboardData | null = null;
  loading = true;
  error = false;
  tiles: Tile[] = [];
  signups?: ChartCard;
  records?: ChartCard;
  questions?: ChartCard;
  status?: ChartCard;
  categories?: ChartCard;
  catHeight = 220;
  flagsChart?: ChartCard;
  flagHeight = 220;
  readonly fmtWhen = fmtWhen;
  private sub?: Subscription;

  constructor(public api: AdminApiService) {}

  ngOnInit(): void {
    this.sub = this.api.range$.pipe(
      tap(() => { this.loading = true; this.error = false; }),
      switchMap(r => this.api.dashboard(r).pipe(catchError(() => of(null))))
    ).subscribe(d => {
      this.loading = false;
      if (!d) { this.error = true; return; }
      this.data = d;
      this.build(d);
    });
  }

  retry(): void { this.api.range$.next({ ...this.api.range$.value }); }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private build(d: DashboardData): void {
    const t = d.totals;
    this.tiles = [
      { label: 'Total mothers', value: t.mothers, icon: 'people-outline', tone: 'lavender' },
      { label: 'With baby', value: t.withBaby, icon: 'happy-outline', tone: 'pink' },
      { label: 'Pregnant', value: t.pregnant, icon: 'heart-outline', tone: 'orange' },
      { label: 'New signups in range', value: t.newSignups, icon: 'person-add-outline', tone: 'green' },
      { label: 'Active in last 7 days', value: t.activeMothers7d, icon: 'pulse-outline', tone: 'lavender' },
      { label: 'Deleted accounts', value: t.deleted, icon: 'archive-outline', tone: 'grey' },
      { label: 'Flagged for review', value: d.ai.flagged ?? null, icon: 'flag-outline', tone: 'alert', link: '/admin/ai-review' }
    ];

    this.signups = this.columnSeries(d.signupsPerDay, 'Signups', SERIES.pump);
    this.questions = this.columnSeries(d.ai.questionsPerDay, 'AI questions', SERIES.direct);

    const rp = d.recordsPerDay;
    const kinds: [keyof typeof rp[0], string, string][] = [
      ['feeds', 'Feeds', SERIES.direct], ['pumps', 'Pumps', SERIES.pump], ['diapers', 'Diapers', SERIES.pumped],
      ['growth', 'Growth', SERIES.growth], ['mood', 'Mood', SERIES.mood]
    ];
    const totals = kinds.map(([k, n]) => `${rp.reduce((s, r) => s + (r[k] as number), 0)} ${n.toLowerCase()}`);
    this.records = {
      summary: `Records logged per day: ${totals.join(', ')}.`,
      options: Highcharts.merge(baseOptions(260), {
        xAxis: { categories: rp.map(r => fmtDay(r.date, 'd MMM')), tickInterval: this.tick(rp.length) },
        yAxis: { min: 0, allowDecimals: false, title: axisTitle('records') },
        legend: { enabled: true },
        tooltip: { shared: true },
        plotOptions: { column: { stacking: 'normal' } },
        series: kinds.map(([k, name, color]) => ({ type: 'column', name, color, data: rp.map(r => r[k] as number) }))
      } as Highcharts.Options)
    };

    const a = d.ai;
    const sd = (['pending', 'approved', 'rejected', 'corrected'] as const).map(s => ({ name: s.charAt(0).toUpperCase() + s.slice(1), y: a[s], color: STATUS_COLORS[s] }));
    this.status = {
      summary: `Review status: ${sd.map(s => `${s.y} ${s.name.toLowerCase()}`).join(', ')}.`,
      options: Highcharts.merge(baseOptions(240), {
        title: { text: String(a.totalQuestions), verticalAlign: 'middle', y: -4, style: { fontSize: '22px', fontWeight: '700', color: '#1f2140' } },
        subtitle: { text: 'questions', verticalAlign: 'middle', y: 16, style: { fontSize: '12px', color: '#5d5f7a' } },
        legend: { enabled: true },
        tooltip: { pointFormat: '<b>{point.y}</b> ({point.percentage:.0f}%)' },
        series: [{ type: 'pie', name: 'Answers', innerSize: '68%', showInLegend: true, data: sd }]
      } as Highcharts.Options)
    };

    this.buildFlags(d);

    const cats = [...a.byCategory].sort((x, y) => y.count - x.count);
    this.catHeight = Math.max(180, cats.length * 28 + 40);
    this.categories = {
      summary: cats.length ? `Questions by category: ${cats.map(c => `${categoryLabel(c.category)} ${c.count}`).join(', ')}.` : 'No categorised questions yet.',
      options: Highcharts.merge(baseOptions(this.catHeight), {
        xAxis: { categories: cats.map(c => categoryLabel(c.category)) },
        yAxis: { min: 0, allowDecimals: false },
        legend: { enabled: false },
        plotOptions: { bar: { borderRadius: 4, borderWidth: 0, color: SERIES.pump, dataLabels: { enabled: true, style: { fontSize: '11px', textOutline: 'none', color: '#1f2140' } } } },
        series: [{ type: 'bar', name: 'Questions', data: cats.map(c => c.count) }]
      } as Highcharts.Options)
    };
  }

  private buildFlags(d: DashboardData): void {
    const flags = [...(d.ai.byFlag || [])].sort((x, y) => y.count - x.count);
    this.flagHeight = Math.max(180, flags.length * 28 + 40);
    this.flagsChart = {
      summary: flags.length ? `Flags by type: ${flags.map(f => `${flagLabel(f.flag)} ${f.count}`).join(', ')}.` : 'No flagged answers.',
      options: Highcharts.merge(baseOptions(this.flagHeight), {
        xAxis: { categories: flags.map(f => flagLabel(f.flag)) },
        yAxis: { min: 0, allowDecimals: false },
        legend: { enabled: false },
        plotOptions: { bar: { borderRadius: 4, borderWidth: 0, color: SERIES.pumped, dataLabels: { enabled: true, style: { fontSize: '11px', textOutline: 'none', color: '#1f2140' } } } },
        series: [{ type: 'bar', name: 'Answers', data: flags.map(f => f.count) }]
      } as Highcharts.Options)
    };
  }

  private columnSeries(rows: DateCount[], name: string, color: string): ChartCard {
    const sum = rows.reduce((s, r) => s + r.count, 0);
    return {
      summary: `${name} per day, ${sum} in total across ${rows.length} days.`,
      options: Highcharts.merge(baseOptions(220), {
        xAxis: { categories: rows.map(r => fmtDay(r.date, 'd MMM')), tickInterval: this.tick(rows.length) },
        yAxis: { min: 0, allowDecimals: false },
        legend: { enabled: false },
        series: [{ type: 'column', name, color, data: rows.map(r => r.count) }]
      } as Highcharts.Options)
    };
  }

  private tick(n: number): number { return n > 45 ? 14 : n > 21 ? 7 : n > 10 ? 2 : 1; }
}
