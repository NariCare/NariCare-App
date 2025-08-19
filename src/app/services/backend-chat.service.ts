import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { ApiService, SendMessageRequest } from './api.service';
import { ChatRoom, ChatMessage, ChatAttachment } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class BackendChatService {
  // Message subjects for real-time updates
  private messageSubjects = new Map<string, BehaviorSubject<ChatMessage[]>>();
  private chatRoomsSubject = new BehaviorSubject<ChatRoom[]>([]);
  
  // Polling interval for real-time updates (in production, use WebSockets)
  private readonly POLLING_INTERVAL = 5000; // 5 seconds
  private pollingSubscriptions = new Map<string, any>();

  constructor(private apiService: ApiService) {
    this.loadChatRooms();
  }

  // ============================================================================
  // CHAT ROOM METHODS
  // ============================================================================

  getChatRooms(): Observable<ChatRoom[]> {
    return this.chatRoomsSubject.asObservable();
  }

  getGeneralChatRooms(): Observable<ChatRoom[]> {
    return this.chatRoomsSubject.pipe(
      map(rooms => rooms.filter(room => room.type === 'general'))
    );
  }

  getUserChatRooms(userId: string): Observable<ChatRoom[]> {
    return this.chatRoomsSubject.pipe(
      map(rooms => rooms.filter(room => 
        room.participants.includes(userId) || room.moderators.includes(userId)
      ))
    );
  }

  getChatRoom(roomId: string): Observable<ChatRoom | undefined> {
    // First check local cache
    const cachedRoom = this.chatRoomsSubject.value.find(r => r.id === roomId);
    if (cachedRoom) {
      return new BehaviorSubject(cachedRoom).asObservable();
    }

    // If not in cache, fetch from API
    return this.apiService.getChatRoom(roomId).pipe(
      map(response => {
        if (response.success && response.data) {
          const room = this.transformChatRoom(response.data);
          
          // Add to local cache
          const currentRooms = this.chatRoomsSubject.value;
          this.chatRoomsSubject.next([...currentRooms, room]);
          
          return room;
        }
        return undefined;
      }),
      catchError((error) => {
        console.error('Error loading chat room:', error);
        return new BehaviorSubject(undefined).asObservable();
      })
    );
  }

  // ============================================================================
  // MESSAGE METHODS
  // ============================================================================

  getMessages(roomId: string): Observable<ChatMessage[]> {
    // Get or create a BehaviorSubject for this room
    if (!this.messageSubjects.has(roomId)) {
      this.messageSubjects.set(roomId, new BehaviorSubject<ChatMessage[]>([]));
      this.loadMessages(roomId);
      this.startPollingMessages(roomId);
    }
    
    return this.messageSubjects.get(roomId)!.asObservable();
  }

  async sendMessage(roomId: string, message: Omit<ChatMessage, 'id'>): Promise<void> {
    try {
      const messageData: SendMessageRequest = {
        message: message.message,
        attachments: message.attachments || []
      };

      const response = await this.apiService.sendMessage(roomId, messageData).toPromise();
      
      if (response?.success) {
        // Immediately refresh messages for this room
        this.loadMessages(roomId);
        
        // Update room's last message info
        this.updateRoomLastMessage(roomId, message);
      } else {
        throw new Error(response?.message || 'Failed to send message');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  // ============================================================================
  // ROOM PARTICIPATION METHODS
  // ============================================================================

  async joinRoom(roomId: string, userId: string): Promise<void> {
    try {
      const response = await this.apiService.joinChatRoom(roomId).toPromise();
      
      if (response?.success) {
        // Update local room data
        const currentRooms = this.chatRoomsSubject.value;
        const updatedRooms = currentRooms.map(room => {
          if (room.id === roomId && !room.participants.includes(userId)) {
            return {
              ...room,
              participants: [...room.participants, userId]
            };
          }
          return room;
        });
        this.chatRoomsSubject.next(updatedRooms);
        
        // Start loading messages for this room
        this.loadMessages(roomId);
        this.startPollingMessages(roomId);
      } else {
        throw new Error(response?.message || 'Failed to join room');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    try {
      const response = await this.apiService.leaveChatRoom(roomId).toPromise();
      
      if (response?.success) {
        // Update local room data
        const currentRooms = this.chatRoomsSubject.value;
        const updatedRooms = currentRooms.map(room => {
          if (room.id === roomId) {
            return {
              ...room,
              participants: room.participants.filter(id => id !== userId)
            };
          }
          return room;
        });
        this.chatRoomsSubject.next(updatedRooms);
        
        // Stop polling messages for this room
        this.stopPollingMessages(roomId);
      } else {
        throw new Error(response?.message || 'Failed to leave room');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private loadChatRooms(): void {
    this.apiService.getChatRooms().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const rooms = response.data.map(this.transformChatRoom);
          this.chatRoomsSubject.next(rooms);
        }
      },
      error: (error) => {
        console.error('Error loading chat rooms:', error);
      }
    });
  }

  private loadMessages(roomId: string): void {
    this.apiService.getMessages(roomId, 50).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const messages = response.data.map(this.transformChatMessage);
          
          // Update the BehaviorSubject for this room
          if (this.messageSubjects.has(roomId)) {
            this.messageSubjects.get(roomId)!.next(messages);
          }
        }
      },
      error: (error) => {
        console.error('Error loading messages for room:', roomId, error);
      }
    });
  }

  private startPollingMessages(roomId: string): void {
    // Don't start polling if already polling this room
    if (this.pollingSubscriptions.has(roomId)) {
      return;
    }

    const polling = interval(this.POLLING_INTERVAL).pipe(
      switchMap(() => this.apiService.getMessages(roomId, 20)) // Get last 20 messages
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const messages = response.data.map(this.transformChatMessage);
          
          // Only update if we have new messages
          const currentMessages = this.messageSubjects.get(roomId)?.value || [];
          if (messages.length > currentMessages.length || 
              (messages.length > 0 && currentMessages.length > 0 && 
               messages[messages.length - 1].id !== currentMessages[currentMessages.length - 1].id)) {
            this.messageSubjects.get(roomId)?.next(messages);
          }
        }
      },
      error: (error) => {
        console.error('Error polling messages for room:', roomId, error);
      }
    });

    this.pollingSubscriptions.set(roomId, polling);
  }

  private stopPollingMessages(roomId: string): void {
    const subscription = this.pollingSubscriptions.get(roomId);
    if (subscription) {
      subscription.unsubscribe();
      this.pollingSubscriptions.delete(roomId);
    }
  }

  private updateRoomLastMessage(roomId: string, message: Omit<ChatMessage, 'id'>): void {
    const currentRooms = this.chatRoomsSubject.value;
    const updatedRooms = currentRooms.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          lastMessage: message as ChatMessage,
          lastMessageTimestamp: message.timestamp
        };
      }
      return room;
    });
    this.chatRoomsSubject.next(updatedRooms);
  }

  // ============================================================================
  // DATA TRANSFORMATION METHODS
  // ============================================================================

  private transformChatRoom = (apiRoom: any): ChatRoom => {
    return {
      id: apiRoom.id,
      name: apiRoom.name,
      description: apiRoom.description,
      type: apiRoom.type || 'general',
      topic: apiRoom.topic,
      isPrivate: apiRoom.is_private || apiRoom.isPrivate || false,
      participants: apiRoom.participants || [],
      moderators: apiRoom.moderators || [],
      maxParticipants: apiRoom.max_participants || apiRoom.maxParticipants || 20,
      createdAt: new Date(apiRoom.created_at || apiRoom.createdAt),
      lastMessageTimestamp: apiRoom.last_message_timestamp ? 
        new Date(apiRoom.last_message_timestamp) : undefined,
      lastMessage: apiRoom.last_message ? 
        this.transformChatMessage(apiRoom.last_message) : undefined
    };
  };

  private transformChatMessage = (apiMessage: any): ChatMessage => {
    return {
      id: apiMessage.id,
      roomId: apiMessage.room_id || apiMessage.roomId,
      senderId: apiMessage.sender_id || apiMessage.senderId,
      senderName: apiMessage.sender_name || apiMessage.senderName,
      senderRole: apiMessage.sender_role || apiMessage.senderRole || 'user',
      message: apiMessage.message,
      timestamp: new Date(apiMessage.timestamp || apiMessage.created_at),
      isEdited: apiMessage.is_edited || apiMessage.isEdited || false,
      replyTo: apiMessage.reply_to || apiMessage.replyTo,
      attachments: apiMessage.attachments ? 
        apiMessage.attachments.map(this.transformMessageAttachment) : undefined
    };
  };

  private transformMessageAttachment = (apiAttachment: any): ChatAttachment => {
    return {
      id: apiAttachment.id,
      type: apiAttachment.type,
      url: apiAttachment.url,
      title: apiAttachment.title,
      description: apiAttachment.description,
      thumbnail: apiAttachment.thumbnail
    };
  };

  private getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }
    
    if (error?.error?.message) {
      return error.error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  // ============================================================================
  // CLEANUP METHODS
  // ============================================================================

  ngOnDestroy(): void {
    // Stop all polling subscriptions
    this.pollingSubscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.pollingSubscriptions.clear();
  }

  // Method to manually refresh room data
  refreshRooms(): void {
    this.loadChatRooms();
  }

  // Method to manually refresh messages for a room
  refreshMessages(roomId: string): void {
    this.loadMessages(roomId);
  }
}