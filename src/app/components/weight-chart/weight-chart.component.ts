import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { WHOGrowthChartService } from '../../services/who-growth-chart.service';
import { WeightRecord } from '../../models/growth-tracking.model';
import { BabyGrowthPoint } from '../../models/who-growth-data.model';
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

  constructor(private whoService: WHOGrowthChartService) {}

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
    console.log('Weight records:', this.weightRecords);
    console.log('Baby gender:', this.babyGender);
    console.log('Baby birth date:', this.babyBirthDate);
    
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

    // Check if Highcharts is available
    if (typeof Highcharts === 'undefined') {
      console.error('Highcharts is not available');
      this.chartError = 'Chart library not loaded. Please refresh the page.';
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

  /**
   * Get smart X-axis configuration based on baby's current age
   */
  private getSmartXAxisConfig(): any {
    const currentAgeInWeeks = this.getCurrentBabyAgeInWeeks();
    
    // Determine smart zoom level based on age
    let minAge: number, maxAge: number, tickInterval: number;
    let timeUnit: 'weeks' | 'months';
    
    if (currentAgeInWeeks <= 8) {
      // Newborn phase (0-8 weeks): Show weekly view
      minAge = 0;
      maxAge = Math.max(12, currentAgeInWeeks + 4);
      tickInterval = 1;
      timeUnit = 'weeks';
    } else if (currentAgeInWeeks <= 26) {
      // Infant phase (2-6 months): Show monthly view
      minAge = 0;
      maxAge = Math.max(30, currentAgeInWeeks + 8);
      tickInterval = 4; // Every month (4 weeks)
      timeUnit = 'months';
    } else if (currentAgeInWeeks <= 52) {
      // Baby phase (6-12 months): Show 2-month intervals
      minAge = 0;
      maxAge = Math.max(60, currentAgeInWeeks + 12);
      tickInterval = 8; // Every 2 months
      timeUnit = 'months';
    } else {
      // Toddler phase (12+ months): Show 3-month intervals
      minAge = 0;
      maxAge = Math.max(104, currentAgeInWeeks + 16);
      tickInterval = 12; // Every 3 months
      timeUnit = 'months';
    }

    // Capture timeUnit in closure for formatter
    const selectedTimeUnit = timeUnit;

    return {
      title: { 
        text: selectedTimeUnit === 'weeks' ? 'Baby\'s Age (weeks)' : 'Baby\'s Age (months)',
        style: { color: '#64748b', fontWeight: '500' }
      },
      min: minAge,
      max: maxAge,
      tickInterval: tickInterval,
      gridLineWidth: 1,
      gridLineColor: '#f1f5f9',
      labels: {
        style: { color: '#64748b', fontSize: '12px' },
        formatter: function() {
          const weeks = this.value as number;
          
          if (weeks === 0) return 'Birth';
          
          if (selectedTimeUnit === 'weeks') {
            // Show numbered weeks: 1, 2, 3, 4...
            return weeks.toString();
          } else {
            // Show numbered months: 1, 2, 3, 4...
            const months = Math.floor(weeks / 4);
            if (months === 0) return 'Birth';
            return months.toString();
          }
        }
      }
    };
  }

  /**
   * Get smart Y-axis configuration based on baby's age and weight data
   */
  private getSmartYAxisConfig(): any {
    const currentAgeInWeeks = this.getCurrentBabyAgeInWeeks();
    const babyGrowthPoints = this.convertToGrowthPoints();
    
    // Get WHO chart data for age-appropriate weight range
    const chartData = this.whoService.getWeightChart(this.babyGender);
    const ageRange = this.getSmartXAxisConfig();
    
    // Smart weight range and tick intervals based on age
    let minWeight: number, maxWeight: number, tickInterval: number;
    
    if (currentAgeInWeeks <= 8) {
      // Newborn phase (0-8 weeks): Focus on smaller weight changes
      minWeight = 2.0;
      maxWeight = 6.0;
      tickInterval = 0.5; // Every 500g
    } else if (currentAgeInWeeks <= 26) {
      // Infant phase (2-6 months): Rapid growth period
      minWeight = 3.0;
      maxWeight = 9.0;
      tickInterval = 1.0; // Every 1kg
    } else if (currentAgeInWeeks <= 52) {
      // Baby phase (6-12 months): Steady growth
      minWeight = 5.0;
      maxWeight = 12.0;
      tickInterval = 1.0; // Every 1kg
    } else {
      // Toddler phase (12+ months): Broader range
      minWeight = 7.0;
      maxWeight = 15.0;
      tickInterval = 2.0; // Every 2kg
    }
    
    // Refine based on WHO data for the visible age range
    if (chartData && chartData.data) {
      const relevantData = chartData.data.filter(point => 
        point.ageInWeeks >= ageRange.min && point.ageInWeeks <= ageRange.max
      );
      
      if (relevantData.length > 0) {
        // Use 5th and 95th percentiles for a focused view
        const minWeights = relevantData.map(p => p.p5);
        const maxWeights = relevantData.map(p => p.p95);
        
        const whoMinWeight = Math.min(...minWeights);
        const whoMaxWeight = Math.max(...maxWeights);
        
        // Adjust range based on WHO data with smart padding
        const padding = currentAgeInWeeks <= 8 ? 0.3 : 
                       currentAgeInWeeks <= 26 ? 0.5 : 1.0;
        
        minWeight = Math.min(minWeight, whoMinWeight - padding);
        maxWeight = Math.max(maxWeight, whoMaxWeight + padding);
        
        // Include baby's actual weights if available
        if (babyGrowthPoints.length > 0) {
          const babyWeights = babyGrowthPoints.map(p => p.value);
          const babyMinWeight = Math.min(...babyWeights);
          const babyMaxWeight = Math.max(...babyWeights);
          
          // Ensure baby's data is visible with extra padding
          minWeight = Math.min(minWeight, babyMinWeight - padding);
          maxWeight = Math.max(maxWeight, babyMaxWeight + padding);
        }
        
        // Round to appropriate intervals based on age
        if (currentAgeInWeeks <= 8) {
          // Round to 0.2kg for newborns (more precision)
          minWeight = Math.max(1.5, Math.floor(minWeight * 5) / 5);
          maxWeight = Math.min(8.0, Math.ceil(maxWeight * 5) / 5);
        } else if (currentAgeInWeeks <= 26) {
          // Round to 0.5kg for infants
          minWeight = Math.max(2.0, Math.floor(minWeight * 2) / 2);
          maxWeight = Math.min(12.0, Math.ceil(maxWeight * 2) / 2);
        } else {
          // Round to 1kg for older babies
          minWeight = Math.max(3.0, Math.floor(minWeight));
          maxWeight = Math.min(20.0, Math.ceil(maxWeight));
        }
      }
    }

    return {
      title: { 
        text: 'Weight (kg)',
        style: { color: '#64748b', fontWeight: '500' }
      },
      min: minWeight,
      max: maxWeight,
      tickInterval: tickInterval,
      gridLineWidth: 1,
      gridLineColor: '#f1f5f9',
      labels: {
        style: { color: '#64748b', fontSize: '12px' },
        formatter: function() {
          const weight = this.value as number;
          // Smart formatting based on weight range
          if (weight < 10) {
            return `${weight.toFixed(1)}kg`; // Show 1 decimal for weights under 10kg
          } else {
            return `${Math.round(weight)}kg`; // Show whole numbers for larger weights
          }
        }
      }
    };
  }

  /**
   * Calculate baby's current age in weeks
   */
  private getCurrentBabyAgeInWeeks(): number {
    if (!this.babyBirthDate) return 0;
    
    const now = new Date();
    const birthDate = new Date(this.babyBirthDate);
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  }

  private createChart() {
    console.log('Creating weight chart...');
    
    try {
      // Validate data first
      if (!this.babyBirthDate || !this.babyGender) {
        throw new Error('Missing baby birth date or gender');
      }

      const babyGrowthPoints = this.convertToGrowthPoints();
      const that = this;
      console.log('Baby growth points:', babyGrowthPoints);
      
      // Validate WHO service
      if (!this.whoService) {
        throw new Error('WHO Growth Chart Service not available');
      }

      const chartData = this.whoService.getWeightChart(this.babyGender);
      console.log('WHO chart data:', chartData);

      if (!chartData || !chartData.data || chartData.data.length === 0) {
        throw new Error('WHO chart data is not available');
      }
      
      // Create basic chart configuration
      const chartOptions: Highcharts.Options = {
        chart: {
          type: 'line',
          height: 400,
          backgroundColor: '#fef7f7',
          animation: false,
          borderRadius: 12,
          spacing: [20, 20, 20, 20]
        },
        title: {
          text: ``,
          style: { 
            fontSize: '18px', 
            fontWeight: '600',
            color: '#8383ed',
            fontFamily: 'Inter, sans-serif'
          }
        },
        subtitle: {
          text: '',
          style: {
            fontSize: '14px',
            color: '#64748b',
            fontFamily: 'Inter, sans-serif'
          }
        },
        xAxis: this.getSmartXAxisConfig(),
        yAxis: this.getSmartYAxisConfig(),
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
          borderColor: '#8383ed',
          borderRadius: 8,
          shadow: true,
          formatter: function() {
            if ((this as any).series.name === 'Your Baby\'s Weight') {
              const weeks = (this as any).x;
              const weight = (this as any).y;
              const percentile = (this as any).point.percentile || 50;
              
              // Smart age display based on current age
              const currentAge = that.getCurrentBabyAgeInWeeks();
              let ageText: string;
              
              if (weeks === 0) {
                ageText = 'At birth';
              } else if (currentAge <= 8) {
                // Show weeks for newborns
                ageText = `${weeks} week${weeks === 1 ? '' : 's'} old`;
              } else {
                // Show months for older babies
                const months = Math.floor(weeks / 4);
                ageText = months === 0 ? 'Birth' : `${months} month${months === 1 ? '' : 's'} old`;
              }
              
              let percentileText = that.getPercentileMessage(percentile);
              
              return `<div style="text-align: center; padding: 4px;">
                        <div style="font-weight: 600; color: #8383ed; margin-bottom: 4px;">💕 Your Baby</div>
                        <div style="margin-bottom: 2px;"><strong>${ageText}</strong></div>
                        <div style="margin-bottom: 2px;">Weight: <strong>${weight}kg</strong></div>
                        <div style="color: #10b981; font-weight: 500;">${percentileText}</div>
                      </div>`;
            }
            
            const seriesName = (this as any).series.name;
            const friendlyName = that.getFriendlyPercentileName(seriesName);
            return `<div style="text-align: center; padding: 4px;">
                      <div style="font-weight: 500; margin-bottom: 2px;">${friendlyName}</div>
                      <div>Weight: <strong>${(this as any).y}kg</strong></div>
                    </div>`;
          }
        },
        credits: { enabled: false },
        colors: ['#fecaca', '#fed7aa', '#fde68a', '#d9f99d', '#10b981', '#7dd3fc', '#a78bfa', '#f9a8d4', '#fca5a5']
      };

      // Add WHO percentile curves (filtered to visible age range)
      const percentiles = [10, 25, 50, 75, 90]; // Simplified to key percentiles
      const xAxisConfig = this.getSmartXAxisConfig();
      
      percentiles.forEach(percentile => {
        // Filter data to only include visible age range for better performance and clarity
        const relevantData = chartData.data.filter(point => 
          point.ageInWeeks >= xAxisConfig.min && point.ageInWeeks <= xAxisConfig.max
        );
        
        const seriesData = relevantData.map(point => [point.ageInWeeks, (point as any)[`p${percentile}`]]);
        console.log(`Percentile ${percentile} data (filtered):`, seriesData.slice(0, 3)); // Log first 3 points
        
        const series: Highcharts.SeriesLineOptions = {
          name: this.getMotherFriendlyPercentileName(percentile),
          type: 'line',
          data: seriesData,
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
          color: '#8383ed',
          marker: {
            radius: 8,
            fillColor: '#8383ed',
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
      console.log('Chart container element:', this.chartContainer.nativeElement);
      
      // Ensure container has proper dimensions
      if (this.chartContainer.nativeElement.offsetWidth === 0) {
        console.log('Container has no width, setting default dimensions');
        this.chartContainer.nativeElement.style.width = '100%';
        this.chartContainer.nativeElement.style.height = '400px';
      }
      
      this.chart = Highcharts.chart(this.chartContainer.nativeElement, chartOptions);
      
      console.log('Chart created successfully:', this.chart);
      this.updatePercentileInfo(babyGrowthPoints);
      this.isLoading = false;
      
    } catch (error) {
      console.error('Error creating chart:', error);
      console.log('Attempting to create simplified fallback chart...');
      try {
        this.createSimplifiedChart();
      } catch (fallbackError) {
        console.error('Fallback chart also failed:', fallbackError);
        this.chartError = 'Failed to create chart: ' + (error as Error).message;
        this.isLoading = false;
      }
    }
  }

  private createSimplifiedChart() {
    console.log('Creating simplified chart as fallback...');
    
    const babyGrowthPoints = this.convertToGrowthPoints();
    
    // Create a very basic chart with just the essentials
    const simpleOptions: Highcharts.Options = {
      chart: {
        type: 'line',
        height: 400,
        backgroundColor: '#fef7f7'
      },
      title: {
        text: `${this.babyGender === 'male' ? 'Boy' : 'Girl'}'s Weight Growth`
      },
      xAxis: {
        title: { text: 'Age (weeks)' },
        min: 0,
        max: 52
      },
      yAxis: {
        title: { text: 'Weight (kg)' },
        min: 0,
        max: 15
      },
      series: [],
      credits: { enabled: false }
    };

    // Add just the median line and baby's data
    try {
      const chartData = this.whoService.getWeightChart(this.babyGender);
      if (chartData && chartData.data) {
        // Add 50th percentile line
        const medianSeries: Highcharts.SeriesLineOptions = {
          name: 'Average babies (50th percentile)',
          type: 'line',
          data: chartData.data.map(point => [point.ageInWeeks, point.p50]),
          color: '#10b981',
          lineWidth: 2,
          marker: { enabled: false }
        };
        simpleOptions.series!.push(medianSeries);
      }

      // Add baby's weight data if available
      if (babyGrowthPoints.length > 0) {
        const babySeries: Highcharts.SeriesScatterOptions = {
          name: 'Your Baby',
          type: 'scatter',
          data: babyGrowthPoints.map(point => [point.ageInWeeks, point.value]),
          color: '#8383ed',
          marker: {
            radius: 6,
            fillColor: '#8383ed',
            lineColor: '#ffffff',
            lineWidth: 2
          }
        };
        simpleOptions.series!.push(babySeries);
      }
    } catch (seriesError) {
      console.warn('Could not add data series, showing empty chart:', seriesError);
    }

    console.log('Creating simplified Highcharts chart...');
    this.chart = Highcharts.chart(this.chartContainer.nativeElement, simpleOptions);
    console.log('Simplified chart created successfully');
    
    this.updatePercentileInfo(babyGrowthPoints);
    this.isLoading = false;
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

  public getPercentileMessage(percentile: number): string {
    if (percentile >= 50) {
      return `Growing beautifully! ${percentile}th percentile 🌟`;
    } else if (percentile >= 25) {
      return `Healthy growth pattern! ${percentile}th percentile 💚`;
    } else {
      return `Growing at their own pace! ${percentile}th percentile 🌱`;
    }
  }

  public getFriendlyPercentileName(seriesName: string): string {
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
          color: '#8383ed',
          marker: {
            radius: 6,
            fillColor: '#8383ed',
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
    console.log('Baby birth date:', this.babyBirthDate);
    console.log('Sample weight record:', this.weightRecords[0]);
    
    try {
      // Normalize all records first
      const normalizedRecords = this.weightRecords
        .map(record => this.normalizeWeightRecord(record))
        .filter(record => record !== null) as { date: Date; weight: number }[];

      console.log('Valid normalized records:', normalizedRecords.length, 'out of', this.weightRecords.length);

      const growthPoints = normalizedRecords.map(record => {
        const birthDate = new Date(this.babyBirthDate);
        
        console.log('Processing normalized record:', {
          recordDate: record.date.toISOString(),
          birthDate: birthDate.toISOString(),
          weight: record.weight
        });

        const ageInWeeks = this.whoService.calculateAgeInWeeks(birthDate, record.date);
        const percentile = this.whoService.calculatePercentile(ageInWeeks, record.weight, this.babyGender);
        
        return {
          ageInWeeks,
          value: record.weight,
          percentile,
          date: record.date
        };
      });

      const sortedPoints = growthPoints.sort((a, b) => a.ageInWeeks - b.ageInWeeks);
      console.log('Converted growth points:', sortedPoints);
      
      return sortedPoints;
    } catch (error) {
      console.error('Error converting weight records to growth points:', error);
      return [];
    }
  }

  private updatePercentileInfo(growthPoints: BabyGrowthPoint[]) {
    if (growthPoints.length > 0) {
      const latestPoint = growthPoints[growthPoints.length - 1];
      this.currentPercentile = latestPoint.percentile || 50;
      this.percentileInterpretation = this.whoService.getPercentileInterpretation(this.currentPercentile);
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

  /**
   * Normalize weight record format to handle both API and local formats
   */
  private normalizeWeightRecord(record: any): { date: Date; weight: number } | null {
    try {
      // Handle date field - API uses 'record_date', local uses 'date'
      const dateValue = record.record_date || record.date;
      if (!dateValue) {
        console.warn('No date found in record:', record);
        return null;
      }
      
      // Handle weight field - API uses string, local uses number
      const weightValue = typeof record.weight === 'string' ? parseFloat(record.weight) : record.weight;
      if (!weightValue || isNaN(weightValue) || weightValue <= 0) {
        console.warn('Invalid weight in record:', record);
        return null;
      }

      return {
        date: new Date(dateValue),
        weight: weightValue
      };
    } catch (error) {
      console.warn('Error normalizing weight record:', record, error);
      return null;
    }
  }
}