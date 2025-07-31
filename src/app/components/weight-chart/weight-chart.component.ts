import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CDCGrowthChartService } from '../../services/cdc-growth-chart.service';
import { WeightRecord } from '../../models/growth-tracking.model';
import { BabyGrowthPoint } from '../../models/cdc-growth-data.model';
import * as Highcharts from 'highcharts';

@Component({
  selector: 'app-weight-chart',
  templateUrl: './weight-chart.component.html',
  styleUrls: ['./weight-chart.component.scss']
})
export class WeightChartComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() weightRecords: WeightRecord[] = [];
  @Input() babyGender: 'male' | 'female' = 'female';
  @Input() babyBirthDate: Date = new Date();
  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

  chart: any;
  currentPercentile: number = 50;
  percentileInterpretation: any = {};
  isLoading = true;
  chartError = '';

  constructor(private cdcService: CDCGrowthChartService) {}

  ngOnInit() {
    console.log('WeightChartComponent ngOnInit');
    console.log('Weight records:', this.weightRecords);
    console.log('Baby gender:', this.babyGender);
    console.log('Baby birth date:', this.babyBirthDate);
  }

  ngAfterViewInit() {
    console.log('WeightChartComponent ngAfterViewInit');
    console.log('Chart container element:', this.chartContainer?.nativeElement);
    
    // Initialize chart immediately after view init
    if (this.chartContainer?.nativeElement) {
      this.initializeChart();
    } else {
      // Fallback: wait for container to be available
      setTimeout(() => {
        if (this.chartContainer?.nativeElement) {
          this.initializeChart();
        } else {
          this.chartError = 'Chart container element not found in DOM';
          this.isLoading = false;
        }
      }, 100);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('WeightChartComponent ngOnChanges', changes);
    if (changes['weightRecords'] || changes['babyGender'] || changes['babyBirthDate']) {
      if (this.chart) {
        console.log('Updating existing chart');
        this.updateChart();
      } else if (this.chartContainer?.nativeElement) {
        console.log('Creating chart from ngOnChanges');
        this.initializeChart();
      }
    }
  }

  public initializeChart() {
    console.log('Initializing chart...');
    console.log('Chart container available:', !!this.chartContainer?.nativeElement);
    this.isLoading = true;
    this.chartError = '';

    if (!this.chartContainer || !this.chartContainer.nativeElement) {
      console.error('Chart container not available:', {
        hasViewChild: !!this.chartContainer,
        hasNativeElement: !!this.chartContainer?.nativeElement,
        elementId: this.chartContainer?.nativeElement?.id
      });
      this.chartError = 'Chart container element not found. Please try refreshing the page.';
      this.isLoading = false;
      return;
    }

    try {
      this.createChart();
    } catch (error) {
      console.error('Error initializing chart:', error);
      this.chartError = 'Failed to initialize chart: ' + (error as Error).message;
      this.isLoading = false;
    }
  }

  private createChart() {
    console.log('Creating weight chart...');
    
    try {
      const babyGrowthPoints = this.convertToGrowthPoints();
      console.log('Baby growth points:', babyGrowthPoints);
      
      // Create basic chart configuration
      const chartOptions: Highcharts.Options = {
        chart: {
          type: 'line',
          height: 400,
          backgroundColor: '#ffffff',
          animation: false
        },
        title: {
          text: `Weight Chart - ${this.babyGender === 'male' ? 'Boys' : 'Girls'}`,
          style: { 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#2d3748'
          }
        },
        xAxis: {
          title: { text: 'Age (weeks)' },
          min: 0,
          max: 52,
          gridLineWidth: 1,
          labels: {
            style: { color: '#64748b' }
          }
        },
        yAxis: {
          title: { text: 'Weight (kg)' },
          min: 2,
          max: 15,
          gridLineWidth: 1,
          labels: {
            style: { color: '#64748b' }
          }
        },
        legend: {
          enabled: true,
          align: 'right',
          verticalAlign: 'middle',
          layout: 'vertical',
          itemStyle: {
            color: '#64748b',
            fontSize: '12px'
          }
        },
        series: [],
        plotOptions: {
          line: {
            animation: false,
            marker: { enabled: false }
          },
          scatter: {
            animation: false
          }
        },
        tooltip: {
          shared: false,
          formatter: function() {
            if ((this as any).series.name === 'Baby\'s Weight') {
              return `<b>Age:</b> ${(this as any).x} weeks<br/><b>Weight:</b> ${(this as any).y} kg<br/><b>Percentile:</b> ${(this as any).point.percentile || 'N/A'}th`;
            }
            return `<b>${(this as any).series.name}</b><br/>Age: ${(this as any).x} weeks<br/>Weight: ${(this as any).y} kg`;
          }
        },
        credits: { enabled: false }
      };

      // Add CDC percentile curves
      const percentiles = [3, 10, 25, 50, 75, 90, 97];
      const chartData = this.cdcService.getWeightChart(this.babyGender);
      
      percentiles.forEach(percentile => {
        const series: Highcharts.SeriesLineOptions = {
          name: `${percentile}th percentile`,
          type: 'line',
          data: chartData.data.map(point => [point.ageInWeeks, (point as any)[`p${percentile}`]]),
          color: this.getPercentileColor(percentile),
          lineWidth: percentile === 50 ? 2 : 1,
          dashStyle: percentile === 50 ? 'Solid' : 'Dash',
          marker: { enabled: false },
          enableMouseTracking: true
        };
        chartOptions.series!.push(series);
      });

      // Add baby's weight data if available
      if (babyGrowthPoints.length > 0) {
        const babySeries: Highcharts.SeriesScatterOptions = {
          name: 'Baby\'s Weight',
          type: 'scatter',
          data: babyGrowthPoints.map(point => ({
            x: point.ageInWeeks,
            y: point.value,
            percentile: point.percentile
          })),
          color: '#e91e63',
          marker: {
            radius: 6,
            fillColor: '#e91e63',
            lineColor: '#ffffff',
            lineWidth: 2
          },
          zIndex: 10
        };
        chartOptions.series!.push(babySeries);
      }

      console.log('Creating Highcharts chart with options:', chartOptions);
      
      this.chart = Highcharts.chart(this.chartContainer.nativeElement, chartOptions);
      
      console.log('Chart created successfully:', this.chart);
      this.updatePercentileInfo(babyGrowthPoints);
      this.isLoading = false;
      
    } catch (error) {
      console.error('Error creating chart:', error);
      this.chartError = 'Failed to create chart: ' + (error as Error).message;
      this.isLoading = false;
    }
  }

  private updateChart() {
    if (!this.chart) {
      console.log('No existing chart, creating new one');
      this.createChart();
      return;
    }

    try {
      const babyGrowthPoints = this.convertToGrowthPoints();
      
      // Find and update baby's data series
      const babySeriesIndex = this.chart.series.findIndex((s: any) => s.name === 'Baby\'s Weight');
      
      if (babySeriesIndex >= 0 && babyGrowthPoints.length > 0) {
        const newData = babyGrowthPoints.map(point => ({
          x: point.ageInWeeks,
          y: point.value,
          percentile: point.percentile
        }));
        this.chart.series[babySeriesIndex].setData(newData);
      } else if (babyGrowthPoints.length > 0) {
        // Add baby series if it doesn't exist
        this.chart.addSeries({
          name: 'Baby\'s Weight',
          type: 'scatter',
          data: babyGrowthPoints.map(point => ({
            x: point.ageInWeeks,
            y: point.value,
            percentile: point.percentile
          })),
          color: '#e91e63',
          marker: {
            radius: 6,
            fillColor: '#e91e63',
            lineColor: '#ffffff',
            lineWidth: 2
          },
          zIndex: 10
        });
      }

      this.updatePercentileInfo(babyGrowthPoints);
    } catch (error) {
      console.error('Error updating chart:', error);
    }
  }

  private convertToGrowthPoints(): BabyGrowthPoint[] {
    if (!this.weightRecords || this.weightRecords.length === 0) {
      console.log('No weight records available');
      return [];
    }

    console.log('Converting', this.weightRecords.length, 'weight records to growth points');
    
    return this.weightRecords.map(record => {
      const ageInWeeks = this.cdcService.calculateAgeInWeeks(this.babyBirthDate, record.date);
      const percentile = this.cdcService.calculatePercentile(ageInWeeks, record.weight, this.babyGender);
      
      return {
        ageInWeeks,
        value: record.weight,
        percentile,
        date: record.date
      };
    }).sort((a, b) => a.ageInWeeks - b.ageInWeeks);
  }

  private updatePercentileInfo(growthPoints: BabyGrowthPoint[]) {
    if (growthPoints.length > 0) {
      const latestPoint = growthPoints[growthPoints.length - 1];
      this.currentPercentile = latestPoint.percentile || 50;
      this.percentileInterpretation = this.cdcService.getPercentileInterpretation(this.currentPercentile);
    } else {
      this.currentPercentile = 50;
      this.percentileInterpretation = {
        status: 'No Data',
        message: 'Add weight records to see growth analysis',
        color: '#94a3b8'
      };
    }
  }

  private getPercentileColor(percentile: number): string {
    switch (percentile) {
      case 3: return '#ef4444';   // Red
      case 5: return '#f97316';   // Orange
      case 10: return '#f59e0b';  // Amber
      case 25: return '#84cc16';  // Light green
      case 50: return '#10b981';  // Green - median
      case 75: return '#06b6d4';  // Cyan
      case 90: return '#3b82f6';  // Blue
      case 95: return '#8b5cf6';  // Purple
      case 97: return '#ec4899';  // Pink
      default: return '#6b7280'; // Gray
    }
  }

  getGrowthTrend(): string {
    const points = this.convertToGrowthPoints();
    if (points.length < 2) return 'Not enough data';

    const recent = points.slice(-2);
    const percentileChange = recent[1].percentile! - recent[0].percentile!;

    if (Math.abs(percentileChange) < 5) {
      return 'Steady growth pattern';
    } else if (percentileChange > 0) {
      return 'Increasing growth velocity';
    } else {
      return 'Decreasing growth velocity';
    }
  }

  getWeightGain(): string {
    const points = this.convertToGrowthPoints();
    if (points.length < 2) return 'N/A';

    const recent = points.slice(-2);
    const weightGain = recent[1].value - recent[0].value;
    const weeksDiff = recent[1].ageInWeeks - recent[0].ageInWeeks;
    
    if (weeksDiff === 0) return 'N/A';
    
    const weeklyGain = weightGain / weeksDiff;
    return `${(weeklyGain * 1000).toFixed(0)}g/week`;
  }
}