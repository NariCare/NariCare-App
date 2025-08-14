export interface EmotionCheckinRecord {
  id: string;
  userId: string;
  date: Date;
  time: string; // HH:MM format
  
  // Emotional struggles (multi-select)
  selectedStruggles: EmotionalStruggle[];
  
  // Positive moments (multi-select)
  selectedPositiveMoments: PositiveMoment[];
  
  // Concerning thoughts (multi-select)
  selectedConcerningThoughts: ConcerningThought[];
  
  // Journaling prompts
  gratefulFor?: string;
  proudOfToday?: string;
  tomorrowGoal?: string;
  
  // Additional notes
  additionalNotes?: string;
  
  // Metadata
  enteredViaVoice?: boolean;
  createdAt: Date;
}

export interface EmotionalStruggle {
  id: string;
  text: string;
  emoji: string;
  category: 'physical' | 'emotional' | 'social' | 'practical';
}

export interface PositiveMoment {
  id: string;
  text: string;
  emoji: string;
  category: 'bonding' | 'achievement' | 'support' | 'personal';
}

export interface ConcerningThought {
  id: string;
  text: string;
  emoji: string;
  severity: 'moderate' | 'high' | 'critical';
}

export interface EmotionCheckinSummary {
  totalCheckins: number;
  lastCheckinDate?: Date;
  strugglesFrequency: { [key: string]: number };
  positiveMomentsFrequency: { [key: string]: number };
  concerningThoughtsCount: number;
  averageMoodTrend: 'improving' | 'stable' | 'declining';
}