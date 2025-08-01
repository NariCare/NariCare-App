import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { 
  GrowthRecord, 
  WeightRecord, 
  StoolRecord,
  StoolColor,
  StoolTexture,
  StoolSize,
  MoodType, 
  StarPerformer, 
  QuickLogSuggestion 
} from '../models/growth-tracking.model';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root'
})
export class GrowthTrackingService {
  private recordsSubject = new BehaviorSubject<GrowthRecord[]>([]);
  private weightRecordsSubject = new BehaviorSubject<WeightRecord[]>([]);
  private stoolRecordsSubject = new BehaviorSubject<StoolRecord[]>([]);
  
  // Available mood options
  readonly moodOptions: MoodType[] = [
    { emoji: '😊', label: 'Great', value: 'great', color: '#10b981' },
    { emoji: '🙂', label: 'Good', value: 'good', color: '#059669' },
    { emoji: '😐', label: 'Okay', value: 'okay', color: '#6b7280' },
    { emoji: '😴', label: 'Tired', value: 'tired', color: '#f59e0b' },
    { emoji: '😟', label: 'Worried', value: 'worried', color: '#f97316' },
    { emoji: '😰', label: 'Overwhelmed', value: 'overwhelmed', color: '#ef4444' }
  ];

  // Available stool color options
  readonly stoolColorOptions: StoolColor[] = [
    { value: 'very-dark', label: 'Very dark', color: '#374151' },
    { value: 'dark-green', label: 'Dark green', color: '#059669' },
    { value: 'dark-brown', label: 'Dark brown', color: '#92400e' },
    { value: 'mustard-yellow', label: 'Mustard yellow', color: '#d97706' },
    { value: 'other', label: 'Other', color: '#ef4444' }
  ];

  // Available stool texture options
  readonly stoolTextureOptions: StoolTexture[] = [
    { value: 'liquid', label: 'Liquid', icon: 'water' },
    { value: 'pasty', label: 'Pasty', icon: 'ellipse' },
    { value: 'hard', label: 'Hard', icon: 'diamond' },
    { value: 'snotty', label: 'Snotty', icon: 'trail-sign' },
    { value: 'bloody', label: 'Bloody', icon: 'medical' }
  ];

  // Available stool size options
  readonly stoolSizeOptions: StoolSize[] = [
    { value: 'coin', label: 'Coin', icon: 'ellipse-outline' },
    { value: 'tablespoon', label: 'Tablespoon', icon: 'ellipse' },
    { value: 'bigger', label: 'Bigger', icon: 'ellipse' }
  ];

  constructor(private storage: Storage) {
    this.initStorage();
  }

  private async initStorage() {
    await this.storage.create();
    this.loadStoredData();
  }

  public async loadStoredData() {
    try {
      const records = await this.storage.get('growthRecords') || [];
      const weightRecords = await this.storage.get('weightRecords') || [];
      const stoolRecords = await this.storage.get('stoolRecords') || [];
      
      this.recordsSubject.next(records.map((r: any) => ({
        ...r,
        date: new Date(r.date),
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt)
      })));
      
      this.weightRecordsSubject.next(weightRecords.map((r: any) => ({
        ...r,
        date: new Date(r.date),
        createdAt: new Date(r.createdAt)
      })));
      
      this.stoolRecordsSubject.next(stoolRecords.map((r: any) => ({
        ...r,
        date: new Date(r.date),
        createdAt: new Date(r.createdAt)
      })));
    } catch (error) {
      console.error('Error loading stored data:', error);
    }
  }

  async addGrowthRecord(record: Omit<GrowthRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const id = this.generateId();
    const newRecord: GrowthRecord = {
      ...record,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const currentRecords = this.recordsSubject.value;
    const updatedRecords = [newRecord, ...currentRecords];
    
    this.recordsSubject.next(updatedRecords);
    await this.storage.set('growthRecords', updatedRecords);
    
    // Check for quick log suggestions
    this.generateQuickLogSuggestions(record.recordedBy);
  }

  getGrowthRecords(babyId: string): Observable<GrowthRecord[]> {
    return this.recordsSubject.pipe(
      map(records => records
        .filter(record => record.babyId === babyId)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
      )
    );
  }

  // Get last 3 days of records for reference while entering new data
  getRecentRecords(babyId: string, days: number = 3): Observable<GrowthRecord[]> {
    return this.getGrowthRecords(babyId).pipe(
      map(records => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        return records.filter(record => record.date >= cutoffDate);
      })
    );
  }

  async addWeightRecord(record: Omit<WeightRecord, 'id' | 'createdAt'>): Promise<void> {
    const id = this.generateId();
    const newRecord: WeightRecord = {
      ...record,
      id,
      createdAt: new Date()
    };
    
    const currentRecords = this.weightRecordsSubject.value;
    const updatedRecords = [newRecord, ...currentRecords];
    
    this.weightRecordsSubject.next(updatedRecords);
    await this.storage.set('weightRecords', updatedRecords);
  }

  async addStoolRecord(record: Omit<StoolRecord, 'id' | 'createdAt'>): Promise<void> {
    const id = this.generateId();
    const newRecord: StoolRecord = {
      ...record,
      id,
      createdAt: new Date()
    };
    
    const currentRecords = this.stoolRecordsSubject.value;
    const updatedRecords = [newRecord, ...currentRecords];
    
    this.stoolRecordsSubject.next(updatedRecords);
    await this.storage.set('stoolRecords', updatedRecords);
  }

  getStoolRecords(babyId: string): Observable<StoolRecord[]> {
    return this.stoolRecordsSubject.pipe(
      map(records => records
        .filter(record => record.babyId === babyId)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
      )
    );
  }

  getWeightRecords(babyId: string): Observable<WeightRecord[]> {
    return this.weightRecordsSubject.pipe(
      map(records => records
        .filter(record => record.babyId === babyId)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
      )
    );
  }

  // Check if weight reminder should be sent
  shouldSendWeightReminder(babyId: string): Observable<boolean> {
    return this.getWeightRecords(babyId).pipe(
      map((records: WeightRecord[]) => {
        if (records.length === 0) return true;
        
        const lastRecord = records[0];
        const daysSinceLastRecord = Math.floor(
          (new Date().getTime() - lastRecord.date.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return daysSinceLastRecord >= 7;
      })
    );
  }

  // Star performer tracking
  async calculateStarPerformers(weekStartDate: Date): Promise<StarPerformer[]> {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);
    
    const allRecords = this.recordsSubject.value;
    const weekRecords = allRecords.filter(record => 
      record.date >= weekStartDate && record.date < weekEndDate
    );
    
    // Group by user and calculate consistency scores
    const userScores = new Map<string, { count: number, userId: string }>();
    
    weekRecords.forEach(record => {
      const current = userScores.get(record.recordedBy) || { count: 0, userId: record.recordedBy };
      current.count++;
      userScores.set(record.recordedBy, current);
    });
    
    // Convert to star performers and rank
    const performers: StarPerformer[] = Array.from(userScores.entries())
      .map(([userId, data]) => ({
        userId,
        userName: `User ${userId.slice(-4)}`, // In real app, get from user service
        weekStartDate,
        weekEndDate,
        consistencyScore: data.count,
        rank: 0,
        isEliteCandidate: data.count >= 5, // 5+ entries per week
        consecutiveWeeks: 1 // Would calculate from historical data
      }))
      .sort((a, b) => b.consistencyScore - a.consistencyScore)
      .map((performer, index) => ({ ...performer, rank: index + 1 }));
    
    return performers.slice(0, 3); // Top 3 performers
  }

  // Quick log suggestions based on patterns
  generateQuickLogSuggestions(userId: string): void {
    const userRecords = this.recordsSubject.value
      .filter(record => record.recordedBy === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    if (userRecords.length < 2) return;
    
    const lastRecord = userRecords[0];
    const now = new Date();
    const hoursSinceLastLog = (now.getTime() - lastRecord.date.getTime()) / (1000 * 60 * 60);
    
    // Suggest feeding if it's been 2-4 hours
    if (hoursSinceLastLog >= 2 && hoursSinceLastLog <= 6) {
      const suggestion: QuickLogSuggestion = {
        id: this.generateId(),
        userId,
        suggestedAction: 'feeding',
        lastLoggedTime: lastRecord.date,
        suggestedTime: now,
        message: `You logged a feed ${Math.floor(hoursSinceLastLog)} hours ago. Baby usually feeds every 2–3 hours. Should you log another?`,
        isActive: true,
        createdAt: now
      };
      
      // In real app, this would trigger a notification
      console.log('Quick log suggestion:', suggestion.message);
    }
  }

  getMoodOptions(): MoodType[] {
    return this.moodOptions;
  }

  getStoolColorOptions(): StoolColor[] {
    return this.stoolColorOptions;
  }

  getStoolTextureOptions(): StoolTexture[] {
    return this.stoolTextureOptions;
  }

  getStoolSizeOptions(): StoolSize[] {
    return this.stoolSizeOptions;
  }

  async updateGrowthRecord(id: string, updates: Partial<GrowthRecord>): Promise<void> {
    const currentRecords = this.recordsSubject.value;
    const updatedRecords = currentRecords.map(record => 
      record.id === id 
        ? { ...record, ...updates, updatedAt: new Date() }
        : record
    );
    
    this.recordsSubject.next(updatedRecords);
    await this.storage.set('growthRecords', updatedRecords);
  }

  async deleteGrowthRecord(id: string): Promise<void> {
    const currentRecords = this.recordsSubject.value;
    const updatedRecords = currentRecords.filter(record => record.id !== id);
    
    this.recordsSubject.next(updatedRecords);
    await this.storage.set('growthRecords', updatedRecords);
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}