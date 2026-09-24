import { AfterViewInit, Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import * as Highcharts from 'highcharts';
import { DailySummaryDay, fmtDay } from '../../models/daily-summary.model';

// Series colours match the tinted tiles; validated as a categorical set (CVD-safe, table view covers yellow contrast).
const SERIES = { direct: '#d9487f', pump: '#6464d3', pumped: '#e0a526', formula: '#3f9e6e' };
const INK = '#2d3748';
const MUTED = '#5f5890';
const GRID = '#ece9fb';

@Component({
  selector: 'app-daily-summary-chart',
  template: `
    <p class="sr-only">{{ summary }}</p>
    <div #host class="dsc-host" aria-hidden="true"></div>
  `,
  styles: [`
    :host { display: block; }
    .dsc-host { height: 200px; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  `]
})
export class DailySummaryChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  /** Days in any order; rendered oldest to newest. */
  @Input() days: DailySummaryDay[] = [];
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;

  summary = '';
  private chart?: Highcharts.Chart;
  private resize?: ResizeObserver;
  private ready = false;

  constructor(private zone: NgZone) {}

  ngOnChanges(): void {
    this.summary = this.describe();
    if (this.ready) this.render();
  }

  ngAfterViewInit(): void {
    this.ready = true;
    this.render();
    if (typeof ResizeObserver !== 'undefined') {
      this.resize = new ResizeObserver(() => this.zone.runOutsideAngular(() => this.chart?.reflow()));
      this.resize.observe(this.host.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resize?.disconnect();
    this.chart?.destroy();
    this.chart = undefined;
  }

  // Screen reader summary; set in ngOnChanges to avoid a change-after-check error
  private describe(): string {
    const logged = this.days.filter(d => d.hasData);
    const sum = (f: (d: DailySummaryDay) => number) => logged.reduce((n, d) => n + f(d), 0);
    return logged.length
      ? `Chart of the last ${this.days.length} days, ${logged.length} with entries: ${sum(d => d.feeding.directSessions)} direct feeds, `
        + `${sum(d => d.pumping.sessions)} pumping sessions, ${sum(d => d.pumping.outputMl)} mL pumped, ${sum(d => d.feeding.formulaMl)} mL formula.`
      : `Chart of the last ${this.days.length} days. Nothing logged yet.`;
  }

  private render(): void {
    const days = [...this.days].sort((a, b) => a.date.localeCompare(b.date));
    const pick = (f: (d: DailySummaryDay) => number) => days.map(d => (d.hasData ? f(d) : null)); // null = gap
    const axisTitle = (text: string) => ({ text, style: { color: MUTED, fontSize: '11px', fontWeight: '600' } });
    const labels = { style: { color: MUTED, fontSize: '11px' } };
    const options: Highcharts.Options = {
      chart: { height: 200, backgroundColor: 'transparent', spacing: [8, 0, 4, 0], animation: false, style: { fontFamily: 'inherit' } },
      title: { text: undefined }, credits: { enabled: false }, accessibility: { enabled: false } as any,
      xAxis: {
        categories: days.map(d => fmtDay(d.date, 'd MMM')), lineColor: GRID, tickLength: 0, labels: { ...labels, autoRotation: false } as any,
        tickInterval: days.length > 14 ? 7 : days.length > 7 ? 2 : 1
      },
      yAxis: [
        { title: axisTitle('count'), min: 0, allowDecimals: false, gridLineColor: GRID, labels },
        { title: axisTitle('mL'), min: 0, opposite: true, gridLineWidth: 0, labels }
      ],
      legend: { enabled: true, align: 'center', verticalAlign: 'bottom', itemStyle: { color: INK, fontSize: '11px', fontWeight: '600' }, symbolRadius: 2, itemDistance: 12, margin: 6, padding: 2 },
      tooltip: {
        shared: true, backgroundColor: '#ffffff', borderColor: GRID, borderRadius: 12, hideDelay: 0,
        style: { color: INK, fontSize: '12px' }, valueDecimals: 0
      },
      plotOptions: {
        series: { animation: false, connectNulls: false, states: { inactive: { opacity: 1 } } },
        column: { borderRadius: 4, borderWidth: 0, pointPadding: 0.08, groupPadding: 0.18, maxPointWidth: 14 },
        line: { lineWidth: 2, marker: { enabled: true, radius: 4, lineWidth: 2, lineColor: '#ffffff', symbol: 'circle' } }
      },
      series: [
        { type: 'column', name: 'Pumped output', yAxis: 1, color: SERIES.pumped, data: pick(d => d.pumping.outputMl), tooltip: { valueSuffix: ' mL' } },
        { type: 'column', name: 'Formula intake', yAxis: 1, color: SERIES.formula, data: pick(d => d.feeding.formulaMl), tooltip: { valueSuffix: ' mL' } },
        { type: 'line', name: 'Direct feeds', color: SERIES.direct, data: pick(d => d.feeding.directSessions) },
        { type: 'line', name: 'Pumping sessions', color: SERIES.pump, data: pick(d => d.pumping.sessions) }
      ]
    };
    this.zone.runOutsideAngular(() => {
      this.chart?.destroy();
      this.chart = Highcharts.chart(this.host.nativeElement, options);
    });
  }
}
