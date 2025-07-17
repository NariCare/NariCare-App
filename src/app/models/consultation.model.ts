export interface Consultation {
  id: string;
  userId: string;
  expertId: string;
  type: 'scheduled' | 'on-demand';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  scheduledAt: Date;
  duration: number;
  topic: string;
  notes?: string;
  followUpRequired: boolean;
  meetingLink?: string;
  reminderSent: boolean;
}

export interface Expert {
  id: string;
  name: string;
  credentials: string;
  specialties: string[];
  bio: string;
  profileImage?: string;
  rating: number;
  totalConsultations: number;
  availability: AvailabilitySlot[];
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}