export interface ExpertNote {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  tags: string[];
  is_shared: boolean;
  is_favorite: boolean;
  usage_count: number;
  last_used_at: string;
  is_owner: boolean;
  owner_name: string;
  created_at: string;
  updated_at: string;
}

export interface ExpertLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: LinkCategory;
  tags: string[];
  is_shared: boolean;
  is_favorite: boolean;
  click_count: number;
  last_accessed_at: string;
  is_owner: boolean;
  owner_name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  category: NoteCategory;
  tags: string[];
  isShared: boolean;
  isFavorite: boolean;
}

export interface CreateLinkRequest {
  title: string;
  url: string;
  description?: string;
  category: LinkCategory;
  tags: string[];
  isShared: boolean;
  isFavorite: boolean;
}

export interface UpdateNoteRequest extends Partial<CreateNoteRequest> {}
export interface UpdateLinkRequest extends Partial<CreateLinkRequest> {}

export interface NotesResponse {
  success: boolean;
  data: ExpertNote[];
  pagination: PaginationInfo;
}

export interface LinksResponse {
  success: boolean;
  data: ExpertLink[];
  pagination: PaginationInfo;
}

export interface PaginationInfo {
  limit: number;
  offset: number;
  total: number;
}

export interface QuickAccessResponse {
  success: boolean;
  data: {
    notes: ExpertNote[];
    links: ExpertLink[];
  };
}

export interface ContextualSuggestionsRequest {
  keywords: string;
  babyAge?: number;
  issues?: string[];
}

export interface ContextualSuggestionsResponse {
  success: boolean;
  data: {
    notes: ExpertNote[];
    links: ExpertLink[];
    categories: string[];
  };
  context: ContextualSuggestionsRequest;
}

export interface NotesSearchParams {
  category?: NoteCategory;
  isShared?: boolean;
  isFavorite?: boolean;
  search?: string;
  tags?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface LinksSearchParams {
  category?: LinkCategory;
  isShared?: boolean;
  isFavorite?: boolean;
  search?: string;
  tags?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

// Note Categories
export type NoteCategory = 
  | 'breastfeeding'
  | 'latch'
  | 'milk_supply'
  | 'pumping'
  | 'nutrition'
  | 'sleep'
  | 'growth'
  | 'medical'
  | 'emotional_support'
  | 'general';

// Link Categories  
export type LinkCategory = 
  | 'research'
  | 'guidelines'
  | 'tools'
  | 'videos'
  | 'articles'
  | 'support_groups'
  | 'medical_resources'
  | 'pumping_guides'
  | 'general';

export interface CategoryInfo {
  key: NoteCategory | LinkCategory;
  label: string;
  icon: string;
  color: string;
}

export const NOTE_CATEGORIES: CategoryInfo[] = [
  { key: 'breastfeeding', label: 'General Breastfeeding', icon: 'heart', color: 'primary' },
  { key: 'latch', label: 'Latch & Positioning', icon: 'scan-circle', color: 'secondary' },
  { key: 'milk_supply', label: 'Milk Supply', icon: 'water', color: 'tertiary' },
  { key: 'pumping', label: 'Pumping & Expressing', icon: 'fitness', color: 'success' },
  { key: 'nutrition', label: 'Nutrition', icon: 'nutrition', color: 'warning' },
  { key: 'sleep', label: 'Sleep Patterns', icon: 'moon', color: 'dark' },
  { key: 'growth', label: 'Growth & Development', icon: 'trending-up', color: 'success' },
  { key: 'medical', label: 'Medical Issues', icon: 'medical', color: 'danger' },
  { key: 'emotional_support', label: 'Emotional Support', icon: 'happy', color: 'secondary' },
  { key: 'general', label: 'General', icon: 'chatbubble', color: 'medium' }
];

export const LINK_CATEGORIES: CategoryInfo[] = [
  { key: 'research', label: 'Research & Studies', icon: 'library', color: 'primary' },
  { key: 'guidelines', label: 'Official Guidelines', icon: 'document-text', color: 'secondary' },
  { key: 'tools', label: 'Tools & Calculators', icon: 'calculator', color: 'tertiary' },
  { key: 'videos', label: 'Educational Videos', icon: 'videocam', color: 'success' },
  { key: 'articles', label: 'Articles & Blogs', icon: 'newspaper', color: 'warning' },
  { key: 'support_groups', label: 'Support Communities', icon: 'people', color: 'secondary' },
  { key: 'medical_resources', label: 'Medical Resources', icon: 'medical', color: 'danger' },
  { key: 'pumping_guides', label: 'Pumping Guides', icon: 'fitness', color: 'success' },
  { key: 'general', label: 'General Resources', icon: 'link', color: 'medium' }
];

export interface ApiErrorResponse {
  success: false;
  error: string;
}

// Usage tracking for analytics
export interface UsageTrackingData {
  itemId: string;
  itemType: 'note' | 'link';
  action: 'view' | 'copy' | 'share' | 'access';
  context?: string;
  timestamp: string;
}