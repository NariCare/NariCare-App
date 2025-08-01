export interface WHOPercentileData {
  ageInWeeks: number;
  p3: number;   // 3rd percentile
  p5: number;   // 5th percentile
  p10: number;  // 10th percentile
  p25: number;  // 25th percentile
  p50: number;  // 50th percentile (median)
  p75: number;  // 75th percentile
  p90: number;  // 90th percentile
  p95: number;  // 95th percentile
  p97: number;  // 97th percentile
}

export interface WHOGrowthChart {
  gender: 'male' | 'female';
  measurementType: 'weight' | 'length' | 'head-circumference';
  unit: 'kg' | 'cm';
  data: WHOPercentileData[];
}

export interface BabyGrowthPoint {
  ageInWeeks: number;
  value: number;
  percentile?: number;
  date: Date;
}

export interface GrowthChartConfig {
  showPercentiles: number[];
  highlightPercentiles: number[];
  normalRange: [number, number];
  concernRange: [number, number];
}