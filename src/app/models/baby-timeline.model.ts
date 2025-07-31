export interface BabyTimelineItem {
  id: string;
  weekStart: number;
  weekEnd: number;
  title: string;
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
}

export interface BabyTimelineData {
  currentWeek: number;
  items: BabyTimelineItem[];
  upcomingMilestones: BabyTimelineItem[];
  recentlyCompleted: BabyTimelineItem[];
}