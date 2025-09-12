export interface WHOPercentileData {
  ageInWeeks: number;
  month: number;    // Age in months for reference
  L: number;        // L parameter from WHO LMS method
  M: number;        // M parameter (median) from WHO LMS method  
  S: number;        // S parameter from WHO LMS method
  p2: number;       // 2nd percentile (actually 2.3rd from CSV)
  p5: number;       // 5th percentile
  p10: number;      // 10th percentile
  p25: number;      // 25th percentile
  p50: number;      // 50th percentile (median)
  p75: number;      // 75th percentile
  p90: number;      // 90th percentile
  p95: number;      // 95th percentile
  p98: number;      // 98th percentile (actually 97.7th from CSV)
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