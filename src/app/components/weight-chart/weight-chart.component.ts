import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { CDCGrowthChartService } from '../../services/cdc-growth-chart.service';
import { WeightRecord } from '../../models/growth-tracking.model';
import { BabyGrowthPoint } from '../../models/cdc-growth-data.model';
import * as Highcharts from 'highcharts';

@Component({
  selector: 'app-weight-chart',
  templateUrl: './weight-chart.component.html',
  styleUrls: ['./weight-chart.component.scss']
})
export class WeightChartComponent implements OnInit, OnChanges {
  @Input() weightRecords: WeightRecord[] = [];
  @Input() babyGender: 'male' | 'female' = 'female';
  @Input() babyBirthDate: Date = new Date();
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  chart: any;
  currentPercentile: number = 50;
  percentileInterpretation: any = {};
  isLoading = true;

  constructor(private cdcService: CDCGrowthChartService) {}

  ngOnInit() {
    this.isLoading = true;
    // Wait for view to initialize before creating chart
    setTimeout(() => {
      this.isLoading = false;
      this.createChart();
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['weightRecords'] || changes['babyGender'] || changes['babyBirthDate']) {
      if (this.chart) {
        this.updateChart();
      }
    }
  }

  private createChart() {
    if (!this.chartContainer || !this.chartContainer.nativeElement) {
      console.warn('Chart container not available');
      return;
    }

    console.log('Creating weight chart with', this.weightRecords.length, 'records');
    
    const babyGrowthPoints = this.convertToGrowthPoints();
    console.log('Baby growth points:', babyGrowthPoints);
    
    const chartConfig = this.cdcService.generateChartData(babyGrowthPoints, this.babyGender);
    console.log('Chart config generated');

    try {
      this.chart = Highcharts.chart(this.chartContainer.nativeElement, {
        ...chartConfig,
        credits: { enabled: false },
        responsive: {
          rules: [{
            condition: { maxWidth: 500 },
            chartOptions: {
              legend: { enabled: false },
              yAxis: { title: { text: null } },
              xAxis: { title: { text: null } }
            }
          }]
        }
      });
      
      console.log('Chart created successfully');
      this.updatePercentileInfo(babyGrowthPoints);
    } catch (error) {
      console.error('Error creating chart:', error);
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
      const chartConfig = this.cdcService.generateChartData(babyGrowthPoints, this.babyGender);

      // Update the baby's data series
      const babySeriesIndex = this.chart.series.length - 1;
      if (this.chart.series[babySeriesIndex]) {
        this.chart.series[babySeriesIndex].setData(chartConfig.series[chartConfig.series.length - 1].data);
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
      // Default values when no data
      this.currentPercentile = 50;
      this.percentileInterpretation = {
        status: 'No Data',
        message: 'Add weight records to see growth analysis',
        color: '#94a3b8'
      };
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
          }
        }]
      }
    });

    this.updatePercentileInfo(babyGrowthPoints);
  }

  private updateChart() {
    if (!this.chart) {
      this.createChart();
      return;
    }

    const babyGrowthPoints = this.convertToGrowthPoints();
    const chartConfig = this.cdcService.generateChartData(babyGrowthPoints, this.babyGender);

    // Update the baby's data series
    const babySeriesIndex = this.chart.series.length - 1;
    this.chart.series[babySeriesIndex].setData(chartConfig.series[chartConfig.series.length - 1].data);

    this.updatePercentileInfo(babyGrowthPoints);
  }

  private convertToGrowthPoints(): BabyGrowthPoint[] {
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
    const weeklyGain = weightGain / weeksDiff;

    return `${(weeklyGain * 1000).toFixed(0)}g/week`;
  }
}