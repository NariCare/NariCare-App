import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Consultation, Expert } from '../models/consultation.model';

@Injectable({
  providedIn: 'root'
})
export class ConsultationService {

  constructor(private firestore: AngularFirestore) {}

  getExperts(): Observable<Expert[]> {
    return this.firestore.collection<Expert>('experts', ref => 
      ref.orderBy('rating', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  getExpert(expertId: string): Observable<Expert | undefined> {
    return this.firestore.doc<Expert>(`experts/${expertId}`).valueChanges({ idField: 'id' });
  }

  getUserConsultations(userId: string): Observable<Consultation[]> {
    return this.firestore.collection<Consultation>('consultations', ref => 
      ref.where('userId', '==', userId)
         .orderBy('scheduledAt', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  scheduleConsultation(consultation: Omit<Consultation, 'id'>): Promise<void> {
    const id = this.firestore.createId();
    return this.firestore.doc(`consultations/${id}`).set({
      ...consultation,
      id
    });
  }

  updateConsultation(id: string, updates: Partial<Consultation>): Promise<void> {
    return this.firestore.doc(`consultations/${id}`).update(updates);
  }

  cancelConsultation(id: string): Promise<void> {
    return this.updateConsultation(id, { status: 'cancelled' });
  }
}