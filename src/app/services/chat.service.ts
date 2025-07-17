import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChatRoom, ChatMessage } from '../models/chat.model';
import { get as _get } from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  constructor(private firestore: AngularFirestore) {}

  getChatRooms(): Observable<ChatRoom[]> {
    return this.firestore.collection<ChatRoom>('chat-rooms', ref => 
      ref.orderBy('createdAt', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  getChatRoom(roomId: string): Observable<ChatRoom | undefined> {
    return this.firestore.doc<ChatRoom>(`chat-rooms/${roomId}`).valueChanges({ idField: 'id' });
  }

  getMessages(roomId: string): Observable<ChatMessage[]> {
    return this.firestore.collection<ChatMessage>(`chat-rooms/${roomId}/messages`, ref => 
      ref.orderBy('timestamp', 'asc')
    ).valueChanges({ idField: 'id' });
  }

  sendMessage(roomId: string, message: Omit<ChatMessage, 'id'>): Promise<void> {
    const id = this.firestore.createId();
    return this.firestore.doc(`chat-rooms/${roomId}/messages/${id}`).set({
      ...message,
      id
    });
  }

  joinRoom(roomId: string, userId: string): Promise<void> {
    const FieldValue = _get(this.firestore, 'firestore.FieldValue') as any;
    return this.firestore.doc(`chat-rooms/${roomId}`).update({
      participants: FieldValue.arrayUnion(userId)
    });
  }

  leaveRoom(roomId: string, userId: string): Promise<void> {
    const FieldValue = _get(this.firestore, 'firestore.FieldValue') as any;
    return this.firestore.doc(`chat-rooms/${roomId}`).update({
      participants: FieldValue.arrayRemove(userId)
    });
  }

  createRoom(room: Omit<ChatRoom, 'id'>): Promise<void> {
    const id = this.firestore.createId();
    return this.firestore.doc(`chat-rooms/${id}`).set({
      ...room,
      id
    });
  }
}