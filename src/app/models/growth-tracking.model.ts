export interface GrowthRecord {
  id: string;
  babyId: string;
  recordedBy: string;
  date: Date;
  // Daily feeding tracking
  directFeedingSessions: number;
  avgFeedingDuration: number; // in minutes
  pumpingSessions: number;
  totalPumpingOutput: number; // in ml
  formulaIntake: number; // in ml
  peeCount: number;
  poopCount: number;
  // Emotional state
  mood?: MoodType;
  moodDescription?: string;
  notes?: string;
  // Voice entry flag
  enteredViaVoice?: boolean;
  // Tracking metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface WeightRecord {
  id: string;
  babyId: string;
  recordedBy: string;
  date: Date;
  weight: number; // in kg
  notes?: string;
  reminderSent?: boolean;
  createdAt: Date;
}

export interface MoodType {
  emoji: string;
  label: string;
  value: 'great' | 'good' | 'okay' | 'tired' | 'worried' | 'overwhelmed';
  color: string;
}

export interface StarPerformer {
  userId: string;
  userName: string;
  weekStartDate: Date;
  weekEndDate: Date;
  consistencyScore: number;
  rank: number;
  isEliteCandidate: boolean;
  consecutiveWeeks: number;
}

export interface QuickLogSuggestion {
  id: string;
  userId: string;
  suggestedAction: 'feeding' | 'pumping' | 'weight';
  lastLoggedTime: Date;
  suggestedTime: Date;
  message: string;
  isActive: boolean;
  createdAt: Date;
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