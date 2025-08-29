// NariCare AI Chatbot Models

export interface ChatbotConversation {
  id: string;
  user_id: string;
  baby_age_weeks?: number;
  conversation_context?: ChatbotContext;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  messages?: ChatbotMessage[];
  stats?: ConversationStats;
}

export interface ChatbotMessage {
  id: string;
  conversation_id?: string;
  sender: 'user' | 'bot' | 'expert';
  content: string;
  follow_up_options?: string[];
  created_at: string;
}

export interface ChatbotContext {
  breastfeedingGoals?: 'exclusive' | 'mixed_feeding' | 'combination';
  previousChallenges?: string[];
  currentConcerns?: string[];
  recentChallenges?: string[];
}

export interface ConversationStats {
  total_messages: number;
  user_messages: number;
  bot_messages: number;
  expert_messages: number;
  first_message_at: string;
  last_message_at: string;
}

export interface StartConversationRequest {
  babyAgeWeeks?: number;
  context?: ChatbotContext;
}

export interface SendMessageRequest {
  message: string;
}

export interface UpdateConversationRequest {
  babyAgeWeeks?: number;
  context?: ChatbotContext;
}

export interface SearchConversationsRequest {
  q: string;
  limit?: number;
  offset?: number;
}

export interface GetMessagesRequest {
  conversationId: string;
  limit?: number;
  offset?: number;
  order?: 'ASC' | 'DESC';
}

export interface GetConversationsRequest {
  limit?: number;
  offset?: number;
  isActive?: 'true' | 'false' | 'all';
}

// Response interfaces
export interface ChatbotApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface SendMessageResponse {
  userMessage: ChatbotMessage;
  botMessage: ChatbotMessage;
}

export interface ConversationSummaryResponse {
  summary: string;
}

// UI-specific interfaces (extending the API models)
export interface ChatbotMessageUI extends ChatbotMessage {
  timestamp?: Date;
  isTyping?: boolean;
  isPlaying?: boolean;
  audioUrl?: string;
  formattedContent?: ChatbotContent;
  followUpOptions?: FollowUpOption[];
  attachments?: ChatAttachment[];
}

// Attachment interface for compatibility  
export interface ChatAttachment {
  id: string;
  type: 'image' | 'video' | 'link';
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
}

export interface FollowUpOption {
  id: string;
  text: string;
  action: string;
}

export interface ChatbotContent {
  text: string;
  media?: MediaContent[];
  formatting?: ContentFormatting;
}

export interface MediaContent {
  type: 'image' | 'video' | 'link';
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
}

export interface ContentFormatting {
  hasBulletPoints?: boolean;
  hasBoldText?: boolean;
  sections?: ContentSection[];
}

export interface ContentSection {
  title?: string;
  content: string;
  type: 'text' | 'list' | 'callout';
}

export interface FollowUpOption {
  id: string;
  text: string;
  action: string;
}

export interface VoiceMode {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  autoListen: boolean;
  conversationFlow: boolean;
}