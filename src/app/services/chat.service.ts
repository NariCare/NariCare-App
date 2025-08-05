import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { ChatRoom, ChatMessage } from '../models/chat.model';
import { Storage } from '@ionic/storage-angular';

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
      name: 'Newborn Support Group',
      description: 'Support for mothers with newborns (0-3 months)',
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
    },
    {
      id: 'general-working-moms',
      name: 'Working Moms Support',
      description: 'Support for mothers returning to work while breastfeeding',
      type: 'general',
      topic: 'work',
      isPrivate: false,
      participants: ['user-10', 'user-11'],
      moderators: ['expert-2'],
      maxParticipants: 20,
      createdAt: new Date('2024-01-20'),
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

  constructor(private storage: Storage) {
    this.initStorage();
  }

  private async initStorage() {
    await this.storage.create();
  }
  getChatRooms(): Observable<ChatRoom[]> {
    return of(this.mockChatRooms.sort((a, b) => 
      (b.lastMessageTimestamp?.getTime() || 0) - (a.lastMessageTimestamp?.getTime() || 0)
    ));
  }

  getGeneralChatRooms(): Observable<ChatRoom[]> {
    const generalRooms = this.mockChatRooms.filter(room => room.type === 'general');
    return of(generalRooms);
  }

  getUserChatRooms(userId: string): Observable<ChatRoom[]> {
    const userRooms = this.mockChatRooms.filter(room => 
      room.participants.includes(userId) || room.moderators.includes(userId)
    );
    return of(userRooms);
  }

  getChatRoom(roomId: string): Observable<ChatRoom | undefined> {
    const room = this.mockChatRooms.find(r => r.id === roomId);
    return of(room);
  }

  getMessages(roomId: string): Observable<ChatMessage[]> {
    // Get or create a BehaviorSubject for this room
    if (!this.messageSubjects.has(roomId)) {
      const initialMessages = this.mockMessages[roomId] || [];
      this.messageSubjects.set(roomId, new BehaviorSubject<ChatMessage[]>(initialMessages));
    }
    
    return this.messageSubjects.get(roomId)!.asObservable();
  }

  async sendMessage(roomId: string, message: Omit<ChatMessage, 'id'>): Promise<void> {
    const id = this.generateId();
    const newMessage: ChatMessage = {
      ...message,
      id,
      timestamp: new Date()
    };
    
    // Get or create message subject for this room
    if (!this.messageSubjects.has(roomId)) {
      this.messageSubjects.set(roomId, new BehaviorSubject<ChatMessage[]>([]));
    }
    
    const currentMessages = this.messageSubjects.get(roomId)!.value;
    const updatedMessages = [...currentMessages, newMessage];
    
    // Update the BehaviorSubject to emit new messages
    this.messageSubjects.get(roomId)!.next(updatedMessages);
    
    // Update room's last message info
    const room = this.mockChatRooms.find(r => r.id === roomId);
    if (room) {
      room.lastMessage = newMessage;
      room.lastMessageTimestamp = newMessage.timestamp;
    }
    
    console.log('Message sent to room:', roomId, newMessage);
  }

  async joinRoom(roomId: string, userId: string): Promise<void> {
    // Check if room has space
    const room = this.mockChatRooms.find(r => r.id === roomId);
    if (room && room.participants.length >= room.maxParticipants) {
      throw new Error('This group is full. Maximum 20 participants allowed.');
    }
    
    // Add user to participants
    if (room && !room.participants.includes(userId)) {
      room.participants.push(userId);
    }
    
    console.log('User joined room:', roomId, userId);
    return Promise.resolve();
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const room = this.mockChatRooms.find(r => r.id === roomId);
    if (room) {
      room.participants = room.participants.filter(id => id !== userId);
    }
    
    console.log('User left room:', roomId, userId);
    return Promise.resolve();
  }

  async createRoom(room: Omit<ChatRoom, 'id'>): Promise<void> {
    const id = this.generateId();
    const newRoom: ChatRoom = {
      ...room,
      id
    };
    
    this.mockChatRooms.push(newRoom);
    console.log('Room created:', newRoom);
    return Promise.resolve();
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
}