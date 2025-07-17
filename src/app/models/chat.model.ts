export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  topic: string;
  isPrivate: boolean;
  participants: string[];
  moderators: string[];
  createdAt: Date;
  lastMessage?: ChatMessage;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'expert' | 'moderator';
  message: string;
  timestamp: Date;
  isEdited: boolean;
  replyTo?: string;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'document';
  url: string;
  filename: string;
  size: number;
}