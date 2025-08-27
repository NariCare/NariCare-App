export interface Consultation {
  id: string;
  user_id: string;
  expert_id: string;
  consultation_type: 'scheduled' | 'on-demand';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  scheduled_at: string;
  actual_start_time?: string;
  actual_end_time?: string;
  topic: string;
  notes?: string;
  meeting_link?: string;
  jitsi_room_token?: string;
  expert_notes?: string;
  user_rating?: number;
  user_feedback?: string;
  follow_up_required: boolean;
  created_at: string;
  updated_at: string;
  // User information
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
  // Expert information
  expert_first_name?: string;
  expert_last_name?: string;
  expert_email?: string;
  expert_credentials?: string;
  expert_rating?: number;
  expert_user_id?: string;
  // Legacy compatibility fields
  userId?: string; // For backward compatibility
  expertId?: string; // For backward compatibility
  type?: 'scheduled' | 'on-demand'; // For backward compatibility
  scheduledAt?: Date; // For backward compatibility
  duration?: number; // For backward compatibility
  followUpRequired?: boolean; // For backward compatibility
  reminderSent?: boolean; // For backward compatibility
  meetingLink?: string; // For backward compatibility
}

export interface Expert {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  credentials?: string;
  specialties: string[];
  bio?: string;
  profile_image?: string;
  years_of_experience?: number;
  rating: number;
  total_consultations: number;
  pricing_per_session?: number;
  available_from?: string;
  available_to?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
  // Legacy compatibility fields
  name?: string; // Computed from first_name + last_name
  profileImage?: string; // Map to profile_image
  totalConsultations?: number; // Map to total_consultations
  availability?: AvailabilitySlot[];
}

export interface AvailabilitySlot {
  id: string;
  expert_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_booked: boolean;
  consultation_id?: string;
  created_at: string;
  updated_at: string;
  // Legacy compatibility fields
  dayOfWeek?: number; // For backward compatibility
  startTime?: string; // Map to start_time
  endTime?: string; // Map to end_time
  isAvailable?: boolean; // Map to is_available
}