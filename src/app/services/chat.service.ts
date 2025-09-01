import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ChatRoom, ChatMessage, ChatAttachment } from '../models/chat.model';
import { Storage } from '@ionic/storage-angular';
import { ApiService, SendMessageRequest, CreateRoomRequest } from './api.service';
import { BackendAuthService } from './backend-auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  // Message subjects for real-time updates
  private messageSubjects = new Map<string, BehaviorSubject<ChatMessage[]>>();

  // Mock chat rooms data
  private mockChatRooms: ChatRoom[] = [
    {
      id: 'general-newborn-support',
      name: 'New Mother Support Group',
      description: 'Support for new mothers with newborns (0-3 months)',
      type: 'general',
      topic: 'newborn',
      isPrivate: false,
      participants: ['user-1', 'user-2', 'user-3'],
      moderators: ['expert-1'],
      maxParticipants: 20,
      createdAt: new Date('2024-01-01'),
      lastMessageTimestamp: new Date()
    },
    {
      id: 'general-working-moms',
      name: 'Working Mothers Support',
      description: 'Support for mothers returning to work while breastfeeding',
      type: 'general',
      topic: 'work',
      isPrivate: false,
      participants: ['user-10', 'user-11'],
      moderators: ['expert-2'],
      maxParticipants: 20,
      createdAt: new Date('2024-01-20'),
      lastMessageTimestamp: new Date()
    },
    {
      id: 'general-pumping-moms',
      name: 'Pumping Moms Unite',
      description: 'Tips and support for pumping mothers',
      type: 'general',
      topic: 'pumping',
      isPrivate: false,
      participants: ['user-4', 'user-5'],
      moderators: ['expert-2'],
      maxParticipants: 20,
      createdAt: new Date('2024-01-05'),
      lastMessageTimestamp: new Date()
    },
    {
      id: 'general-twin-babies',
      name: 'Twin Baby Support',
      description: 'Special support for mothers of twins',
      type: 'general',
      topic: 'twins',
      isPrivate: false,
      participants: ['user-6'],
      moderators: ['expert-1', 'expert-3'],
      maxParticipants: 20,
      createdAt: new Date('2024-01-10'),
      lastMessageTimestamp: new Date()
    },
    {
      id: 'general-achievements',
      name: 'Breastfeeding Achievements',
      description: 'Celebrate your breastfeeding milestones and victories',
      type: 'general',
      topic: 'achievements',
      isPrivate: false,
      participants: ['user-7', 'user-8', 'user-9'],
      moderators: ['expert-2'],
      maxParticipants: 20,
      createdAt: new Date('2024-01-15'),
      lastMessageTimestamp: new Date()
    }
  ];

  // Mock messages data organized by room ID
  private mockMessages: { [roomId: string]: ChatMessage[] } = {
    'general-newborn-support': [
      {
        id: 'msg-newborn-1',
        roomId: 'general-newborn-support',
        senderId: 'expert-1',
        senderName: 'Dr. Sarah Johnson',
        senderRole: 'expert',
        message: 'Welcome to the Newborn Support Group! 👶 I\'m here to help with any questions about feeding, sleeping, or caring for your little one.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isEdited: false
      },
      {
        id: 'msg-newborn-2',
        roomId: 'general-newborn-support',
        senderId: 'user-demo-1',
        senderName: 'Emma S.',
        senderRole: 'user',
        message: 'Thank you Dr. Johnson! I have a question about my 3-week-old\'s feeding schedule. She seems to want to feed every hour - is this normal?',
        timestamp: new Date(Date.now() - 90 * 60 * 1000), // 90 minutes ago
        isEdited: false
      },
      {
        id: 'msg-newborn-3',
        roomId: 'general-newborn-support',
        senderId: 'expert-1',
        senderName: 'Dr. Sarah Johnson',
        senderRole: 'expert',
        message: 'That\'s completely normal, Emma! **Cluster feeding** is very common at 3 weeks. Your baby is likely going through a growth spurt. This frequent feeding helps:\n\n• Build your milk supply\n• Comfort your baby\n• Support healthy weight gain\n\nTry to rest when baby rests, and remember this phase will pass! 💕',
        timestamp: new Date(Date.now() - 85 * 60 * 1000), // 85 minutes ago
        isEdited: false
      },
      {
        id: 'msg-newborn-4',
        roomId: 'general-newborn-support',
        senderId: 'user-demo-2',
        senderName: 'Maria L.',
        senderRole: 'user',
        message: 'I went through the same thing with my little one! It gets easier around 6 weeks. Hang in there mama! 🌟',
        timestamp: new Date(Date.now() - 80 * 60 * 1000), // 80 minutes ago
        isEdited: false
      },
      {
        id: 'msg-newborn-6',
        roomId: 'general-newborn-support',
        senderId: 'user-demo-3',
        senderName: 'Rachel M.',
        senderRole: 'user',
        message: 'Here\'s a helpful video about newborn feeding cues that really helped me!',
        timestamp: new Date(Date.now() - 70 * 60 * 1000), // 70 minutes ago
        isEdited: false,
        attachments: [
          {
            id: 'attachment-1',
            type: 'video',
            url: 'https://youtu.be/ABAXgubx58Q',
            title: 'Recognizing Baby Hunger Cues',
            description: 'Learn to identify your baby\'s hunger signals before they cry',
            thumbnail: 'https://img.youtube.com/vi/ABAXgubx58Q/maxresdefault.jpg'
          }
        ]
      },
      {
        id: 'msg-newborn-5',
        roomId: 'general-newborn-support',
        senderId: 'user-demo-1',
        senderName: 'Emma S.',
        senderRole: 'user',
        message: 'Thank you both so much! This community is amazing. I feel so much better knowing this is normal. 💕',
        timestamp: new Date(Date.now() - 75 * 60 * 1000), // 75 minutes ago
        isEdited: false
      }
    ],
    'general-pumping-moms': [
      {
        id: 'msg-pumping-1',
        roomId: 'general-pumping-moms',
        senderId: 'expert-2',
        senderName: 'Lisa Martinez',
        senderRole: 'expert',
        message: 'Hello pumping warriors! 💪 This is your space to share tips, troubleshoot issues, and support each other. What pumping questions can I help with today?',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        isEdited: false
      },
      {
        id: 'msg-pumping-2',
        roomId: 'general-pumping-moms',
        senderId: 'user-demo-3',
        senderName: 'Jessica R.',
        senderRole: 'user',
        message: 'Hi everyone! I\'m returning to work next week and feeling anxious about maintaining my supply. Any tips for pumping at work?',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        isEdited: false
      },
      {
        id: 'msg-pumping-3',
        roomId: 'general-pumping-moms',
        senderId: 'expert-2',
        senderName: 'Lisa Martinez',
        senderRole: 'expert',
        message: 'Great question Jessica! Here are my top tips for **successful workplace pumping**:\n\n• Pump every 2-3 hours during work\n• Bring a photo of your baby to help with letdown\n• Stay hydrated and eat protein-rich snacks\n• Find a comfortable, private space\n• Consider a hands-free pumping bra\n\nYou\'ve got this! 🌟',
        timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000), // 2.5 hours ago
        isEdited: false
      }
    ],
    'general-working-moms': [
      {
        id: 'msg-working-1',
        roomId: 'general-working-moms',
        senderId: 'expert-2',
        senderName: 'Lisa Martinez',
        senderRole: 'expert',
        message: 'Welcome working mamas! 👩‍💼 Balancing work and breastfeeding is challenging but absolutely doable. I\'m here to support you through this transition.',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        isEdited: false
      }
    ]
  };

  constructor(
    private storage: Storage,
    private apiService: ApiService,
    private backendAuthService: BackendAuthService
  ) {
    this.initStorage();
  }

  private async initStorage() {
    await this.storage.create();
  }
  getChatRooms(): Observable<ChatRoom[]> {
    // Check if user is authenticated and use backend API
    const currentUser = this.backendAuthService.getCurrentUser();
    if (currentUser && this.apiService.isAuthenticated()) {
      return this.apiService.getChatRooms().pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data.map(room => this.transformApiRoom(room))
              .sort((a, b) => (b.lastMessageTimestamp?.getTime() || 0) - (a.lastMessageTimestamp?.getTime() || 0));
          }
          return [];
        }),
        catchError(error => {
          console.warn('Failed to load chat rooms from API, using fallback:', error);
          return of(this.mockChatRooms.sort((a, b) => 
            (b.lastMessageTimestamp?.getTime() || 0) - (a.lastMessageTimestamp?.getTime() || 0)
          ));
        })
      );
    }

    // Fallback to mock data if not authenticated
    return of(this.mockChatRooms.sort((a, b) => 
      (b.lastMessageTimestamp?.getTime() || 0) - (a.lastMessageTimestamp?.getTime() || 0)
    ));
  }

  getGeneralChatRooms(): Observable<ChatRoom[]> {
    // Use getChatRooms and filter for general rooms
    return this.getChatRooms().pipe(
      map(rooms => rooms.filter(room => room.type === 'general'))
    );
  }

  getUserChatRooms(userId: string): Observable<ChatRoom[]> {
    const userRooms = this.mockChatRooms.filter(room => 
      room.participants.includes(userId) || room.moderators.includes(userId)
    );
    return of(userRooms);
  }

  getChatRoom(roomId: string): Observable<ChatRoom | undefined> {
    // Check if user is authenticated and use backend API
    const currentUser = this.backendAuthService.getCurrentUser();
    if (currentUser && this.apiService.isAuthenticated()) {
      return this.apiService.getChatRoom(roomId).pipe(
        map(response => {
          if (response.success && response.data) {
            return this.transformApiRoom(response.data);
          }
          return undefined;
        }),
        catchError(error => {
          console.warn('Failed to load chat room from API, using fallback:', error);
          const room = this.mockChatRooms.find(r => r.id === roomId);
          return of(room);
        })
      );
    }

    // Fallback to mock data if not authenticated
    const room = this.mockChatRooms.find(r => r.id === roomId);
    return of(room);
  }

  getMessages(roomId: string): Observable<ChatMessage[]> {
    // Get or create a BehaviorSubject for this room
    if (!this.messageSubjects.has(roomId)) {
      this.messageSubjects.set(roomId, new BehaviorSubject<ChatMessage[]>([]));
      
      // Load initial messages from API if authenticated
      const currentUser = this.backendAuthService.getCurrentUser();
      if (currentUser && this.apiService.isAuthenticated()) {
        this.loadMessagesFromApi(roomId);
      } else {
        // Use mock data as fallback
        const initialMessages = this.mockMessages[roomId] || [];
        this.messageSubjects.get(roomId)!.next(initialMessages);
      }
    }
    
    return this.messageSubjects.get(roomId)!.asObservable();
  }

  /**
   * Load messages from API and update the BehaviorSubject
   */
  private loadMessagesFromApi(roomId: string): void {
    this.apiService.getMessages(roomId, 50).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.map(msg => this.transformApiMessage(msg));
        }
        return [];
      }),
      catchError(error => {
        console.warn('Failed to load messages from API, using fallback:', error);
        return of(this.mockMessages[roomId] || []);
      })
    ).subscribe(messages => {
      if (this.messageSubjects.has(roomId)) {
        this.messageSubjects.get(roomId)!.next(messages);
      }
    });
  }

  async sendMessage(roomId: string, message: Omit<ChatMessage, 'id'>): Promise<void> {
    // Check if user is authenticated and use backend API
    const currentUser = this.backendAuthService.getCurrentUser();
    if (currentUser && this.apiService.isAuthenticated()) {
      try {
        const messageData: SendMessageRequest = {
          message: message.message,
          attachments: message.attachments || []
        };
        
        const response = await this.apiService.sendMessage(roomId, messageData).toPromise();
        
        if (response?.success && response.data) {
          // Message sent successfully via API
          // Don't add to local messages here - let WebSocket or page reload handle it
          // to avoid duplication with real-time updates
          console.log('Message sent successfully via API');
        } else {
          throw new Error('Failed to send message via API');
        }
      } catch (error) {
        console.error('Failed to send message via API, using fallback:', error);
        // Fallback to local message handling
        this.sendMessageFallback(roomId, message);
      }
    } else {
      // Use fallback for unauthenticated users
      this.sendMessageFallback(roomId, message);
    }
  }

  /**
   * Fallback method for sending messages locally
   */
  private sendMessageFallback(roomId: string, message: Omit<ChatMessage, 'id'>): void {
    const id = this.generateId();
    const newMessage: ChatMessage = {
      ...message,
      id,
      timestamp: new Date()
    };
    
    this.addMessageToSubject(roomId, newMessage);
    
    // Update room's last message info (for mock data)
    const room = this.mockChatRooms.find(r => r.id === roomId);
    if (room) {
      room.lastMessage = newMessage;
      room.lastMessageTimestamp = newMessage.timestamp;
    }
    
    console.log('Message sent to room (fallback):', roomId, newMessage);
  }

  /**
   * Add message to the room's message subject (with deduplication)
   */
  private addMessageToSubject(roomId: string, newMessage: ChatMessage): void {
    // Get or create message subject for this room
    if (!this.messageSubjects.has(roomId)) {
      this.messageSubjects.set(roomId, new BehaviorSubject<ChatMessage[]>([]));
    }
    
    const currentMessages = this.messageSubjects.get(roomId)!.value;
    
    // Deduplicate: Check if message already exists
    const isDuplicate = currentMessages.some(existing => 
      existing.id === newMessage.id || 
      (existing.message === newMessage.message && 
       existing.senderId === newMessage.senderId && 
       existing.roomId === newMessage.roomId &&
       Math.abs(existing.timestamp.getTime() - newMessage.timestamp.getTime()) < 5000)
    );
    
    if (!isDuplicate) {
      const updatedMessages = [...currentMessages, newMessage];
      this.messageSubjects.get(roomId)!.next(updatedMessages);
    } else {
      console.log('Duplicate message ignored in ChatService:', newMessage.id);
    }
  }

  async joinRoom(roomId: string, userId: string): Promise<void> {
    // Check if user is authenticated and use backend API
    const currentUser = this.backendAuthService.getCurrentUser();
    const isAuthenticated = this.apiService.isAuthenticated();
    const token = this.apiService.getToken();
    
    console.log('Join room debug:', {
      hasCurrentUser: !!currentUser,
      isAuthenticated,
      hasToken: !!token,
      tokenLength: token?.length,
      userId: currentUser?.uid
    });
    
    if (currentUser && isAuthenticated && token) {
      try {
        const response = await this.apiService.joinChatRoom(roomId).toPromise();
        
        if (response?.success) {
          console.log('User joined room via API:', roomId, userId);
          return Promise.resolve();
        } else {
          throw new Error(response?.message || 'Failed to join room via API');
        }
      } catch (error) {
        console.error('Failed to join room via API, using fallback:', error);
        // Fallback to local handling
        return this.joinRoomFallback(roomId, userId);
      }
    } else {
      console.warn('Using fallback for room join - authentication issue:', {
        hasCurrentUser: !!currentUser,
        isAuthenticated,
        hasToken: !!token
      });
      // Use fallback for unauthenticated users
      return this.joinRoomFallback(roomId, userId);
    }
  }

  /**
   * Fallback method for joining rooms locally
   */
  private joinRoomFallback(roomId: string, userId: string): Promise<void> {
    // Check if room has space
    const room = this.mockChatRooms.find(r => r.id === roomId);
    if (room && room.participants.length >= room.maxParticipants) {
      throw new Error('This group is full. Maximum 20 participants allowed.');
    }
    
    // Add user to participants
    if (room && !room.participants.includes(userId)) {
      room.participants.push(userId);
    }
    
    console.log('User joined room (fallback):', roomId, userId);
    return Promise.resolve();
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    // Check if user is authenticated and use backend API
    const currentUser = this.backendAuthService.getCurrentUser();
    if (currentUser && this.apiService.isAuthenticated()) {
      try {
        const response = await this.apiService.leaveChatRoom(roomId).toPromise();
        
        if (response?.success) {
          console.log('User left room via API:', roomId, userId);
          return Promise.resolve();
        } else {
          throw new Error(response?.message || 'Failed to leave room via API');
        }
      } catch (error) {
        console.error('Failed to leave room via API, using fallback:', error);
        // Fallback to local handling
        return this.leaveRoomFallback(roomId, userId);
      }
    } else {
      // Use fallback for unauthenticated users
      return this.leaveRoomFallback(roomId, userId);
    }
  }

  /**
   * Fallback method for leaving rooms locally
   */
  private leaveRoomFallback(roomId: string, userId: string): Promise<void> {
    const room = this.mockChatRooms.find(r => r.id === roomId);
    if (room) {
      room.participants = room.participants.filter(id => id !== userId);
    }
    
    console.log('User left room (fallback):', roomId, userId);
    return Promise.resolve();
  }

  async createRoom(room: Omit<ChatRoom, 'id'>): Promise<ChatRoom | null> {
    // Check if user is authenticated and use backend API
    const currentUser = this.backendAuthService.getCurrentUser();
    if (currentUser && this.apiService.isAuthenticated()) {
      try {
        const roomData: CreateRoomRequest = {
          name: room.name,
          description: room.description,
          roomType: room.type, // Use the type from the room (general/consultation)
          topic: room.topic,
          isPrivate: room.isPrivate,
          maxParticipants: room.maxParticipants,
          participants: room.participants
        };
        
        const response = await this.apiService.createChatRoom(roomData).toPromise();
        
        if (response?.success && response.data) {
          // Convert API response to ChatRoom and return
          const createdRoom = this.transformApiRoom(response.data);
          console.log('Room created via API:', createdRoom);
          
          // Refresh room list to show the new room
          this.getChatRooms().subscribe(); // This will update the room subjects
          
          return createdRoom;
        } else {
          throw new Error(response?.message || 'Failed to create room via API');
        }
      } catch (error) {
        console.error('Failed to create room via API, using fallback:', error);
        // Fallback to local handling
        return this.createRoomFallback(room);
      }
    } else {
      // Use fallback for unauthenticated users
      return this.createRoomFallback(room);
    }
  }

  /**
   * Fallback method for creating rooms locally
   */
  private createRoomFallback(room: Omit<ChatRoom, 'id'>): ChatRoom {
    const id = this.generateId();
    const newRoom: ChatRoom = {
      ...room,
      id
    };
    
    this.mockChatRooms.push(newRoom);
    console.log('Room created (fallback):', newRoom);
    return newRoom;
  }

  async addModerator(roomId: string, expertId: string): Promise<void> {
    const room = this.mockChatRooms.find(r => r.id === roomId);
    if (room && !room.moderators.includes(expertId)) {
      room.moderators.push(expertId);
    }
    
    console.log('Moderator added to room:', roomId, expertId);
    return Promise.resolve();
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Transform API room data to frontend ChatRoom model
   */
  private transformApiRoom(apiRoom: any): ChatRoom {
    return {
      id: apiRoom.id || apiRoom.room_id,
      name: apiRoom.name,
      description: apiRoom.description,
      type: apiRoom.type || 'general',
      topic: apiRoom.topic,
      isPrivate: apiRoom.is_private || false,
      participants: apiRoom.participants || [],
      moderators: apiRoom.moderators || [],
      maxParticipants: apiRoom.max_participants || 20,
      createdAt: apiRoom.created_at ? new Date(apiRoom.created_at) : new Date(),
      lastMessage: apiRoom.last_message ? {
        id: apiRoom.last_message.id,
        roomId: apiRoom.id,
        senderId: apiRoom.last_message.sender_id,
        senderName: apiRoom.last_message.sender_name,
        senderRole: apiRoom.last_message.sender_role || 'user',
        message: apiRoom.last_message.message,
        timestamp: new Date(apiRoom.last_message.created_at),
        isEdited: false
      } : undefined,
      lastMessageTimestamp: apiRoom.last_message_timestamp ? 
        new Date(apiRoom.last_message_timestamp) : 
        (apiRoom.last_message ? new Date(apiRoom.last_message.created_at) : new Date())
    };
  }

  /**
   * Transform API message data to frontend ChatMessage model
   */
  private transformApiMessage(apiMessage: any): ChatMessage {
    return {
      id: apiMessage.id,
      roomId: apiMessage.room_id,
      senderId: apiMessage.sender_id,
      senderName: apiMessage.sender_name,
      senderRole: apiMessage.sender_role || 'user',
      message: apiMessage.message,
      timestamp: new Date(apiMessage.created_at),
      isEdited: apiMessage.is_edited || false,
      attachments: apiMessage.attachments || []
    };
  }
}