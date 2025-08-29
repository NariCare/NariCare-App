import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface DailyTip {
  id: string;
  category: string;
  title: string;
  content: string;
  source: string;
  evidenceLevel: string;
}

export interface BabyProgress {
  insight: string;
  action: string;
  type: 'feeding' | 'growth' | 'milestone' | 'general';
}

export interface TodaysInsights {
  babyProgress: BabyProgress;
  dailyTip: DailyTip;
  lastUpdated: Date;
}

interface DailyTipsData {
  version: string;
  lastUpdated: string;
  sources: any;
  tipsByAge: { [key: string]: { weekRange: string; tips: DailyTip[] } };
  generalTips: DailyTip[];
}

@Injectable({
  providedIn: 'root'
})
export class InsightsService {
  private tipsData: DailyTipsData | null = null;
  private currentInsights$ = new BehaviorSubject<TodaysInsights | null>(null);
  
  // Track which tips have been shown to avoid immediate repeats
  private recentlyShownTips: Set<string> = new Set();
  private readonly MAX_RECENT_TIPS = 10;

  constructor(private http: HttpClient) {
    this.loadTipsData();
  }

  private async loadTipsData(): Promise<void> {
    try {
      const data = await this.http.get<DailyTipsData>('/assets/data/daily-tips.json').toPromise();
      this.tipsData = data!;
    } catch (error) {
      console.error('Failed to load daily tips data:', error);
      this.tipsData = null;
    }
  }

  /**
   * Calculate baby's age in weeks from birth date
   */
  private calculateBabyAgeInWeeks(birthDate: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  }

  /**
   * Get age category key based on baby's week age
   */
  private getAgeCategory(weekAge: number): string {
    if (weekAge <= 1) return '0-1';
    if (weekAge <= 2) return '1-2';
    if (weekAge <= 4) return '2-4';
    if (weekAge <= 8) return '4-8';
    if (weekAge <= 16) return '8-16';
    if (weekAge <= 24) return '16-24';
    if (weekAge <= 32) return '24-32';
    if (weekAge <= 48) return '32-48';
    if (weekAge <= 104) return '48-104';
    return '104-156';
  }

  /**
   * Get a random tip for baby's current age, avoiding recently shown tips
   */
  private getDailyTip(babyBirthDate: Date): DailyTip {
    if (!this.tipsData) {
      // Fallback tip if data not loaded
      return {
        id: 'fallback_001',
        category: 'support',
        title: 'Stay Connected',
        content: 'Remember that every breastfeeding journey is unique. Trust yourself and seek support when needed.',
        source: 'General',
        evidenceLevel: 'Best practice'
      };
    }

    const weekAge = this.calculateBabyAgeInWeeks(babyBirthDate);
    const ageCategory = this.getAgeCategory(weekAge);
    
    // Get age-appropriate tips
    const ageTips = this.tipsData.tipsByAge[ageCategory]?.tips || [];
    
    // Filter out recently shown tips
    const availableTips = ageTips.filter(tip => !this.recentlyShownTips.has(tip.id));
    
    // If all tips have been shown recently, include general tips
    let finalTips = availableTips;
    if (finalTips.length === 0) {
      finalTips = [...ageTips, ...this.tipsData.generalTips].filter(tip => !this.recentlyShownTips.has(tip.id));
    }
    
    // If still no tips available, clear recent history and use age tips
    if (finalTips.length === 0) {
      this.recentlyShownTips.clear();
      finalTips = ageTips;
    }
    
    // Select random tip
    const selectedTip = finalTips[Math.floor(Math.random() * finalTips.length)] || this.tipsData.generalTips[0];
    
    // Track this tip as recently shown
    this.recentlyShownTips.add(selectedTip.id);
    
    // Keep recent tips list manageable
    if (this.recentlyShownTips.size > this.MAX_RECENT_TIPS) {
      const oldestTip = Array.from(this.recentlyShownTips)[0];
      this.recentlyShownTips.delete(oldestTip);
    }
    
    return selectedTip;
  }

  /**
   * Generate baby progress insight based on age and growth data
   */
  private getBabyProgress(babyName: string, birthDate: Date, lastGrowthEntry?: any): BabyProgress {
    const weekAge = this.calculateBabyAgeInWeeks(birthDate);
    
    // Age-based progress insights
    if (weekAge <= 2) {
      return {
        insight: `${babyName} is in the critical early establishment period. Focus on frequent feeding to build your milk supply.`,
        action: 'Track feeding sessions today',
        type: 'feeding'
      };
    }
    
    if (weekAge <= 8) {
      return {
        insight: `${babyName} is growing rapidly! Growth spurts are common around 6 weeks - extra feeding is normal.`,
        action: 'Monitor feeding patterns',
        type: 'growth'
      };
    }
    
    if (weekAge <= 24) {
      return {
        insight: `${babyName} is becoming more efficient at nursing. Your milk supply is likely well-established now.`,
        action: 'Continue responsive feeding',
        type: 'feeding'
      };
    }
    
    if (weekAge <= 32) {
      return {
        insight: `${babyName} may be starting solid foods soon. Breast milk remains the primary nutrition source.`,
        action: 'Prepare for complementary feeding',
        type: 'milestone'
      };
    }
    
    if (weekAge <= 52) {
      return {
        insight: `${babyName} is exploring solid foods while continuing to nurse. This combination supports healthy development.`,
        action: 'Balance solids and breastfeeding',
        type: 'milestone'
      };
    }
    
    // Toddler stage
    return {
      insight: `${babyName} continues to benefit from breastfeeding beyond the first year. You're providing ongoing nutrition and comfort.`,
      action: 'Celebrate this milestone',
      type: 'milestone'
    };
  }

  /**
   * Get today's insights for a specific baby
   */
  getTodaysInsights(babyName: string, babyBirthDate: Date, lastGrowthEntry?: any): Observable<TodaysInsights> {
    // Wait for tips data to load if not already loaded
    if (!this.tipsData) {
      return new Observable(observer => {
        const checkData = () => {
          if (this.tipsData) {
            const insights: TodaysInsights = {
              babyProgress: this.getBabyProgress(babyName, babyBirthDate, lastGrowthEntry),
              dailyTip: this.getDailyTip(babyBirthDate),
              lastUpdated: new Date()
            };
            observer.next(insights);
            observer.complete();
          } else {
            setTimeout(checkData, 100);
          }
        };
        checkData();
      });
    }

    const insights: TodaysInsights = {
      babyProgress: this.getBabyProgress(babyName, babyBirthDate, lastGrowthEntry),
      dailyTip: this.getDailyTip(babyBirthDate),
      lastUpdated: new Date()
    };

    this.currentInsights$.next(insights);
    return of(insights);
  }

  /**
   * Get current insights observable
   */
  getCurrentInsights(): Observable<TodaysInsights | null> {
    return this.currentInsights$.asObservable();
  }

  /**
   * Force refresh insights (useful for testing or manual refresh)
   */
  refreshInsights(babyName: string, babyBirthDate: Date, lastGrowthEntry?: any): Observable<TodaysInsights> {
    // Clear recent tips to allow getting different content
    this.recentlyShownTips.clear();
    return this.getTodaysInsights(babyName, babyBirthDate, lastGrowthEntry);
  }

  /**
   * Get available tip categories for baby's age
   */
  getAvailableCategories(babyBirthDate: Date): string[] {
    if (!this.tipsData) return [];

    const weekAge = this.calculateBabyAgeInWeeks(babyBirthDate);
    const ageCategory = this.getAgeCategory(weekAge);
    const ageTips = this.tipsData.tipsByAge[ageCategory]?.tips || [];
    
    return Array.from(new Set(ageTips.map(tip => tip.category)));
  }

  /**
   * Get tips by specific category for baby's age
   */
  getTipsByCategory(babyBirthDate: Date, category: string): DailyTip[] {
    if (!this.tipsData) return [];

    const weekAge = this.calculateBabyAgeInWeeks(babyBirthDate);
    const ageCategory = this.getAgeCategory(weekAge);
    const ageTips = this.tipsData.tipsByAge[ageCategory]?.tips || [];
    
    return ageTips.filter(tip => tip.category === category);
  }
}