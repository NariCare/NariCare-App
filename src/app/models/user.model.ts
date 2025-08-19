export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  motherType?: 'pregnant' | 'new_mom';
  dueDate?: Date;
  profileImage?: string;
  role: 'user' | 'expert' | 'admin';
  tier: UserTier;
  createdAt: Date;
  isOnboardingCompleted: boolean;
  notificationPreferences: NotificationPreferences;
  babies: Baby[];
  socialProvider?: string;
}

export interface Baby {
  id: string;
  name: string;
  dateOfBirth: Date;
  gender: 'male' | 'female';
  birthWeight: number;
  birthHeight: number;
  currentWeight?: number;
  currentHeight?: number;
}

export interface UserTier {
  type: 'basic' | 'one-month' | 'three-month';
  startDate: Date;
  endDate?: Date;
  consultationsRemaining: number;
  features: string[];
}

export interface NotificationPreferences {
  articleUpdates: boolean;
  callReminders: boolean;
  groupMessages: boolean;
  growthReminders: boolean;
  expertMessages: boolean;
}