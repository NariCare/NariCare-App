import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GrowthRecord, GrowthChart, ChartDataPoint, Milestone } from '../models/growth-tracking.model';

@Injectable({
  providedIn: 'root'
})
export class GrowthTrackingService {

  constructor(private firestore: AngularFirestore) {}

  addGrowthRecord(record: Omit<GrowthRecord, 'id'>): Promise<void> {
    const id = this.firestore.createId();
    return this.firestore.doc(`growth-records/${id}`).set({
      ...record,
      id
    });
  }

  getGrowthRecords(babyId: string): Observable<GrowthRecord[]> {
    return this.firestore.collection<GrowthRecord>('growth-records', ref => 
      ref.where('babyId', '==', babyId)
         .orderBy('date', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  getLatestGrowthRecord(babyId: string): Observable<GrowthRecord | null> {
    return this.firestore.collection<GrowthRecord>('growth-records', ref => 
      ref.where('babyId', '==', babyId)
         .orderBy('date', 'desc')
         .limit(1)
    ).valueChanges({ idField: 'id' }).pipe(
      map(records => records.length > 0 ? records[0] : null)
    );
  }

  generateGrowthChart(babyId: string, chartType: 'weight' | 'height' | 'head-circumference'): Observable<GrowthChart> {
    return this.getGrowthRecords(babyId).pipe(
      map(records => {
        const data: ChartDataPoint[] = records.map(record => ({
          date: record.date,
          value: chartType === 'weight' ? record.weight : 
                chartType === 'height' ? record.height : 
                record.headCircumference || 0,
          percentile: this.calculatePercentile(
            chartType === 'weight' ? record.weight : 
            chartType === 'height' ? record.height : 
            record.headCircumference || 0,
            chartType,
            this.calculateAgeInWeeks(record.date, records[records.length - 1]?.date || new Date())
          )
        })).reverse();

        return {
          babyId,
          chartType,
          data,
          percentile: data.length > 0 ? data[data.length - 1].percentile || 50 : 50,
          lastUpdated: new Date()
        };
      })
    );
  }

  addMilestone(babyId: string, milestone: Omit<Milestone, 'id'>): Promise<void> {
    const id = this.firestore.createId();
    return this.firestore.doc(`babies/${babyId}/milestones/${id}`).set({
      ...milestone,
      id
    });
  }

  getMilestones(babyId: string): Observable<Milestone[]> {
    return this.firestore.collection<Milestone>(`babies/${babyId}/milestones`, ref =>
      ref.orderBy('achievedAt', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  private calculatePercentile(value: number, type: string, ageInWeeks: number): number {
    // Simplified percentile calculation - in a real app, this would use WHO growth charts
    const growthStandards = {
      weight: { mean: 3.5 + (ageInWeeks * 0.15), stdDev: 0.5 },
      height: { mean: 50 + (ageInWeeks * 0.7), stdDev: 2.5 },
      'head-circumference': { mean: 35 + (ageInWeeks * 0.3), stdDev: 1.2 }
    };

    const standard = growthStandards[type as keyof typeof growthStandards];
    if (!standard) return 50;

    const zScore = (value - standard.mean) / standard.stdDev;
    return Math.max(3, Math.min(97, 50 + (zScore * 15)));
  }

  private calculateAgeInWeeks(birthDate: Date, currentDate: Date): number {
    const diffTime = Math.abs(currentDate.getTime() - birthDate.getTime());
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks;
  }

  updateGrowthRecord(id: string, updates: Partial<GrowthRecord>): Promise<void> {
    return this.firestore.doc(`growth-records/${id}`).update(updates);
  }

  deleteGrowthRecord(id: string): Promise<void> {
    return this.firestore.doc(`growth-records/${id}`).delete();
  }
}