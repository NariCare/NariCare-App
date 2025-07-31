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
          backgroundColor: '#fef7f7',
          animation: false
          borderRadius: 12,
          spacing: [20, 20, 20, 20]
        },
        title: {
          text: `${this.babyGender === 'male' ? 'Your Little Boy' : 'Your Little Girl'}'s Growth Journey 💕`,
          style: { 
            fontSize: '18px', 
            fontWeight: '600',
            color: '#e91e63',
            fontFamily: 'Inter, sans-serif'
          }
        },
        subtitle: {
          text: 'Tracking your baby\'s healthy growth with love 🌱',
          style: {
            fontSize: '14px',
            color: '#64748b',
            fontFamily: 'Inter, sans-serif'
          }
        },
        xAxis: {
          title: { 
            text: 'Baby\'s Age (weeks)',
            style: { color: '#64748b', fontWeight: '500' }
          },
          min: 0,
          max: 52,
          gridLineWidth: 1,
          gridLineColor: '#f1f5f9',
          labels: {
            style: { color: '#64748b', fontSize: '12px' },
            formatter: function() {
              const weeks = this.value as number;
              if (weeks === 0) return 'Birth';
              if (weeks <= 4) return `${weeks}w`;
              if (weeks <= 52) return `${Math.floor(weeks/4)}m`;
              return `${weeks}w`;
            }
          }
        },
        yAxis: {
          title: { 
            text: 'Weight (kg)',
            style: { color: '#64748b', fontWeight: '500' }
          },
          min: 2,
          max: 15,
          gridLineWidth: 1,
          gridLineColor: '#f1f5f9',
          labels: {
            style: { color: '#64748b', fontSize: '12px' },
            formatter: function() {
              return `${this.value}kg`;
            }
          }
        },
        legend: {
          enabled: true,
          align: 'center',
          verticalAlign: 'bottom',
          layout: 'horizontal',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 8,
          padding: 12,
          margin: 20,
          itemStyle: {
            color: '#64748b',
            fontSize: '11px',
            fontWeight: '500'
          }
        },
        series: [],
        plotOptions: {
          line: {
            animation: false,
            marker: { enabled: false },
            lineWidth: 2
          },
          scatter: {
            animation: false,
            marker: {
              symbol: 'circle',
              radius: 8
            }
          }
        },
        tooltip: {
          shared: false,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e91e63',
          borderRadius: 8,
          shadow: true,
          formatter: function() {
            if ((this as any).series.name === 'Baby\'s Weight') {
              const weeks = (this as any).x;
              const weight = (this as any).y;
              const percentile = (this as any).point.percentile || 50;
              
              let ageText = weeks === 0 ? 'At birth' : 
                           weeks <= 4 ? `${weeks} weeks old` :
                           `${Math.floor(weeks/4)} months old`;
              
              let percentileText = this.getPercentileMessage(percentile);
              
              return `<div style="text-align: center; padding: 4px;">
                        <div style="font-weight: 600; color: #e91e63; margin-bottom: 4px;">💕 Your Baby</div>
                        <div style="margin-bottom: 2px;"><strong>${ageText}</strong></div>
                        <div style="margin-bottom: 2px;">Weight: <strong>${weight}kg</strong></div>
                        <div style="color: #10b981; font-weight: 500;">${percentileText}</div>
                      </div>`;
            }
            
            const seriesName = (this as any).series.name;
            const friendlyName = this.getFriendlyPercentileName(seriesName);
            return `<div style="text-align: center; padding: 4px;">
                      <div style="font-weight: 500; margin-bottom: 2px;">${friendlyName}</div>
                      <div>Weight: <strong>${(this as any).y}kg</strong></div>
                    </div>`;
          }
        },
        credits: { enabled: false },
        colors: ['#fecaca', '#fed7aa', '#fde68a', '#d9f99d', '#10b981', '#7dd3fc', '#a78bfa', '#f9a8d4', '#fca5a5']
      };

      // Add CDC percentile curves
      const percentiles = [10, 25, 50, 75, 90]; // Simplified to key percentiles
      const chartData = this.cdcService.getWeightChart(this.babyGender);
      
      percentiles.forEach(percentile => {
        const series: Highcharts.SeriesLineOptions = {
          name: this.getMotherFriendlyPercentileName(percentile),
          type: 'line',
          data: chartData.data.map(point => [point.ageInWeeks, (point as any)[`p${percentile}`]]),
          color: this.getMotherFriendlyColor(percentile),
          lineWidth: percentile === 50 ? 3 : 2,
          dashStyle: percentile === 50 ? 'Solid' : 'ShortDash',
          marker: { enabled: false },
          enableMouseTracking: true,
          zIndex: percentile === 50 ? 5 : 1
        };
        chartOptions.series!.push(series);
      });

      // Add baby's weight data if available
      if (babyGrowthPoints.length > 0) {
        const babySeries: Highcharts.SeriesScatterOptions = {
          name: 'Your Baby\'s Weight',
          type: 'scatter',
          data: babyGrowthPoints.map(point => ({
            x: point.ageInWeeks,
            y: point.value,
            percentile: point.percentile
          })),
          color: '#e91e63',
          marker: {
            radius: 8,
            fillColor: '#e91e63',
            lineColor: '#ffffff',
            lineWidth: 3,
            symbol: 'circle'
          },
          zIndex: 10,
          tooltip: {
            pointFormatter: function() {
              return `Your baby's weight: <b>${this.y}kg</b>`;
            }
          }
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

  private getMotherFriendlyPercentileName(percentile: number): string {
    switch (percentile) {
      case 10: return '🌱 Smaller babies (10th)';
      case 25: return '🌿 Below average (25th)';
      case 50: return '🌟 Average babies (50th)';
      case 75: return '🌳 Above average (75th)';
      case 90: return '🌲 Bigger babies (90th)';
      default: return `${percentile}th percentile`;
    }
  }

  private getMotherFriendlyColor(percentile: number): string {
    switch (percentile) {
      case 10: return '#fbbf24';  // Warm yellow
      case 25: return '#a3e635';  // Light green
      case 50: return '#10b981';  // Strong green (average)
      case 75: return '#06b6d4';  // Cyan
      case 90: return '#8b5cf6';  // Purple
      default: return '#6b7280';
    }
  }

  private getPercentileMessage(percentile: number): string {
    if (percentile >= 50) {
      return `Growing beautifully! ${percentile}th percentile 🌟`;
    } else if (percentile >= 25) {
      return `Healthy growth pattern! ${percentile}th percentile 💚`;
    } else {
      return `Growing at their own pace! ${percentile}th percentile 🌱`;
    }
  }

  private getFriendlyPercentileName(seriesName: string): string {
    if (seriesName.includes('10th')) return '🌱 Smaller babies';
    if (seriesName.includes('25th')) return '🌿 Below average';
    if (seriesName.includes('50th')) return '🌟 Average babies';
    if (seriesName.includes('75th')) return '🌳 Above average';
    if (seriesName.includes('90th')) return '🌲 Bigger babies';
    return seriesName;
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

  getSimplePercentileMessage(): string {
    if (this.currentPercentile >= 75) return '🌟 Growing Great!';
    if (this.currentPercentile >= 50) return '💚 Perfect Growth';
    if (this.currentPercentile >= 25) return '🌱 Healthy Growth';
    return '💕 Growing Beautifully';
  }

  getMotherFriendlyStatus(): string {
    if (this.currentPercentile >= 75) return 'Thriving! 🌟';
    if (this.currentPercentile >= 50) return 'Perfect! 💚';
    if (this.currentPercentile >= 25) return 'Healthy! 🌱';
    if (this.currentPercentile >= 10) return 'Growing Well! 💕';
    return 'Unique Growth! 🌸';
  }

  getMotherFriendlyTrend(): string {
    const points = this.convertToGrowthPoints();
    if (points.length < 2) return 'Just getting started! 🌱';

    const recent = points.slice(-2);
    const percentileChange = recent[1].percentile! - recent[0].percentile!;

    if (Math.abs(percentileChange) < 5) {
      return 'Steady & beautiful! 💕';
    } else if (percentileChange > 0) {
      return 'Growing stronger! 🌟';
    } else {
      return 'Finding their pace! 🌸';
    }
  }

  getMotherFriendlyWeightGain(): string {
    const points = this.convertToGrowthPoints();
    if (points.length < 2) return 'Track more to see! 📈';

    const recent = points.slice(-2);
    const weightGain = recent[1].value - recent[0].value;
    const weeksDiff = recent[1].ageInWeeks - recent[0].ageInWeeks;
    
    if (weeksDiff === 0) return 'Same week 📅';
    
    const weeklyGain = weightGain / weeksDiff;
    const gramsPerWeek = Math.round(weeklyGain * 1000);
    
    if (gramsPerWeek >= 150) return `${gramsPerWeek}g/week 🌟`;
    if (gramsPerWeek >= 100) return `${gramsPerWeek}g/week 💚`;
    return `${gramsPerWeek}g/week 🌱`;
  }

  getEncouragingTitle(): string {
    if (this.currentPercentile >= 75) return 'Your Baby is Thriving! 🌟';
    if (this.currentPercentile >= 50) return 'Perfect Growth Journey! 💚';
    if (this.currentPercentile >= 25) return 'Healthy & Happy! 🌱';
    if (this.currentPercentile >= 10) return 'Growing Beautifully! 💕';
    return 'Every Baby is Unique! 🌸';
  }

  getEncouragingMessage(): string {
    if (this.currentPercentile >= 75) {
      return 'Your little one is growing wonderfully! They\'re bigger than most babies their age, which is perfectly healthy. Keep up the great work, mama! 🌟';
    } else if (this.currentPercentile >= 50) {
      return 'Your baby is growing at a perfect pace! They\'re right in the sweet spot with most other babies. You\'re doing an amazing job! 💚';
    } else if (this.currentPercentile >= 25) {
      return 'Your baby is growing beautifully at their own pace! Every baby is different, and yours is developing just right. Trust your instincts! 🌱';
    } else if (this.currentPercentile >= 10) {
      return 'Your little one is growing at their own special pace! Some babies are naturally smaller, and that\'s completely normal. Keep loving and feeding them! 💕';
    } else {
      return 'Your baby is unique and special! While they\'re smaller than average, many healthy babies grow this way. Consider chatting with your pediatrician for reassurance. 🌸';
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