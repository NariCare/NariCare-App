import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  id: string;
  message: string;
  senderName: string;
  senderId: string;
  senderRole?: string;
  timestamp: string;
  attachments?: any[];
  roomId: string;
}

export interface SocketUser {
  id: string;
  name: string;
  role?: string;
  isOnline: boolean;
}

export interface TypingUser {
  userId: string;
  userName: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  // Observable subjects
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private onlineUsersSubject = new BehaviorSubject<number>(0);
  private typingUsersSubject = new BehaviorSubject<TypingUser[]>([]);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Public observables
  public isConnected$ = this.isConnectedSubject.asObservable();
  public messages$ = this.messagesSubject.asObservable();
  public onlineUsers$ = this.onlineUsersSubject.asObservable();
  public typingUsers$ = this.typingUsersSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor() {
    console.log('SocketService initialized');
  }

  /**
   * Connect to WebSocket server
   */
  async connect(token: string): Promise<void> {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return Promise.resolve();
    }

    console.log('Attempting to connect to socket server...');
    
    return new Promise((resolve, reject) => {
      // Determine the API URL
      const apiUrl = environment.production 
        ? 'https://beta-api.naricare.com' 
        : 'http://localhost:3000';

      this.socket = io(apiUrl, {
        auth: { token },
        transports: ['websocket'],
        timeout: 10000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: this.maxReconnectAttempts
      });

      // Connection successful
      this.socket.on('connect', () => {
        console.log('Socket connected successfully:', this.socket?.id);
        this.isConnectedSubject.next(true);
        this.reconnectAttempts = 0;
        this.errorSubject.next(null);
        this.setupEventListeners();
        resolve();
      });

      // Connection error
      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        this.isConnectedSubject.next(false);
        this.errorSubject.next(`Connection failed: ${error.message}`);
        reject(error);
      });

      // Disconnection handling
      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        this.isConnectedSubject.next(false);
        this.handleReconnection(token);
      });

      // Authentication error
      this.socket.on('auth_error', (error) => {
        console.error('Authentication error:', error);
        this.errorSubject.next('Authentication failed. Please log in again.');
        this.disconnect();
        reject(new Error('Authentication failed'));
      });
    });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(token: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      
      console.log(`Reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        this.connect(token).catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.errorSubject.next('Connection lost. Please refresh the page.');
    }
  }

  /**
   * Setup event listeners for chat functionality
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Room events
    this.socket.on('room_joined', (data: any) => {
      console.log('Room joined successfully:', data);
    });

    this.socket.on('room_left', (data: any) => {
      console.log('Room left successfully:', data);
    });

    // Message events
    this.socket.on('new_message', (data: any) => {
      console.log('New message received:', data);
      const message: ChatMessage = {
        id: data.id,
        message: data.message,
        senderName: data.sender_name || data.senderName,
        senderId: data.sender_id || data.senderId,
        senderRole: data.sender_role || data.senderRole,
        timestamp: data.created_at || data.timestamp,
        attachments: data.attachments || [],
        roomId: data.room_id || data.roomId
      };
      
      const currentMessages = this.messagesSubject.value;
      
      // Deduplicate: Check if message already exists
      const isDuplicate = currentMessages.some(existing => 
        existing.id === message.id || 
        (existing.message === message.message && 
         existing.senderId === message.senderId && 
         existing.roomId === message.roomId &&
         Math.abs(new Date(existing.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000)
      );
      
      if (!isDuplicate) {
        this.messagesSubject.next([...currentMessages, message]);
      } else {
        console.log('Duplicate message ignored:', message.id);
      }
    });

    // User presence events
    this.socket.on('user_joined_room', (data: any) => {
      console.log('User joined room:', data);
      this.requestOnlineUsers(data.roomId);
    });

    this.socket.on('user_left_room', (data: any) => {
      console.log('User left room:', data);
      this.requestOnlineUsers(data.roomId);
    });

    this.socket.on('online_users', (data: any) => {
      console.log('Online users update:', data);
      this.onlineUsersSubject.next(data.onlineCount || data.count || 0);
    });

    // Typing events
    this.socket.on('user_typing', (data: any) => {
      console.log('User typing:', data);
      const currentTyping = this.typingUsersSubject.value;
      const isAlreadyTyping = currentTyping.some(user => user.userId === data.userId);
      
      if (!isAlreadyTyping) {
        this.typingUsersSubject.next([
          ...currentTyping,
          { userId: data.userId, userName: data.userName || 'Someone' }
        ]);
      }
    });

    this.socket.on('user_stopped_typing', (data: any) => {
      console.log('User stopped typing:', data);
      const currentTyping = this.typingUsersSubject.value;
      this.typingUsersSubject.next(
        currentTyping.filter(user => user.userId !== data.userId)
      );
    });

    // Error events
    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      this.errorSubject.next(error.message || 'An error occurred');
    });

    this.socket.on('chat_error', (error: any) => {
      console.error('Chat error:', error);
      this.errorSubject.next(error.message || 'Chat error occurred');
    });
  }

  /**
   * Join a chat room
   */
  joinRoom(roomId: string): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket not connected. Cannot join room.');
      return;
    }

    console.log('Joining room:', roomId);
    this.socket.emit('join_room', { roomId });
    this.requestOnlineUsers(roomId);
  }

  /**
   * Leave a chat room
   */
  leaveRoom(roomId: string): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket not connected. Cannot leave room.');
      return;
    }

    console.log('Leaving room:', roomId);
    this.socket.emit('leave_room', { roomId });
  }

  /**
   * Send a message to a room
   */
  sendMessage(roomId: string, message: string, attachments: any[] = []): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket not connected. Cannot send message.');
      this.errorSubject.next('Not connected. Please refresh the page.');
      return;
    }

    if (!message.trim()) {
      console.warn('Cannot send empty message');
      return;
    }

    console.log('Sending message to room:', roomId, message);
    this.socket.emit('send_message', {
      roomId,
      message: message.trim(),
      attachments
    });
  }

  /**
   * Start typing indicator
   */
  startTyping(roomId: string): void {
    if (!this.socket || !this.socket.connected) return;
    
    this.socket.emit('typing_start', { roomId });
  }

  /**
   * Stop typing indicator
   */
  stopTyping(roomId: string): void {
    if (!this.socket || !this.socket.connected) return;
    
    this.socket.emit('typing_stop', { roomId });
  }

  /**
   * Request online users count for a room
   */
  requestOnlineUsers(roomId: string): void {
    if (!this.socket || !this.socket.connected) return;
    
    this.socket.emit('get_online_users', { roomId });
  }

  /**
   * Clear messages (useful when switching rooms)
   */
  clearMessages(): void {
    this.messagesSubject.next([]);
  }

  /**
   * Clear typing users
   */
  clearTypingUsers(): void {
    this.typingUsersSubject.next([]);
  }

  /**
   * Clear error
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Get current connection status
   */
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Disconnect from socket server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting from socket server');
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnectedSubject.next(false);
    this.clearMessages();
    this.clearTypingUsers();
    this.onlineUsersSubject.next(0);
  }

  /**
   * Get stored auth token
   */
  private getStoredToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  /**
   * Auto-reconnect with stored token
   */
  autoReconnect(): void {
    const token = this.getStoredToken();
    if (token) {
      this.connect(token).catch(error => {
        console.error('Auto-reconnect failed:', error);
      });
    }
  }

  /**
   * Set messages (used for loading message history)
   */
  setMessages(messages: ChatMessage[]): void {
    this.messagesSubject.next(messages);
  }

  /**
   * Add a message to the current message list (with deduplication)
   */
  addMessage(message: ChatMessage): void {
    const currentMessages = this.messagesSubject.value;
    
    // Deduplicate: Check if message already exists
    const isDuplicate = currentMessages.some(existing => 
      existing.id === message.id || 
      (existing.message === message.message && 
       existing.senderId === message.senderId && 
       existing.roomId === message.roomId &&
       Math.abs(new Date(existing.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000)
    );
    
    if (!isDuplicate) {
      this.messagesSubject.next([...currentMessages, message]);
    } else {
      console.log('Duplicate message ignored in addMessage:', message.id);
    }
  }
}