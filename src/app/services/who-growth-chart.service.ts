import { Injectable } from '@angular/core';
import { WHOPercentileData, WHOGrowthChart, BabyGrowthPoint, GrowthChartConfig } from '../models/who-growth-data.model';

@Injectable({
  providedIn: 'root'
})
export class WHOGrowthChartService {
  
  // WHO Weight-for-age data for boys (0-24 months) in kg
  // Based on WHO Child Growth Standards 2006
  private readonly boysWeightData: WHOPercentileData[] = [
    { ageInWeeks: 0, p3: 2.5, p5: 2.6, p10: 2.8, p25: 3.0, p50: 3.3, p75: 3.6, p90: 3.9, p95: 4.1, p97: 4.3 },
    { ageInWeeks: 1, p3: 2.9, p5: 3.1, p10: 3.3, p25: 3.6, p50: 3.9, p75: 4.3, p90: 4.7, p95: 5.0, p97: 5.2 },
    { ageInWeeks: 2, p3: 3.4, p5: 3.6, p10: 3.9, p25: 4.3, p50: 4.7, p75: 5.1, p90: 5.6, p95: 5.9, p97: 6.2 },
    { ageInWeeks: 4, p3: 4.2, p5: 4.4, p10: 4.7, p25: 5.1, p50: 5.6, p75: 6.2, p90: 6.8, p95: 7.2, p97: 7.5 },
    { ageInWeeks: 6, p3: 4.8, p5: 5.0, p10: 5.4, p25: 5.9, p50: 6.4, p75: 7.1, p90: 7.8, p95: 8.2, p97: 8.6 },
    { ageInWeeks: 8, p3: 5.3, p5: 5.6, p10: 6.0, p25: 6.5, p50: 7.1, p75: 7.8, p90: 8.6, p95: 9.1, p97: 9.5 },
    { ageInWeeks: 12, p3: 6.1, p5: 6.4, p10: 6.9, p25: 7.5, p50: 8.2, p75: 9.0, p90: 9.9, p95: 10.5, p97: 11.0 },
    { ageInWeeks: 16, p3: 6.7, p5: 7.0, p10: 7.5, p25: 8.2, p50: 9.0, p75: 9.9, p90: 10.9, p95: 11.5, p97: 12.1 },
    { ageInWeeks: 20, p3: 7.2, p5: 7.5, p10: 8.1, p25: 8.8, p50: 9.6, p75: 10.6, p90: 11.7, p95: 12.4, p97: 13.0 },
    { ageInWeeks: 24, p3: 7.6, p5: 8.0, p10: 8.5, p25: 9.3, p50: 10.2, p75: 11.3, p90: 12.4, p95: 13.2, p97: 13.9 },
    { ageInWeeks: 28, p3: 8.0, p5: 8.4, p10: 9.0, p25: 9.8, p50: 10.7, p75: 11.8, p90: 13.1, p95: 13.9, p97: 14.6 },
    { ageInWeeks: 32, p3: 8.4, p5: 8.8, p10: 9.4, p25: 10.2, p50: 11.2, p75: 12.4, p90: 13.7, p95: 14.6, p97: 15.3 },
    { ageInWeeks: 36, p3: 8.7, p5: 9.1, p10: 9.7, p25: 10.6, p50: 11.7, p75: 12.9, p90: 14.3, p95: 15.2, p97: 16.0 },
    { ageInWeeks: 40, p3: 9.0, p5: 9.4, p10: 10.1, p25: 11.0, p50: 12.1, p75: 13.4, p90: 14.8, p95: 15.8, p97: 16.6 },
    { ageInWeeks: 44, p3: 9.2, p5: 9.7, p10: 10.4, p25: 11.3, p50: 12.5, p75: 13.8, p90: 15.3, p95: 16.3, p97: 17.2 },
    { ageInWeeks: 48, p3: 9.5, p5: 10.0, p10: 10.7, p25: 11.6, p50: 12.8, p75: 14.2, p90: 15.7, p95: 16.8, p97: 17.7 },
    { ageInWeeks: 52, p3: 9.7, p5: 10.2, p10: 10.9, p25: 11.9, p50: 13.1, p75: 14.5, p90: 16.1, p95: 17.2, p97: 18.1 },
    { ageInWeeks: 60, p3: 10.2, p5: 10.7, p10: 11.5, p25: 12.5, p50: 13.8, p75: 15.3, p90: 17.0, p95: 18.2, p97: 19.2 },
    { ageInWeeks: 68, p3: 10.6, p5: 11.2, p10: 12.0, p25: 13.1, p50: 14.5, p75: 16.1, p90: 17.9, p95: 19.2, p97: 20.3 },
    { ageInWeeks: 76, p3: 11.0, p5: 11.6, p10: 12.5, p25: 13.6, p50: 15.1, p75: 16.8, p90: 18.7, p95: 20.1, p97: 21.2 },
    { ageInWeeks: 84, p3: 11.4, p5: 12.0, p10: 12.9, p25: 14.1, p50: 15.7, p75: 17.5, p90: 19.5, p95: 20.9, p97: 22.1 },
    { ageInWeeks: 92, p3: 11.7, p5: 12.4, p10: 13.3, p25: 14.6, p50: 16.2, p75: 18.1, p90: 20.2, p95: 21.7, p97: 22.9 },
    { ageInWeeks: 100, p3: 12.0, p5: 12.7, p10: 13.7, p25: 15.0, p50: 16.7, p75: 18.7, p90: 20.9, p95: 22.4, p97: 23.7 },
    { ageInWeeks: 104, p3: 12.1, p5: 12.9, p10: 13.9, p25: 15.2, p50: 17.0, p75: 19.0, p90: 21.3, p95: 22.9, p97: 24.2 }
  ];

  // WHO Weight-for-age data for girls (0-24 months) in kg
  // Based on WHO Child Growth Standards 2006
  private readonly girlsWeightData: WHOPercentileData[] = [
    { ageInWeeks: 0, p3: 2.4, p5: 2.5, p10: 2.7, p25: 2.9, p50: 3.2, p75: 3.5, p90: 3.8, p95: 4.0, p97: 4.2 },
    { ageInWeeks: 1, p3: 2.8, p5: 2.9, p10: 3.1, p25: 3.4, p50: 3.6, p75: 4.0, p90: 4.3, p95: 4.6, p97: 4.8 },
    { ageInWeeks: 2, p3: 3.2, p5: 3.4, p10: 3.6, p25: 3.9, p50: 4.2, p75: 4.6, p90: 5.0, p95: 5.3, p97: 5.5 },
    { ageInWeeks: 4, p3: 3.9, p5: 4.1, p10: 4.4, p25: 4.8, p50: 5.2, p75: 5.7, p90: 6.2, p95: 6.6, p97: 6.9 },
    { ageInWeeks: 6, p3: 4.5, p5: 4.7, p10: 5.0, p25: 5.5, p50: 6.0, p75: 6.6, p90: 7.2, p95: 7.6, p97: 8.0 },
    { ageInWeeks: 8, p3: 5.0, p5: 5.2, p10: 5.6, p25: 6.1, p50: 6.7, p75: 7.3, p90: 8.0, p95: 8.5, p97: 8.9 },
    { ageInWeeks: 12, p3: 5.8, p5: 6.1, p10: 6.5, p25: 7.1, p50: 7.8, p75: 8.5, p90: 9.3, p95: 9.9, p97: 10.4 },
    { ageInWeeks: 16, p3: 6.4, p5: 6.7, p10: 7.2, p25: 7.9, p50: 8.6, p75: 9.4, p90: 10.3, p95: 11.0, p97: 11.5 },
    { ageInWeeks: 20, p3: 6.9, p5: 7.3, p10: 7.8, p25: 8.5, p50: 9.3, p75: 10.2, p90: 11.2, p95: 11.9, p97: 12.5 },
    { ageInWeeks: 24, p3: 7.3, p5: 7.7, p10: 8.3, p25: 9.0, p50: 9.9, p75: 10.9, p90: 11.9, p95: 12.7, p97: 13.3 },
    { ageInWeeks: 28, p3: 7.7, p5: 8.1, p10: 8.7, p25: 9.5, p50: 10.4, p75: 11.5, p90: 12.6, p95: 13.4, p97: 14.1 },
    { ageInWeeks: 32, p3: 8.1, p5: 8.5, p10: 9.1, p25: 9.9, p50: 10.9, p75: 12.0, p90: 13.2, p95: 14.1, p97: 14.8 },
    { ageInWeeks: 36, p3: 8.4, p5: 8.8, p10: 9.5, p25: 10.3, p50: 11.4, p75: 12.5, p90: 13.8, p95: 14.7, p97: 15.5 },
    { ageInWeeks: 40, p3: 8.7, p5: 9.1, p10: 9.8, p25: 10.7, p50: 11.8, p75: 13.0, p90: 14.3, p95: 15.3, p97: 16.1 },
    { ageInWeeks: 44, p3: 8.9, p5: 9.4, p10: 10.1, p25: 11.0, p50: 12.2, p75: 13.4, p90: 14.8, p95: 15.8, p97: 16.6 },
    { ageInWeeks: 48, p3: 9.2, p5: 9.6, p10: 10.4, p25: 11.3, p50: 12.5, p75: 13.8, p90: 15.2, p95: 16.3, p97: 17.1 },
    { ageInWeeks: 52, p3: 9.4, p5: 9.9, p10: 10.6, p25: 11.6, p50: 12.8, p75: 14.2, p90: 15.6, p95: 16.7, p97: 17.6 },
    { ageInWeeks: 60, p3: 9.9, p5: 10.4, p10: 11.2, p25: 12.2, p50: 13.5, p75: 14.9, p90: 16.4, p95: 17.6, p97: 18.5 },
    { ageInWeeks: 68, p3: 10.3, p5: 10.9, p10: 11.7, p25: 12.8, p50: 14.1, p75: 15.6, p90: 17.2, p95: 18.4, p97: 19.4 },
    { ageInWeeks: 76, p3: 10.7, p5: 11.3, p10: 12.2, p25: 13.3, p50: 14.7, p75: 16.2, p90: 17.9, p95: 19.2, p97: 20.2 },
    { ageInWeeks: 84, p3: 11.1, p5: 11.7, p10: 12.6, p25: 13.8, p50: 15.2, p75: 16.8, p90: 18.6, p95: 19.9, p97: 21.0 },
    { ageInWeeks: 92, p3: 11.4, p5: 12.1, p10: 13.0, p25: 14.2, p50: 15.7, p75: 17.4, p90: 19.2, p95: 20.6, p97: 21.7 },
    { ageInWeeks: 100, p3: 11.7, p5: 12.4, p10: 13.4, p25: 14.6, p50: 16.2, p75: 17.9, p90: 19.8, p95: 21.2, p97: 22.4 },
    { ageInWeeks: 104, p3: 11.9, p5: 12.6, p10: 13.6, p25: 14.9, p50: 16.5, p75: 18.3, p90: 20.2, p95: 21.7, p97: 22.9 }
  ];

  private readonly chartConfig: GrowthChartConfig = {
    showPercentiles: [3, 10, 25, 50, 75, 90, 97],
    highlightPercentiles: [10, 50, 90],
    normalRange: [10, 90],
    concernRange: [3, 97]
  };

  constructor() {}

  getWeightChart(gender: 'male' | 'female'): WHOGrowthChart {
    return {
      gender,
      measurementType: 'weight',
      unit: 'kg',
      data: gender === 'male' ? this.boysWeightData : this.girlsWeightData
    };
  }

  calculatePercentile(ageInWeeks: number, weight: number, gender: 'male' | 'female'): number {
    const chartData = gender === 'male' ? this.boysWeightData : this.girlsWeightData;
    
    // Find the closest age data points
    const exactMatch = chartData.find(d => d.ageInWeeks === ageInWeeks);
    if (exactMatch) {
      return this.findPercentileForWeight(exactMatch, weight);
    }

    // Interpolate between two closest points
    const lowerPoint = chartData.filter(d => d.ageInWeeks <= ageInWeeks).pop();
    const upperPoint = chartData.find(d => d.ageInWeeks > ageInWeeks);

    if (!lowerPoint && !upperPoint) return 50; // Default to median
    if (!upperPoint) return this.findPercentileForWeight(lowerPoint!, weight);
    if (!lowerPoint) return this.findPercentileForWeight(upperPoint, weight);

    // Linear interpolation
    const ageDiff = upperPoint.ageInWeeks - lowerPoint.ageInWeeks;
    const ageRatio = (ageInWeeks - lowerPoint.ageInWeeks) / ageDiff;

    const interpolatedData: WHOPercentileData = {
      ageInWeeks,
      p3: lowerPoint.p3 + (upperPoint.p3 - lowerPoint.p3) * ageRatio,
      p5: lowerPoint.p5 + (upperPoint.p5 - lowerPoint.p5) * ageRatio,
      p10: lowerPoint.p10 + (upperPoint.p10 - lowerPoint.p10) * ageRatio,
      p25: lowerPoint.p25 + (upperPoint.p25 - lowerPoint.p25) * ageRatio,
      p50: lowerPoint.p50 + (upperPoint.p50 - lowerPoint.p50) * ageRatio,
      p75: lowerPoint.p75 + (upperPoint.p75 - lowerPoint.p75) * ageRatio,
      p90: lowerPoint.p90 + (upperPoint.p90 - lowerPoint.p90) * ageRatio,
      p95: lowerPoint.p95 + (upperPoint.p95 - lowerPoint.p95) * ageRatio,
      p97: lowerPoint.p97 + (upperPoint.p97 - lowerPoint.p97) * ageRatio
    };

    return this.findPercentileForWeight(interpolatedData, weight);
  }

  private findPercentileForWeight(data: WHOPercentileData, weight: number): number {
    if (weight <= data.p3) return 3;
    if (weight <= data.p5) return this.interpolatePercentile(weight, data.p3, data.p5, 3, 5);
    if (weight <= data.p10) return this.interpolatePercentile(weight, data.p5, data.p10, 5, 10);
    if (weight <= data.p25) return this.interpolatePercentile(weight, data.p10, data.p25, 10, 25);
    if (weight <= data.p50) return this.interpolatePercentile(weight, data.p25, data.p50, 25, 50);
    if (weight <= data.p75) return this.interpolatePercentile(weight, data.p50, data.p75, 50, 75);
    if (weight <= data.p90) return this.interpolatePercentile(weight, data.p75, data.p90, 75, 90);
    if (weight <= data.p95) return this.interpolatePercentile(weight, data.p90, data.p95, 90, 95);
    if (weight <= data.p97) return this.interpolatePercentile(weight, data.p95, data.p97, 95, 97);
    return 97;
  }

  private interpolatePercentile(weight: number, lowerWeight: number, upperWeight: number, lowerPercentile: number, upperPercentile: number): number {
    const ratio = (weight - lowerWeight) / (upperWeight - lowerWeight);
    return Math.round(lowerPercentile + (upperPercentile - lowerPercentile) * ratio);
  }

  generateChartData(babyGrowthPoints: BabyGrowthPoint[], gender: 'male' | 'female'): any {
    const chartData = gender === 'male' ? this.boysWeightData : this.girlsWeightData;
    
    console.log('Generating WHO chart data for', gender, 'with', babyGrowthPoints.length, 'data points');
    
    // Generate percentile curves
    const percentileCurves: Highcharts.SeriesOptionsType[] = this.chartConfig.showPercentiles.map(percentile => ({
      name: `${percentile}th percentile`,
      data: chartData.map(point => ({
        x: point.ageInWeeks,
        y: (point as any)[`p${percentile}`]
      })),
      type: 'line',
      color: this.getPercentileColor(percentile),
      lineWidth: this.chartConfig.highlightPercentiles.includes(percentile) ? 2 : 1,
      dashStyle: percentile === 50 ? 'Solid' : 'Dash',
      marker: { enabled: false },
      enableMouseTracking: true
    } as Highcharts.SeriesOptionsType));

    // Add baby's actual data points
    const babyDataSeries: Highcharts.SeriesOptionsType | null = babyGrowthPoints.length > 0 ? {
      name: 'Baby\'s Weight',
      data: babyGrowthPoints.map(point => ({
        x: point.ageInWeeks,
        y: point.value,
        percentile: point.percentile
      })),
      type: 'scatter',
      color: '#8383ed',
      marker: {
        radius: 6,
        fillColor: '#8383ed',
        lineColor: '#ffffff',
        lineWidth: 2
      },
      zIndex: 10
    } as Highcharts.SeriesOptionsType : null;

    const allSeries: Highcharts.SeriesOptionsType[] = [...percentileCurves];
    if (babyDataSeries) {
      allSeries.push(babyDataSeries);
    }

    return {
      chart: {
        type: 'line',
        height: 400,
        backgroundColor: '#ffffff',
        animation: false
      },
      title: {
        text: `WHO Weight Chart - ${gender === 'male' ? 'Boys' : 'Girls'}`,
        style: { 
          fontSize: '16px', 
          fontWeight: '600',
          color: '#2d3748'
        }
      },
      subtitle: {
        text: 'Based on WHO Child Growth Standards 2006',
        style: {
          fontSize: '12px',
          color: '#64748b'
        }
      },
      xAxis: {
        title: { text: 'Age (weeks)' },
        min: 0,
        max: Math.max(52, ...(babyGrowthPoints.length > 0 ? babyGrowthPoints.map(p => p.ageInWeeks) : [52])),
        gridLineWidth: 1,
        labels: {
          style: { color: '#64748b' }
        }
      },
      yAxis: {
        title: { text: 'Weight (kg)' },
        min: 2,
        max: Math.max(15, ...(babyGrowthPoints.length > 0 ? babyGrowthPoints.map(p => p.value) : [15])),
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
      series: allSeries,
      plotOptions: {
        line: {
          animation: false
        },
        scatter: {
          animation: false
        }
      },
      tooltip: {
        shared: false,
        formatter: function() {
          if ((this as any).series.name === 'Baby\'s Weight') {
            return `<b>Age:</b> ${(this as any).x} weeks<br/><b>Weight:</b> ${(this as any).y} kg<br/><b>Percentile:</b> ${(this as any).point.percentile}th`;
          }
          return `<b>${(this as any).series.name}</b><br/>Age: ${(this as any).x} weeks<br/>Weight: ${(this as any).y} kg`;
        }
      }
    };
  }

  private getPercentileColor(percentile: number): string {
    switch (percentile) {
      case 3: return '#ef4444';   // Red - concern
      case 5: return '#f97316';   // Orange
      case 10: return '#f59e0b';  // Amber
      case 25: return '#84cc16';  // Light green
      case 50: return '#10b981';  // Green - median
      case 75: return '#06b6d4';  // Cyan
      case 90: return '#3b82f6';  // Blue
      case 95: return '#8b5cf6';  // Purple
      case 97: return '#ec4899';  // Pink - concern
      default: return '#6b7280'; // Gray
    }
  }

  getPercentileInterpretation(percentile: number): { status: string; message: string; color: string } {
    if (percentile < 3) {
      return {
        status: 'Underweight',
        message: 'Below 3rd percentile. Consult your pediatrician.',
        color: '#ef4444'
      };
    } else if (percentile < 10) {
      return {
        status: 'Low Weight',
        message: 'Below 10th percentile. Monitor closely and discuss with doctor.',
        color: '#f97316'
      };
    } else if (percentile <= 90) {
      return {
        status: 'Normal Weight',
        message: 'Weight is within normal range for age.',
        color: '#10b981'
      };
    } else if (percentile <= 97) {
      return {
        status: 'High Weight',
        message: 'Above 90th percentile. Monitor growth pattern.',
        color: '#f59e0b'
      };
    } else {
      return {
        status: 'Very High Weight',
        message: 'Above 97th percentile. Consult your pediatrician.',
        color: '#ef4444'
      };
    }
  }

  calculateAgeInWeeks(birthDate: Date, measurementDate: Date): number {
    const diffTime = measurementDate.getTime() - birthDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  }

  getChartConfig(): GrowthChartConfig {
    return this.chartConfig;
  }

  // Helper method to get weight recommendations based on current percentile
  getWeightGuidance(currentPercentile: number, previousPercentile?: number): string {
    if (previousPercentile && Math.abs(currentPercentile - previousPercentile) > 25) {
      return 'Significant percentile change detected. Please discuss with your pediatrician.';
    }

    if (currentPercentile < 10) {
      return 'Focus on frequent feeding and monitor milk intake. Consider consulting a lactation specialist.';
    } else if (currentPercentile > 90) {
      return 'Baby is growing well. Continue current feeding pattern and monitor growth velocity.';
    } else {
      return 'Excellent growth! Continue your current feeding routine.';
    }
  }

  // WHO-specific guidance methods
  getWHOGuidance(percentile: number): string {
    if (percentile >= 85) {
      return 'Your baby is growing above the WHO standards - this is wonderful! Continue your excellent feeding routine.';
    } else if (percentile >= 50) {
      return 'Perfect growth according to WHO standards! Your baby is thriving beautifully.';
    } else if (percentile >= 15) {
      return 'Healthy growth within WHO normal range. Your baby is developing well at their own pace.';
    } else {
      return 'Growth is below WHO average. Consider discussing feeding patterns with your healthcare provider.';
    }
  }

  isWithinWHONormalRange(percentile: number): boolean {
    return percentile >= 10 && percentile <= 90;
  }

  getWHOPercentileCategory(percentile: number): 'low' | 'normal' | 'high' | 'very-low' | 'very-high' {
    if (percentile < 3) return 'very-low';
    if (percentile < 10) return 'low';
    if (percentile <= 90) return 'normal';
    if (percentile <= 97) return 'high';
    return 'very-high';
  }
}