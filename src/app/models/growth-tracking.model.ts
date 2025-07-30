export interface GrowthRecord {
  id: string;
  babyId: string;
  recordedBy: string;
  date: Date;
  weight: number;
  height: number;
  headCircumference?: number;
  feedingFrequency: number;
  sleepHours: number;
  diaperChanges: number;
  notes?: string;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  achievedAt: Date;
  category: 'physical' | 'cognitive' | 'social' | 'feeding';
}

export interface GrowthChart {
  babyId: string;
  chartType: 'weight' | 'height' | 'head-circumference';
  data: ChartDataPoint[];
  percentile: number;
  lastUpdated: Date;
}

export interface ChartDataPoint {
  date: Date;
  value: number;
  percentile?: number;
}