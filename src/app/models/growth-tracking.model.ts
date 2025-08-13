export interface GrowthRecord {
  id: string;
  babyId: string;
  recordedBy: string;
  date: Date;
  // Feed tracking - new structure
  feedTypes: ('direct' | 'expressed' | 'formula')[];
  directFeedDetails?: {
    startTime: string; // HH:MM format
    breastSide: 'left' | 'right' | 'both';
    duration: number; // in minutes
    painLevel?: number; // 0-4 scale (emoji based)
  };
  expressedMilkDetails?: {
    quantity: number; // in ml
  };
  formulaDetails?: {
    quantity: number; // in ml
  };
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

export interface BreastSide {
  value: 'left' | 'right' | 'both';
  label: string;
  icon: string;
}

export interface SupplementType {
  value: 'breastmilk' | 'formula';
  label: string;
  icon: string;
}

export interface LipstickShape {
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

export interface FeedType {
  value: 'direct' | 'expressed' | 'formula';
  label: string;
  icon: string;
  description: string;
}

export interface PainLevel {
  value: number;
  emoji: string;
  label: string;
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