export interface GrowthRecord {
  id: string;
  babyId: string;
  recordedBy: string;
  date: Date;
  weight?: number;
  height?: number;
  headCircumference?: number;
  // Breastfeeding tracking fields
  directFeedingSessions: number;
  avgFeedingDuration: number; // in minutes
  pumpingSessions: number;
  totalPumpingOutput: number; // in ml
  formulaIntake: number; // in ml
  peeCount: number;
  poopCount: number;
  // Emotional state
  emotionalState?: EmotionalState;
  notes?: string;
  milestones: Milestone[];
}

export interface EmotionalState {
  mood: 'great' | 'good' | 'okay' | 'tired' | 'worried' | 'overwhelmed';
  emoji: string;
  description?: string;
}

export interface WeightRecord {
  id: string;
  babyId: string;
  recordedBy: string;
  date: Date;
  weight: number;
  notes?: string;
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