import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Consultation, Expert } from '../models/consultation.model';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root'
})
export class ConsultationService {

  // Mock experts data
  private mockExperts: Expert[] = [
    {
      id: 'expert-1',
      name: 'Dr. Sarah Johnson',
      credentials: 'IBCLC, RN, MSN',
      specialties: ['Newborn Care', 'Latching Issues', 'Milk Supply'],
      bio: 'Certified lactation consultant with 15+ years of experience helping new mothers. Specializes in newborn care and early breastfeeding challenges.',
      profileImage: 'https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=300',
      rating: 4.9,
      totalConsultations: 1250,
      availability: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true },
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isAvailable: true },
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isAvailable: true },
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isAvailable: true },
        { dayOfWeek: 5, startTime: '09:00', endTime: '15:00', isAvailable: true }
      ]
    },
    {
      id: 'expert-2',
      name: 'Lisa Martinez',
      credentials: 'IBCLC, CLC',
      specialties: ['Pumping Support', 'Return to Work', 'Supply Issues'],
      bio: 'Passionate about supporting working mothers. Expert in pumping strategies and maintaining milk supply while returning to work.',
      profileImage: 'https://images.pexels.com/photos/5327921/pexels-photo-5327921.jpeg?auto=compress&cs=tinysrgb&w=300',
      rating: 4.8,
      totalConsultations: 890,
      availability: [
        { dayOfWeek: 1, startTime: '10:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 2, startTime: '10:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 3, startTime: '10:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 5, startTime: '10:00', endTime: '16:00', isAvailable: true },
        { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', isAvailable: true }
      ]
    },
    {
      id: 'expert-3',
      name: 'Dr. Emily Chen',
      credentials: 'IBCLC, MD, Pediatrician',
      specialties: ['Premature Babies', 'Medical Complications', 'Weight Gain'],
      bio: 'Board-certified pediatrician and lactation consultant. Specializes in complex cases including premature babies and medical complications.',
      profileImage: 'https://images.pexels.com/photos/5327656/pexels-photo-5327656.jpeg?auto=compress&cs=tinysrgb&w=300',
      rating: 4.9,
      totalConsultations: 2100,
      availability: [
        { dayOfWeek: 2, startTime: '08:00', endTime: '16:00', isAvailable: true },
        { dayOfWeek: 3, startTime: '08:00', endTime: '16:00', isAvailable: true },
        { dayOfWeek: 4, startTime: '08:00', endTime: '16:00', isAvailable: true },
        { dayOfWeek: 5, startTime: '08:00', endTime: '14:00', isAvailable: true }
      ]
    }
  ];

  constructor(private storage: Storage) {
    this.initStorage();
  }

  private async initStorage() {
    await this.storage.create();
  }
  getExperts(): Observable<Expert[]> {
    return of(this.mockExperts);
  }

  getExpert(expertId: string): Observable<Expert | undefined> {
    const expert = this.mockExperts.find(e => e.id === expertId);
    return of(expert);
  }

  getUserConsultations(userId: string): Observable<Consultation[]> {
    // Return mock consultations for demo
    const mockConsultations: Consultation[] = [
      {
        id: 'consultation-1',
        userId: userId,
        expertId: 'expert-1',
        type: 'scheduled',
        status: 'scheduled',
        scheduledAt: new Date(Date.now() + 0.1 * 60 * 60 * 1000), // 2 days from now
        duration: 30,
        topic: 'Latching Issues',
        notes: 'Baby having trouble latching properly',
        followUpRequired: false,
        meetingLink: 'https://meet.jit.si/naricare-consultation-demo-1',
        reminderSent: false
      },
      {
        id: 'consultation-2',
        userId: userId,
        expertId: 'expert-2',
        type: 'scheduled',
        status: 'scheduled',
        scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        duration: 30,
        topic: 'Return to Work',
        notes: 'Need help with pumping schedule for returning to work',
        followUpRequired: false,
        meetingLink: 'https://meet.jit.si/naricare-consultation-demo-2',
        reminderSent: false
      }
    ];
    
    return of(mockConsultations);
  }

  async scheduleConsultation(consultation: Omit<Consultation, 'id'>): Promise<void> {
    // In a real app, this would save to Firestore
    // For demo, we'll just store in localStorage
    const id = this.generateId();
    const newConsultation: Consultation = {
      ...consultation,
      id
    };
    
    const existingConsultations = await this.storage.get('consultations') || [];
    existingConsultations.push(newConsultation);
    await this.storage.set('consultations', existingConsultations);
    
    console.log('Consultation scheduled:', newConsultation);
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  updateConsultation(id: string, updates: Partial<Consultation>): Promise<void> {
    // Mock implementation
    console.log('Updating consultation:', id, updates);
    return Promise.resolve();
  }

  cancelConsultation(id: string): Promise<void> {
    return this.updateConsultation(id, { status: 'cancelled' });
  }
}