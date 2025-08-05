import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ChatRoom, ChatMessage } from '../models/chat.model';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

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
    // Return mock messages for demo
    const mockMessages: ChatMessage[] = [
      {
        id: 'msg-1',
        roomId: roomId,
        senderId: 'expert-1',
        senderName: 'Dr. Sarah Johnson',
        senderRole: 'expert',
        message: 'Welcome to the group! I\'m here to help with any breastfeeding questions.',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        isEdited: false
      },
      {
        id: 'msg-2',
        roomId: roomId,
        senderId: 'user-1',
        senderName: 'Sarah M.',
        senderRole: 'user',
        message: 'Thank you! I have a question about latching...',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        isEdited: false
      }
    ];
    
    return of(mockMessages);
  }

  async sendMessage(roomId: string, message: Omit<ChatMessage, 'id'>): Promise<void> {
    // In a real app, this would save to Firestore
    console.log('Sending message to room:', roomId, message);
    return Promise.resolve();
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