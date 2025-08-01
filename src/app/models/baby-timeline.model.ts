export interface BabyTimelineItem {
  id: string;
  weekStart: number;
  weekEnd: number;
  title: string;
  shortTitle?: string;
  description: string;
  category: 'feeding' | 'development' | 'sleep' | 'health' | 'milestone';
  icon: string;
  color: string;
  isCompleted?: boolean;
  completedAt?: Date;
  tips?: string[];
  whatToExpect?: string[];
  whenToWorry?: string[];
  whatToExpected?: string[];
  videoLinks?: VideoLink[];
  cdcMilestones?: CDCMilestone[];
}

export interface VideoLink {
  title: string;
  url: string;
  description: string;
  thumbnail?: string;
  category: 'social' | 'language' | 'cognitive' | 'movement';
}

export interface CDCMilestone {
  category: 'social-emotional' | 'language-communication' | 'cognitive' | 'movement-physical';
  milestone: string;
  ageInMonths: number;
  description?: string;
}

export interface BabyTimelineData {
  currentWeek: number;
  items: BabyTimelineItem[];
  upcomingMilestones: BabyTimelineItem[];
  recentlyCompleted: BabyTimelineItem[];
  allWeeks: BabyTimelineItem[];
}