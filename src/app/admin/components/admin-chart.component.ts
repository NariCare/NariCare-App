import { AfterViewInit, Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import * as Highcharts from 'highcharts';

export const INK = '#1f2140';
export const MUTED = '#5d5f7a';
export const GRID = '#ece9fb';
// Same categorical set as the app's daily summary chart.
export const SERIES = { direct: '#d9487f', pump: '#6464d3', pumped: '#e0a526', formula: '#3f9e6e', growth: '#2f8fb8', mood: '#9a6bd6' };

const labels = { style: { color: MUTED, fontSize: '11px' } };
export const axisTitle = (text: string) => ({ text, style: { color: MUTED, fontSize: '11px', fontWeight: '600' } });

/** Base options every admin chart shares; callers spread theirs over it. */
export function baseOptions(height: number): Highcharts.Options {
  return {
    chart: { height, backgroundColor: 'transparent', spacing: [8, 4, 4, 0], animation: false, style: { fontFamily: 'inherit' } },
    title: { text: undefined }, credits: { enabled: false }, accessibility: { enabled: false } as any,
    legend: { itemStyle: { color: INK, fontSize: '12px', fontWeight: '500' }, symbolRadius: 6, itemDistance: 16 },
    tooltip: { backgroundColor: '#ffffff', borderColor: GRID, borderRadius: 10, style: { color: INK, fontSize: '12px' }, valueDecimals: 0 },
    xAxis: { lineColor: GRID, tickLength: 0, labels: { ...labels, autoRotation: false } as any },
    yAxis: { gridLineColor: GRID, labels, title: { text: undefined } },
    plotOptions: {
      series: { animation: false, states: { inactive: { opacity: 1 } } },
      column: { borderRadius: 4, borderWidth: 0, pointPadding: 0.08, groupPadding: 0.16, maxPointWidth: 16 },
      line: { lineWidth: 2, marker: { enabled: true, radius: 4, lineWidth: 2, lineColor: '#ffffff', symbol: 'circle' } },
      pie: { borderWidth: 2, borderColor: '#ffffff', dataLabels: { enabled: false } }
    }
  };
}

/** Thin Highcharts host: renders outside the zone, reflows on resize, destroys on teardown. */
@Component({
  selector: 'app-admin-chart',
  template: `
    <p class="sr-only">{{ summary }}</p>
    <div #host [style.height.px]="height" aria-hidden="true"></div>
  `,
  styles: [':host { display: block; min-width: 0; }']
})
export class AdminChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() options: Highcharts.Options | null = null;
  @Input() summary = '';
  @Input() height = 240;
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;

  private chart?: Highcharts.Chart;
  private resize?: ResizeObserver;
  private ready = false;

  constructor(private zone: NgZone) {}

  ngOnChanges(): void { if (this.ready) this.render(); }

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

  private render(): void {
    this.zone.runOutsideAngular(() => {
      this.chart?.destroy();
      this.chart = this.options ? Highcharts.chart(this.host.nativeElement, this.options) : undefined;
    });
  }
}
