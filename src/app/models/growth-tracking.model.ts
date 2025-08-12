export interface GrowthRecord {
  id: string;
  babyId: string;
  recordedBy: string;
  record_date: Date;
  
  // New Feed Type fields
  feed_types: ('direct' | 'expressed' | 'formula')[];
  
  // Direct Feeding specific fields
  direct_feeding_start_time?: string; // HH:MM format
  direct_feeding_end_time?: string; // HH:MM format
  breast_side?: 'left' | 'right' | 'both';
  duration_minutes?: number; // Duration in minutes for direct feeding
  pain_level?: number; // 0-10 scale
  lipstick_shape?: 'rounded' | 'lipstick';
  mother_mood?: MotherMood;

  // Expressed Milk specific fields
  ebm_quantity_ml?: number;
  
  // Formula specific fields
  formula_quantity_ml?: number;

  pumpingSessions?: number;
  totalPumpingOutput?: number;
  formulaIntake?: number;
  peeCount?: number;
  poopCount?: number;
  moodDescription?: string;
  // Emotional state
  notes?: string;
  // Voice entry flag
  enteredViaVoice?: boolean;
  // Tracking metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceInputData {
  transcript: string;
  extractedData: any;
  isProcessing: boolean;
  confidence: number;
}

export interface FeedTypeOption {
  value: 'direct' | 'expressed' | 'formula';
  label: string;
  icon: string;
}

export interface QuantityPreset {
  value: number;
  label: string;
}

export interface BreastSide {
  value: 'left' | 'right' | 'both';
  label: string;
  icon: string;
}

export interface SupplementType {
  value: 'breastmilk' | 'formula';
  value: 'rounded' | 'lipstick';
  label: string;
  icon: string;
}

export interface MotherMood {
  value: 'relaxed' | 'happy' | 'sad' | 'exhausted' | 'anxious';
  label: string;
  emoji: string;
  color: string;
}
export interface WeightRecord {
  id: string;
  babyId: string;
  recordedBy: string;
  date: Date;
  weight: number; // in kg
  height?: number; // in cm
  notes?: string;
  reminderSent?: boolean;
  enteredViaVoice?: boolean;
  createdAt: Date;
}

export interface StoolRecord {
  id: string;
  babyId: string;
  recordedBy: string;
  date: Date;
  time: string; // HH:MM format
  color: StoolColor;
  texture: StoolTexture;
  size: StoolSize;
  peeCount?: number; // Number of wet diapers in 24 hours
  poopCount?: number; // Number of dirty diapers in 24 hours
  notes?: string;
  enteredViaVoice?: boolean;
  createdAt: Date;
}

export interface StoolColor {
  value: 'very-dark' | 'dark-green' | 'dark-brown' | 'mustard-yellow' | 'other';
  label: string;
  color: string;
}

export interface StoolTexture {
  value: 'liquid' | 'pasty' | 'hard' | 'snotty' | 'bloody';
  label: string;
  icon: string;
}

export interface StoolSize {
  value: 'coin' | 'tablespoon' | 'bigger';
  label: string;
  icon: string;
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