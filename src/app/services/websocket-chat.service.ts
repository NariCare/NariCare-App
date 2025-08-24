import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, map, distinctUntilChanged, Subject } from 'rxjs';
import { SocketService, ChatMessage, TypingUser } from './socket.service';
import { BackendAuthService } from './backend-auth.service';
import { ApiService } from './api.service';
import { ChatService } from './chat.service';
import { ToastController } from '@ionic/angular';

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  lastMessage?: ChatMessage;
  isActive: boolean;
}

export interface MessageQueue {
  roomId: string;
  message: string;
  attachments: any[];
  timestamp: Date;
  id: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketChatService implements OnDestroy {
  private currentRoomId: string | null = null;
  private typingTimeout: any = null;
  private isTyping = false;
  private messageQueue: MessageQueue[] = [];
  private destroy$ = new Subject<void>();

  // Room state
  private currentRoomSubject = new BehaviorSubject<string | null>(null);
  private roomsSubject = new BehaviorSubject<ChatRoom[]>([]);

  // Public observables
  public currentRoom$ = this.currentRoomSubject.asObservable();
  public rooms$ = this.roomsSubject.asObservable();
  
  // Combined observables for chat UI
  public chatState$ = combineLatest([
    this.socketService.isConnected$,
    this.socketService.messages$,
    this.socketService.onlineUsers$,
    this.socketService.typingUsers$,
    this.socketService.error$,
    this.currentRoom$
  ]).pipe(
    map(([isConnected, messages, onlineUsers, typingUsers, error, currentRoom]) => ({
      isConnected,
      messages: currentRoom ? messages.filter(m => m.roomId === currentRoom) : [],
      onlineUsers,
      typingUsers,
      error,
      currentRoom
    })),
    distinctUntilChanged()
  );

  constructor(
    private socketService: SocketService,
    private backendAuthService: BackendAuthService,
    private apiService: ApiService,
    private chatService: ChatService,
    private toastController: ToastController
  ) {
    this.initializeService();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  /**
   * Initialize the chat service
   */
  private async initializeService(): Promise<void> {
    try {
      // Don't auto-connect - let the component decide when to connect
      // Just set up listeners for authentication changes

      // Listen for authentication changes
      this.backendAuthService.currentUser$.subscribe(async (user) => {
        if (user) {
          // User logged in - load chat rooms but don't auto-connect WebSocket
          await this.loadChatRooms();
        } else {
          // User logged out - disconnect and clear data
          this.disconnect();
          this.roomsSubject.next([]);
        }
      });

      // Handle connection status changes
      this.socketService.isConnected$.subscribe((isConnected) => {
        if (isConnected) {
          this.flushMessageQueue();
        }
      });

      // Handle socket errors
      this.socketService.error$.subscribe((error) => {
        if (error) {
          this.showErrorToast(error);
        }
      });

      // Load queued messages from localStorage
      this.loadQueuedMessages();

    } catch (error) {
      console.error('Failed to initialize chat service:', error);
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<boolean> {
    try {
      // Get token from API service (which uses 'naricare_token' key)
      const token = this.apiService.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      await this.socketService.connect(token);
      console.log('WebSocket chat service connected');
      return true;
    } catch (error) {
      console.error('Failed to connect to chat service:', error);
      this.showErrorToast('Failed to connect to chat. Please check your connection.');
      return false;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.currentRoomId) {
      this.leaveCurrentRoom();
    }
    this.socketService.disconnect();
    this.currentRoomSubject.next(null);
    console.log('WebSocket chat service disconnected');
  }

  /**
   * Load available chat rooms from API (delegate to ChatService)
   */
  async loadChatRooms(): Promise<ChatRoom[]> {
    try {
      const rooms = await this.chatService.getChatRooms().toPromise();
      if (rooms) {
        // Convert ChatService ChatRoom to WebSocketChatService ChatRoom interface
        const wsRooms: ChatRoom[] = rooms.map(room => ({
          id: room.id,
          name: room.name,
          description: room.description,
          memberCount: room.participants?.length || 0,
          isActive: true,
          lastMessage: room.lastMessage ? {
            id: room.lastMessage.id,
            message: room.lastMessage.message,
            senderName: room.lastMessage.senderName,
            senderId: room.lastMessage.senderId,
            senderRole: room.lastMessage.senderRole,
            timestamp: room.lastMessage.timestamp.toISOString(),
            attachments: room.lastMessage.attachments || [],
            roomId: room.lastMessage.roomId
          } : undefined
        }));
        
        this.roomsSubject.next(wsRooms);
        return wsRooms;
      }
      return [];
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
      this.showErrorToast('Failed to load chat rooms');
      return [];
    }
  }

  /**
   * Join a chat room
   */
  async joinRoom(roomId: string): Promise<boolean> {
    try {
      // Leave current room first
      if (this.currentRoomId && this.currentRoomId !== roomId) {
        this.leaveCurrentRoom();
      }

      // Clear previous messages and state
      this.socketService.clearMessages();
      this.socketService.clearTypingUsers();
      this.socketService.clearError();

      // Join new room via WebSocket
      this.socketService.joinRoom(roomId);
      this.currentRoomId = roomId;
      this.currentRoomSubject.next(roomId);

      // Load message history from API
      await this.loadMessageHistory(roomId);

      console.log('Successfully joined room:', roomId);
      return true;
    } catch (error) {
      console.error('Failed to join room:', roomId, error);
      this.showErrorToast('Failed to join chat room');
      return false;
    }
  }

  /**
   * Leave current room
   */
  leaveCurrentRoom(): void {
    if (this.currentRoomId) {
      this.socketService.leaveRoom(this.currentRoomId);
      this.socketService.clearMessages();
      this.socketService.clearTypingUsers();
      this.currentRoomId = null;
      this.currentRoomSubject.next(null);
      
      // Clear typing state
      this.stopTyping();
    }
  }

  /**
   * Send a message to current room
   */
  async sendMessage(message: string, attachments: any[] = []): Promise<boolean> {
    if (!this.currentRoomId) {
      this.showErrorToast('Please join a room first');
      return false;
    }

    if (!message.trim()) {
      return false;
    }

    try {
      // Stop typing indicator
      this.stopTyping();

      if (this.socketService.isConnected) {
        // Send via WebSocket
        this.socketService.sendMessage(this.currentRoomId, message, attachments);
        return true;
      } else {
        // Queue message for later sending
        this.queueMessage(this.currentRoomId, message, attachments);
        this.showErrorToast('Message queued. Will send when connection is restored.');
        return false;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      this.showErrorToast('Failed to send message');
      return false;
    }
  }

  /**
   * Start typing indicator
   */
  startTyping(): void {
    if (!this.currentRoomId || !this.socketService.isConnected) return;

    if (!this.isTyping) {
      this.isTyping = true;
      this.socketService.startTyping(this.currentRoomId);
    }

    // Reset typing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.typingTimeout = setTimeout(() => {
      this.stopTyping();
    }, 3000); // Stop typing after 3 seconds of inactivity
  }

  /**
   * Stop typing indicator
   */
  stopTyping(): void {
    if (this.isTyping && this.currentRoomId && this.socketService.isConnected) {
      this.isTyping = false;
      this.socketService.stopTyping(this.currentRoomId);
    }

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  /**
   * Load message history from API
   */
  private async loadMessageHistory(roomId: string, limit: number = 50): Promise<void> {
    try {
      const response = await this.apiService.getMessages(roomId, limit).toPromise();
      if (response?.success && response.data) {
        const messages: ChatMessage[] = response.data.map((msg: any) => ({
          id: msg.id,
          message: msg.message,
          senderName: msg.sender_name || msg.senderName,
          senderId: msg.sender_id || msg.senderId,
          senderRole: msg.sender_role || msg.senderRole,
          timestamp: msg.created_at || msg.timestamp,
          attachments: msg.attachments || [],
          roomId: roomId
        }));

        // Sort messages by timestamp (oldest first)
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        // Set messages in socket service
        this.socketService.setMessages(messages);
      }
    } catch (error) {
      console.error('Failed to load message history:', error);
      // Don't show error toast for history loading as it's not critical
    }
  }

  /**
   * Queue message for sending when connection is restored
   */
  private queueMessage(roomId: string, message: string, attachments: any[]): void {
    const queuedMessage: MessageQueue = {
      id: Date.now().toString(),
      roomId,
      message,
      attachments,
      timestamp: new Date()
    };

    this.messageQueue.push(queuedMessage);
    
    // Save to localStorage for persistence
    localStorage.setItem('chatMessageQueue', JSON.stringify(this.messageQueue));
  }

  /**
   * Flush queued messages when connection is restored
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`Flushing ${this.messageQueue.length} queued messages`);
    
    const messagesToSend = [...this.messageQueue];
    this.messageQueue = [];
    
    messagesToSend.forEach((queuedMessage) => {
      if (queuedMessage.roomId === this.currentRoomId) {
        this.socketService.sendMessage(
          queuedMessage.roomId,
          queuedMessage.message,
          queuedMessage.attachments
        );
      }
    });

    // Clear from localStorage
    localStorage.removeItem('chatMessageQueue');
  }

  /**
   * Load queued messages from localStorage
   */
  private loadQueuedMessages(): void {
    try {
      const stored = localStorage.getItem('chatMessageQueue');
      if (stored) {
        this.messageQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load queued messages:', error);
      this.messageQueue = [];
    }
  }

  /**
   * Get typing users for current room
   */
  getTypingUsersForRoom(): Observable<TypingUser[]> {
    return this.socketService.typingUsers$;
  }

  /**
   * Get online users count for current room
   */
  getOnlineUsersCount(): Observable<number> {
    return this.socketService.onlineUsers$;
  }

  /**
   * Check if currently connected
   */
  get isConnected(): boolean {
    return this.socketService.isConnected;
  }

  /**
   * Get current room ID
   */
  get currentRoom(): string | null {
    return this.currentRoomId;
  }

  /**
   * Show error toast
   */
  private async showErrorToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }

  /**
   * Show success toast
   */
  private async showSuccessToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  /**
   * Refresh connection (useful for manual retry)
   */
  async refreshConnection(): Promise<boolean> {
    this.disconnect();
    return await this.connect();
  }
}