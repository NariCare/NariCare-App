import { AfterViewInit, Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import * as Highcharts from 'highcharts';
import { DateOnlyUtil } from '../../shared/utils/date-only.util';
import { GrowthKind, Sex, formatPercentile, whoCurve, whoPercentile } from '../../shared/utils/who-lms.util';

interface ChartPoint { ageDays: number; month: number; value: number; date: Date; isBirth: boolean; percentile: number | null; }

const CURVES = [3, 15, 50, 85, 97];
const DAY_MS = 86400000;
const DAYS_PER_MONTH = 30.4375;

@Component({
  selector: 'app-weight-chart',
  templateUrl: './weight-chart.component.html',
  styleUrls: ['./weight-chart.component.scss']
})
export class WeightChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() weightRecords: any[] = [];
  @Input() babyGender: Sex = 'female';
  @Input() babyBirthDate: Date | string = new Date();
  @Input() babyBirthWeight: number | null = null;
  @Input() babyBirthHeight: number | null = null;
  @Input() kind: GrowthKind = 'weight';
  @ViewChild('chartContainer', { static: false }) chartContainer?: ElementRef<HTMLDivElement>;

  points: ChartPoint[] = [];
  ageMonths = 0;
  private chart?: Highcharts.Chart;
  private resizeObserver?: ResizeObserver;
  private viewReady = false;

  constructor(private zone: NgZone) {}

  get unit(): string { return this.kind === 'weight' ? 'kg' : 'cm'; }
  get outOfRange(): boolean { return this.ageMonths > 60; }
  get sexLabel(): string { return this.babyGender === 'male' ? 'Boy' : 'Girl'; }

  get summary(): string {
    const last = this.points[this.points.length - 1];
    const what = this.kind === 'weight' ? 'Weight' : 'Height';
    if (!last) return `${what} chart with WHO percentile curves. No entries yet.`;
    const pct = last.percentile != null ? `, ${this.sexLabel} percentile ${formatPercentile(last.percentile)}` : '';
    return `${what} chart, ${this.points.length} entries. Latest ${last.value} ${this.unit} on ${this.formatDate(last.date)}${pct}.`;
  }

  ngOnChanges() {
    this.buildPoints();
    if (this.viewReady) this.render();
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.buildPoints();
    this.render();
    if (this.chartContainer && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.chart?.reflow());
      this.resizeObserver.observe(this.chartContainer.nativeElement);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.chart?.destroy();
  }

  private dob(): Date {
    const d = DateOnlyUtil.parseLocalDate(this.babyBirthDate as any);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private buildPoints() {
    const dob = this.dob();
    const today = new Date();
    this.ageMonths = Math.max(0, (today.getTime() - dob.getTime()) / DAY_MS / DAYS_PER_MONTH);
    const field = this.kind === 'weight' ? 'weight' : 'height';
    const pts: ChartPoint[] = [];
    for (const r of this.weightRecords || []) {
      const raw = r?.[field];
      const value = typeof raw === 'string' ? parseFloat(raw) : raw;
      const dateRaw = r?.record_date || r?.date;
      if (value == null || !(value > 0) || !dateRaw) continue;
      const parsed = DateOnlyUtil.parseLocalDate(dateRaw);
      const date = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      pts.push(this.makePoint(date, value, false, dob));
    }
    const birth = this.kind === 'weight' ? this.babyBirthWeight : this.babyBirthHeight;
    if (birth && birth > 0 && !pts.some(p => p.ageDays === 0)) pts.push(this.makePoint(dob, Number(birth), true, dob));
    this.points = pts.filter(p => p.ageDays >= 0 && !isNaN(p.ageDays)).sort((a, b) => a.ageDays - b.ageDays);
  }

  private makePoint(date: Date, value: number, isBirth: boolean, dob: Date): ChartPoint {
    const ageDays = Math.round((date.getTime() - dob.getTime()) / DAY_MS);
    return { ageDays, month: ageDays / DAYS_PER_MONTH, value, date, isBirth, percentile: whoPercentile(this.kind, this.babyGender, ageDays, value) };
  }

  private cssVar(name: string, fallback: string): string {
    const el = this.chartContainer?.nativeElement;
    return (el && getComputedStyle(el).getPropertyValue(name).trim()) || fallback;
  }

  private render() {
    this.chart?.destroy();
    this.chart = undefined;
    const el = this.chartContainer?.nativeElement;
    if (!el) return;
    if (this.outOfRange) { this.renderEntriesOnly(el); return; }

    const maxMonth = Math.min(60, Math.max(12, Math.ceil(this.ageMonths) + 2));
    const tick = maxMonth <= 12 ? 1 : maxMonth <= 24 ? 3 : 6;
    const ink = this.cssVar('--wc-ink', '#334155');
    const muted = this.cssVar('--wc-muted', '#64748b');
    const curve = this.cssVar('--wc-curve', '#b8c4d4');
    const median = this.cssVar('--wc-median', '#64748b');
    const grid = this.cssVar('--wc-grid', '#eef2f7');
    const brand = this.cssVar('--wc-point', '#8383ed');
    const surface = this.cssVar('--wc-surface', '#ffffff');
    const self = this;

    const curveSeries: Highcharts.SeriesLineOptions[] = CURVES.map(p => {
      const data = whoCurve(this.kind, this.babyGender, p, maxMonth).map(c => [c.month, c.value]);
      return {
        type: 'line', name: `${p}%`, data, enableMouseTracking: false, zIndex: p === 50 ? 2 : 1,
        color: p === 50 ? median : curve, lineWidth: p === 50 ? 2 : 1, marker: { enabled: false },
        dataLabels: {
          enabled: true, crop: false, overflow: 'allow', align: 'left', verticalAlign: 'middle', x: 4, y: 0,
          formatter: function () { return (this as any).point.index === data.length - 1 ? `${p}%` : null; },
          style: { color: p === 50 ? ink : muted, fontSize: '11px', fontWeight: p === 50 ? '600' : '400', textOutline: 'none' }
        }
      } as Highcharts.SeriesLineOptions;
    });

    const babySeries: Highcharts.SeriesLineOptions = {
      type: 'line', name: this.kind === 'weight' ? 'Weight' : 'Height', zIndex: 5, color: brand, lineWidth: 2,
      data: this.points.map((p, i) => ({ x: p.month, y: p.value, custom: { i } })),
      marker: { enabled: true, symbol: 'circle', radius: 5, fillColor: brand, lineColor: surface, lineWidth: 2, states: { hover: { radiusPlus: 2 } } },
      states: { hover: { lineWidthPlus: 0 }, inactive: { opacity: 1 } },
      stickyTracking: false
    };

    this.zone.runOutsideAngular(() => {
      this.chart = Highcharts.chart(el, {
        chart: { backgroundColor: 'transparent', spacing: [12, 4, 8, 4], marginRight: 40, animation: false, style: { fontFamily: 'inherit' } },
        title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false }, exporting: { enabled: false } as any,
        accessibility: { enabled: false } as any,
        xAxis: {
          min: 0, max: maxMonth, tickInterval: tick, gridLineWidth: 1, gridLineColor: grid, lineColor: grid, tickLength: 0,
          title: { text: 'Age (months)', style: { color: muted, fontSize: '11px' } },
          labels: { style: { color: muted, fontSize: '11px' } }
        },
        yAxis: {
          title: { text: this.unit, style: { color: muted, fontSize: '11px' } }, gridLineColor: grid, tickPixelInterval: 48,
          startOnTick: true, endOnTick: true, labels: { style: { color: muted, fontSize: '11px' } }
        },
        tooltip: {
          useHTML: true, outside: false, backgroundColor: surface, borderColor: grid, borderRadius: 12, shadow: true, padding: 0,
          hideDelay: 0, followTouchMove: false,
          formatter: function () { return self.cardHtml((this as any).point?.options?.custom?.i); }
        },
        plotOptions: { series: { animation: false, findNearestPointBy: 'xy' } },
        series: [...curveSeries, babySeries]
      });
    });
  }

  // Over 5 years: no WHO reference, so plot the entries by date only
  private renderEntriesOnly(el: HTMLElement) {
    const muted = this.cssVar('--wc-muted', '#64748b');
    const grid = this.cssVar('--wc-grid', '#eef2f7');
    const brand = this.cssVar('--wc-point', '#8383ed');
    const surface = this.cssVar('--wc-surface', '#ffffff');
    const self = this;
    this.zone.runOutsideAngular(() => {
      this.chart = Highcharts.chart(el, {
        chart: { backgroundColor: 'transparent', spacing: [12, 8, 8, 4], animation: false, style: { fontFamily: 'inherit' } },
        title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false }, accessibility: { enabled: false } as any,
        // Day labels, at least a week of range so same-day entries don't render as a time axis
        xAxis: { type: 'datetime', minRange: 7 * DAY_MS, minTickInterval: DAY_MS, gridLineWidth: 1, gridLineColor: grid, lineColor: grid, tickLength: 0,
          labels: { format: '{value:%e %b}', style: { color: muted, fontSize: '11px' } } },
        yAxis: { title: { text: this.unit, style: { color: muted, fontSize: '11px' } }, gridLineColor: grid, tickPixelInterval: 48, labels: { style: { color: muted, fontSize: '11px' } } },
        tooltip: {
          useHTML: true, outside: false, backgroundColor: surface, borderColor: grid, borderRadius: 12, shadow: true, padding: 0, hideDelay: 0,
          formatter: function () { return self.cardHtml((this as any).point?.options?.custom?.i); }
        },
        plotOptions: { series: { animation: false } },
        series: [{
          type: 'line', name: this.kind === 'weight' ? 'Weight' : 'Height', color: brand, lineWidth: 2, linecap: 'round',
          // Birth point years back would squash recent entries into one corner, so skip it here
          data: this.points.map((p, i) => ({ x: p.date.getTime(), y: p.value, custom: { i }, birth: p.isBirth })).filter(d => !d.birth).map(({ birth, ...d }) => d),
          marker: { enabled: true, symbol: 'circle', radius: 5, fillColor: brand, lineColor: surface, lineWidth: 2 }
        } as Highcharts.SeriesLineOptions]
      });
    });
  }

  private cardHtml(i: number): string {
    const p = this.points[i];
    if (!p) return '';
    const pct = p.percentile != null ? formatPercentile(p.percentile) : '--';
    return `<div class="wc-card">
      <div class="wc-card-date">${this.formatDate(p.date)}${p.isBirth ? ' &middot; Birth' : ''}</div>
      <div class="wc-card-value">${p.value} ${this.unit}</div>
      ${p.percentile != null ? `<div class="wc-card-row">${this.sexLabel} percentile <b>${pct}</b></div>` : ''}
      <div class="wc-card-meta">Age ${this.formatAge(p.date)}${p.percentile != null ? ' &middot; WHO' : ''}</div>
    </div>`;
  }

  private formatDate(d: Date): string {
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /** Calendar age like "1y 2d" or "3m 12d". */
  private formatAge(date: Date): string {
    const dob = this.dob();
    let y = date.getFullYear() - dob.getFullYear();
    let m = date.getMonth() - dob.getMonth();
    let d = date.getDate() - dob.getDate();
    if (d < 0) { m -= 1; d += new Date(date.getFullYear(), date.getMonth(), 0).getDate(); }
    if (m < 0) { y -= 1; m += 12; }
    const parts = [y && `${y}y`, m && `${m}m`, d && `${d}d`].filter(Boolean);
    return parts.length ? parts.join(' ') : '0d';
  }
}
