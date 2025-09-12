import { Injectable } from '@angular/core';
import { WHOPercentileData, WHOGrowthChart, BabyGrowthPoint, GrowthChartConfig } from '../models/who-growth-data.model';

@Injectable({
  providedIn: 'root'
})
export class WHOGrowthChartService {
  
  // WHO Weight-for-age data for boys (0-24 months) in kg
  // Based on WHO Child Growth Standards 2006 - Official CDC/WHO CSV Data
  private readonly boysWeightData: WHOPercentileData[] = [
    { ageInWeeks: 0, month: 0, L: 0.3487, M: 3.3464, S: 0.14602, p2: 2.459312, p5: 2.603994, p10: 2.757621, p25: 3.027282, p50: 3.3464, p75: 3.686659, p90: 4.011499, p95: 4.214527, p98: 4.419354 },
    { ageInWeeks: 4.33, month: 1, L: 0.2297, M: 4.4709, S: 0.13395, p2: 3.39089, p5: 3.566165, p10: 3.752603, p25: 4.080792, p50: 4.4709, p75: 4.889123, p90: 5.290726, p95: 5.542933, p98: 5.798331 },
    { ageInWeeks: 8.67, month: 2, L: 0.197, M: 5.5675, S: 0.12385, p2: 4.31889, p5: 4.522344, p10: 4.738362, p25: 5.117754, p50: 5.5675, p75: 6.048448, p90: 6.509323, p95: 6.798348, p98: 7.090758 },
    { ageInWeeks: 13, month: 3, L: 0.1738, M: 6.3762, S: 0.11727, p2: 5.018434, p5: 5.240269, p10: 5.475519, p25: 5.888058, p50: 6.3762, p75: 6.897306, p90: 7.395936, p95: 7.708329, p98: 8.024169 },
    { ageInWeeks: 17.33, month: 4, L: 0.1553, M: 7.0023, S: 0.11316, p2: 5.561377, p5: 5.797135, p10: 6.046988, p25: 6.484777, p50: 7.0023, p75: 7.554286, p90: 8.082087, p95: 8.412602, p98: 8.746662 },
    { ageInWeeks: 21.67, month: 5, L: 0.1395, M: 7.5105, S: 0.1108, p2: 5.996672, p5: 6.244465, p10: 6.507016, p25: 6.966941, p50: 7.5105, p75: 8.090161, p90: 8.644384, p95: 8.991445, p98: 9.342238 },
    { ageInWeeks: 26, month: 6, L: 0.1257, M: 7.934, S: 0.10958, p2: 6.352967, p5: 6.611702, p10: 6.885864, p25: 7.366195, p50: 7.934, p75: 8.539707, p90: 9.119041, p95: 9.481939, p98: 9.848832 },
    { ageInWeeks: 30.33, month: 7, L: 0.1134, M: 8.297, S: 0.10902, p2: 6.653301, p5: 6.922131, p10: 7.207057, p25: 7.706413, p50: 8.297, p75: 8.927371, p90: 9.530656, p95: 9.908738, p98: 10.29113 },
    { ageInWeeks: 34.67, month: 8, L: 0.1021, M: 8.6151, S: 0.10882, p2: 6.913126, p5: 7.19127, p10: 7.486158, p25: 8.003205, p50: 8.6151, p75: 9.268678, p90: 9.894622, p95: 10.28713, p98: 10.68428 },
    { ageInWeeks: 39, month: 9, L: 0.0917, M: 8.9014, S: 0.10881, p2: 7.144822, p5: 7.431644, p10: 7.735837, p25: 8.26946, p50: 8.9014, p75: 9.5769, p90: 10.22433, p95: 10.63055, p98: 11.04177 },
    { ageInWeeks: 43.33, month: 10, L: 0.082, M: 9.1649, S: 0.10891, p2: 7.356558, p5: 7.651572, p10: 7.964565, p25: 8.5139, p50: 9.1649, p75: 9.861313, p90: 10.5293, p95: 10.94868, p98: 11.37341 },
    { ageInWeeks: 47.67, month: 11, L: 0.073, M: 9.4122, S: 0.10906, p2: 7.55441, p5: 7.857229, p10: 8.178615, p25: 8.742959, p50: 9.4122, p75: 10.12867, p90: 10.81641, p95: 11.24845, p98: 11.6862 },
    { ageInWeeks: 52, month: 12, L: 0.0644, M: 9.6479, S: 0.10925, p2: 7.742219, p5: 8.052577, p10: 8.382077, p25: 8.960956, p50: 9.6479, p75: 10.38387, p90: 11.09087, p95: 11.53526, p98: 11.98574 },
    { ageInWeeks: 56.33, month: 13, L: 0.0563, M: 9.8749, S: 0.10949, p2: 7.922091, p5: 8.239848, p10: 8.577324, p25: 9.170505, p50: 9.8749, p75: 10.63014, p90: 11.35618, p95: 11.81281, p98: 12.27589 },
    { ageInWeeks: 60.67, month: 14, L: 0.0487, M: 10.0953, S: 0.10976, p2: 8.095984, p5: 8.421033, p10: 8.76637, p25: 9.373665, p50: 10.0953, p75: 10.86959, p90: 11.61449, p95: 12.08325, p98: 12.55884 },
    { ageInWeeks: 65, month: 15, L: 0.0413, M: 10.3108, S: 0.11007, p2: 8.265127, p5: 8.597424, p10: 8.950586, p25: 9.571948, p50: 10.3108, p75: 11.10416, p90: 11.86797, p95: 12.34891, p98: 12.83707 },
    { ageInWeeks: 69.33, month: 16, L: 0.0343, M: 10.5228, S: 0.11041, p2: 8.430734, p5: 8.770274, p10: 9.13126, p25: 9.7667, p50: 10.5228, p75: 11.33528, p90: 12.11808, p95: 12.61125, p98: 13.11206 },
    { ageInWeeks: 73.67, month: 17, L: 0.0275, M: 10.7319, S: 0.11079, p2: 8.593128, p5: 8.939942, p10: 9.308795, p25: 9.958406, p50: 10.7319, p75: 11.5637, p90: 12.36571, p95: 12.87128, p98: 13.38491 },
    { ageInWeeks: 78, month: 18, L: 0.0211, M: 10.9385, S: 0.11119, p2: 8.752902, p5: 9.107002, p10: 9.483736, p25: 10.14755, p50: 10.9385, p75: 11.7897, p90: 12.61101, p95: 13.12906, p98: 13.65558 },
    { ageInWeeks: 82.33, month: 19, L: 0.0148, M: 11.143, S: 0.11164, p2: 8.909889, p5: 9.27136, p10: 9.656076, p25: 10.33431, p50: 11.143, p75: 12.01396, p90: 12.855, p95: 13.38579, p98: 13.92552 },
    { ageInWeeks: 86.67, month: 20, L: 0.0087, M: 11.3462, S: 0.11211, p2: 9.065209, p5: 9.434095, p10: 9.826848, p25: 10.51961, p50: 11.3462, p75: 12.23713, p90: 13.09811, p95: 13.64181, p98: 14.19492 },
    { ageInWeeks: 91, month: 21, L: 0.0029, M: 11.5486, S: 0.11261, p2: 9.219037, p5: 9.595435, p10: 9.996335, p25: 10.70383, p50: 11.5486, p75: 12.45983, p90: 13.3411, p95: 13.89795, p98: 14.46469 },
    { ageInWeeks: 95.33, month: 22, L: -0.0028, M: 11.7504, S: 0.11314, p2: 9.371554, p5: 9.755556, p10: 10.16471, p25: 10.88716, p50: 11.7504, p75: 12.6823, p90: 13.58426, p95: 14.15453, p98: 14.7352 },
    { ageInWeeks: 99.67, month: 23, L: -0.0083, M: 11.9514, S: 0.11369, p2: 9.522741, p5: 9.914417, p10: 10.33191, p25: 11.06946, p50: 11.9514, p75: 12.90424, p90: 13.82718, p95: 14.41108, p98: 15.0059 },
    { ageInWeeks: 104, month: 24, L: -0.0137, M: 12.1515, S: 0.11426, p2: 9.672527, p5: 10.07194, p10: 10.49784, p25: 11.25065, p50: 12.1515, p75: 13.12555, p90: 14.06979, p95: 14.66753, p98: 15.27674 }
  ];

  // WHO Weight-for-age data for girls (0-24 months) in kg  
  // Based on WHO Child Growth Standards 2006 - Official CDC/WHO CSV Data
  private readonly girlsWeightData: WHOPercentileData[] = [
    { ageInWeeks: 0, month: 0, L: 0.3809, M: 3.2322, S: 0.14171, p2: 2.394672, p5: 2.532145, p10: 2.677725, p25: 2.932331, p50: 3.2322, p75: 3.55035, p90: 3.852667, p95: 4.040959, p98: 4.23043022 },
    { ageInWeeks: 4.33, month: 1, L: 0.1714, M: 4.1873, S: 0.13724, p2: 3.161067, p5: 3.326209, p10: 3.502477, p25: 3.814261, p50: 4.1873, p75: 4.590075, p90: 4.979539, p95: 5.225436, p98: 5.4754539 },
    { ageInWeeks: 8.67, month: 2, L: 0.0962, M: 5.1282, S: 0.13, p2: 3.941053, p5: 4.13172, p10: 4.335355, p25: 4.695944, p50: 5.1282, p75: 5.596104, p90: 6.049862, p95: 6.337067, p98: 6.62967897 },
    { ageInWeeks: 13, month: 3, L: 0.0402, M: 5.8458, S: 0.12619, p2: 4.53604, p5: 4.745935, p10: 4.970282, p25: 5.368044, p50: 5.8458, p75: 6.364222, p90: 6.868317, p95: 7.188096, p98: 7.51447955 },
    { ageInWeeks: 17.33, month: 4, L: -0.005, M: 6.4237, S: 0.12402, p2: 5.013368, p5: 5.238858, p10: 5.480078, p25: 5.90832, p50: 6.4237, p75: 6.984281, p90: 7.530756, p95: 7.87815, p98: 8.23331075 },
    { ageInWeeks: 21.67, month: 5, L: -0.043, M: 6.8985, S: 0.12274, p2: 5.403844, p5: 5.642267, p10: 5.897544, p25: 6.351329, p50: 6.8985, p75: 7.495018, p90: 8.077933, p95: 8.449225, p98: 8.82941522 },
    { ageInWeeks: 26, month: 6, L: -0.0756, M: 7.297, S: 0.12204, p2: 5.729383, p5: 5.97888, p10: 6.246243, p25: 6.72212, p50: 7.297, p75: 7.925102, p90: 8.540297, p95: 8.93289, p98: 9.33549062 },
    { ageInWeeks: 30.33, month: 7, L: -0.1039, M: 7.6422, S: 0.12178, p2: 6.008387, p5: 6.267836, p10: 6.546104, p25: 7.042017, p50: 7.6422, p75: 8.299352, p90: 8.94444, p95: 9.356859, p98: 9.78039888 },
    { ageInWeeks: 34.67, month: 8, L: -0.1288, M: 7.9487, S: 0.12181, p2: 6.253445, p5: 6.522061, p10: 6.810403, p25: 7.324907, p50: 7.9487, p75: 8.633118, p90: 9.306424, p95: 9.737639, p98: 10.1810939 },
    { ageInWeeks: 39, month: 9, L: -0.1507, M: 8.2254, S: 0.12199, p2: 6.472906, p5: 6.750018, p10: 7.047717, p25: 7.579535, p50: 8.2254, p75: 8.935413, p90: 9.63531, p95: 10.08429, p98: 10.5466186 },
    { ageInWeeks: 43.33, month: 10, L: -0.17, M: 8.48, S: 0.12223, p2: 6.673828, p5: 6.958886, p10: 7.265345, p25: 7.813398, p50: 8.48, p75: 9.214115, p90: 9.939115, p95: 10.4049, p98: 10.8851054 },
    { ageInWeeks: 47.67, month: 11, L: -0.1872, M: 8.7192, S: 0.12247, p2: 6.862262, p5: 7.15483, p10: 7.46957, p25: 8.032975, p50: 8.7192, p75: 9.476145, p90: 10.22495, p95: 10.7067, p98: 11.2038881 },
    { ageInWeeks: 52, month: 12, L: -0.2024, M: 8.9481, S: 0.12268, p2: 7.042612, p5: 7.342376, p10: 7.665043, p25: 8.24313, p50: 8.9481, p75: 9.726833, p90: 10.49835, p95: 10.99531, p98: 11.5086985 },
    { ageInWeeks: 56.33, month: 13, L: -0.2158, M: 9.1699, S: 0.12283, p2: 7.217847, p5: 7.524538, p10: 7.854825, p25: 8.446994, p50: 9.1699, p75: 9.969431, p90: 10.76258, p95: 11.27401, p98: 11.8028109 },
    { ageInWeeks: 60.67, month: 14, L: -0.2278, M: 9.387, S: 0.12294, p2: 7.389684, p5: 7.70313, p10: 8.040838, p25: 8.646697, p50: 9.387, p75: 10.20666, p90: 11.02071, p95: 11.54612, p98: 12.0897773 },
    { ageInWeeks: 65, month: 15, L: -0.2384, M: 9.6008, S: 0.12299, p2: 7.559527, p5: 7.879566, p10: 8.224501, p25: 8.843658, p50: 9.6008, p75: 10.43988, p90: 11.27403, p95: 11.81285, p98: 12.3707367 },
    { ageInWeeks: 69.33, month: 16, L: -0.2478, M: 9.8124, S: 0.12303, p2: 7.727588, p5: 8.054179, p10: 8.406286, p25: 9.038616, p50: 9.8124, p75: 10.67062, p90: 11.52454, p95: 12.07652, p98: 12.6483665 },
    { ageInWeeks: 73.67, month: 17, L: -0.2562, M: 10.0226, S: 0.12306, p2: 7.894535, p5: 8.227652, p10: 8.586898, p25: 9.232317, p50: 10.0226, p75: 10.89976, p90: 11.77319, p95: 12.33814, p98: 12.9237235 },
    { ageInWeeks: 78, month: 18, L: -0.2637, M: 10.2315, S: 0.12309, p2: 8.060311, p5: 8.399952, p10: 8.766325, p25: 9.424795, p50: 10.2315, p75: 11.12747, p90: 12.02024, p95: 12.59804, p98: 13.1972107 },
    { ageInWeeks: 82.33, month: 19, L: -0.2703, M: 10.4393, S: 0.12315, p2: 8.224599, p5: 8.570832, p10: 8.944403, p25: 9.616043, p50: 10.4393, p75: 11.3542, p90: 12.26642, p95: 12.85712, p98: 13.4699234 },
    { ageInWeeks: 86.67, month: 20, L: -0.2762, M: 10.6464, S: 0.12323, p2: 8.387882, p5: 8.74076, p10: 9.121584, p25: 9.806487, p50: 10.6464, p75: 11.58033, p90: 12.51209, p95: 13.11573, p98: 13.7422028 },
    { ageInWeeks: 91, month: 21, L: -0.2815, M: 10.8534, S: 0.12335, p2: 8.55031, p5: 8.909946, p10: 9.298148, p25: 9.996544, p50: 10.8534, p75: 11.80669, p90: 12.75831, p95: 13.37511, p98: 14.0154884 },
    { ageInWeeks: 95.33, month: 22, L: -0.2862, M: 11.0608, S: 0.1235, p2: 8.712397, p5: 9.078906, p10: 9.474611, p25: 10.18672, p50: 11.0608, p75: 12.03376, p90: 13.00554, p95: 13.6357, p98: 14.2901756 },
    { ageInWeeks: 99.67, month: 23, L: -0.2903, M: 11.2688, S: 0.12369, p2: 8.8741, p5: 9.247632, p10: 9.651002, p25: 10.37713, p50: 11.2688, p75: 12.26184, p90: 13.25422, p95: 13.89801, p98: 14.5668755 },
    { ageInWeeks: 104, month: 24, L: -0.2941, M: 11.4775, S: 0.1239, p2: 9.035869, p5: 9.416516, p10: 9.827655, p25: 10.56799, p50: 11.4775, p75: 12.49092, p90: 13.50419, p95: 14.16181, p98: 14.8452857 }
  ];

  private readonly chartConfig: GrowthChartConfig = {
    showPercentiles: [3, 10, 25, 50, 75, 90, 97],
    highlightPercentiles: [10, 50, 90],
    normalRange: [10, 90],
    concernRange: [2, 98]
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
      month: lowerPoint.month + (upperPoint.month - lowerPoint.month) * ageRatio,
      L: lowerPoint.L + (upperPoint.L - lowerPoint.L) * ageRatio,
      M: lowerPoint.M + (upperPoint.M - lowerPoint.M) * ageRatio,
      S: lowerPoint.S + (upperPoint.S - lowerPoint.S) * ageRatio,
      p2: lowerPoint.p2 + (upperPoint.p2 - lowerPoint.p2) * ageRatio,
      p5: lowerPoint.p5 + (upperPoint.p5 - lowerPoint.p5) * ageRatio,
      p10: lowerPoint.p10 + (upperPoint.p10 - lowerPoint.p10) * ageRatio,
      p25: lowerPoint.p25 + (upperPoint.p25 - lowerPoint.p25) * ageRatio,
      p50: lowerPoint.p50 + (upperPoint.p50 - lowerPoint.p50) * ageRatio,
      p75: lowerPoint.p75 + (upperPoint.p75 - lowerPoint.p75) * ageRatio,
      p90: lowerPoint.p90 + (upperPoint.p90 - lowerPoint.p90) * ageRatio,
      p95: lowerPoint.p95 + (upperPoint.p95 - lowerPoint.p95) * ageRatio,
      p98: lowerPoint.p98 + (upperPoint.p98 - lowerPoint.p98) * ageRatio
    };

    return this.findPercentileForWeight(interpolatedData, weight);
  }

  private findPercentileForWeight(data: WHOPercentileData, weight: number): number {
    if (weight <= data.p2) return 2;
    if (weight <= data.p5) return this.interpolatePercentile(weight, data.p2, data.p5, 2, 5);
    if (weight <= data.p10) return this.interpolatePercentile(weight, data.p5, data.p10, 5, 10);
    if (weight <= data.p25) return this.interpolatePercentile(weight, data.p10, data.p25, 10, 25);
    if (weight <= data.p50) return this.interpolatePercentile(weight, data.p25, data.p50, 25, 50);
    if (weight <= data.p75) return this.interpolatePercentile(weight, data.p50, data.p75, 50, 75);
    if (weight <= data.p90) return this.interpolatePercentile(weight, data.p75, data.p90, 75, 90);
    if (weight <= data.p95) return this.interpolatePercentile(weight, data.p90, data.p95, 90, 95);
    if (weight <= data.p98) return this.interpolatePercentile(weight, data.p95, data.p98, 95, 98);
    return 98;
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
      case 2: return '#dc2626';   // Dark red - serious concern
      case 3: return '#ef4444';   // Red - concern
      case 5: return '#f97316';   // Orange
      case 10: return '#f59e0b';  // Amber
      case 25: return '#84cc16';  // Light green
      case 50: return '#10b981';  // Green - median
      case 75: return '#06b6d4';  // Cyan
      case 90: return '#3b82f6';  // Blue
      case 95: return '#8b5cf6';  // Purple
      case 97: return '#ec4899';  // Pink - concern
      case 98: return '#be185d';  // Dark pink - serious concern
      default: return '#6b7280'; // Gray
    }
  }

  getPercentileInterpretation(percentile: number): { status: string; message: string; color: string } {
    if (percentile < 2) {
      return {
        status: 'Severely Underweight',
        message: 'Below 2nd percentile. Immediate pediatric consultation needed.',
        color: '#dc2626'
      };
    } else if (percentile < 3) {
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
    } else if (percentile <= 98) {
      return {
        status: 'Very High Weight',
        message: 'Above 97th percentile. Consult your pediatrician.',
        color: '#ef4444'
      };
    } else {
      return {
        status: 'Extremely High Weight',
        message: 'Above 98th percentile. Immediate pediatric consultation needed.',
        color: '#be185d'
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

  getWHOPercentileCategory(percentile: number): 'low' | 'normal' | 'high' | 'very-low' | 'very-high' | 'extremely-low' | 'extremely-high' {
    if (percentile < 2) return 'extremely-low';
    if (percentile < 3) return 'very-low';
    if (percentile < 10) return 'low';
    if (percentile <= 90) return 'normal';
    if (percentile <= 97) return 'high';
    if (percentile <= 98) return 'very-high';
    return 'extremely-high';
  }
}