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
   * Supports both single babies and twins
   */
  private getBabyProgress(babies: Array<{name: string, birthDate: Date}>, lastGrowthEntry?: any): BabyProgress {
    if (babies.length === 0) {
      return {
        insight: 'No baby data available for insights.',
        action: 'Add baby information to get personalized insights',
        type: 'general'
      };
    }

    // For single baby, use existing logic
    if (babies.length === 1) {
      return this.getSingleBabyProgress(babies[0].name, babies[0].birthDate, lastGrowthEntry);
    }

    // For multiple babies (twins+), generate combined insights
    return this.getMultipleBabiesProgress(babies, lastGrowthEntry);
  }

  /**
   * Generate insights for a single baby
   */
  private getSingleBabyProgress(babyName: string, birthDate: Date, lastGrowthEntry?: any): BabyProgress {
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
   * Generate combined insights for multiple babies (twins+)
   */
  private getMultipleBabiesProgress(babies: Array<{name: string, birthDate: Date}>, lastGrowthEntry?: any): BabyProgress {
    // Check if all babies are in similar age groups
    const weekAges = babies.map(baby => this.calculateBabyAgeInWeeks(baby.birthDate));
    const minAge = Math.min(...weekAges);
    const maxAge = Math.max(...weekAges);
    
    // If babies are within 2 weeks of each other, treat as twins with combined insight
    if (maxAge - minAge <= 2) {
      return this.getTwinProgress(babies, minAge);
    }
    
    // If babies have different ages, provide general advice
    const babyNames = babies.map(baby => baby.name).join(' and ');
    return {
      insight: `${babyNames} are at different developmental stages. Each baby may have unique feeding patterns and needs.`,
      action: 'Track each baby individually',
      type: 'general'
    };
  }

  /**
   * Generate insights for twins (babies of similar age)
   */
  private getTwinProgress(babies: Array<{name: string, birthDate: Date}>, averageWeekAge: number): BabyProgress {
    const babyNames = babies.map(baby => baby.name).join(' and ');
    
    // Age-based progress insights for twins
    if (averageWeekAge <= 2) {
      return {
        insight: `${babyNames} are in their critical early establishment period. Focus on frequent feeding to build your milk supply for both babies.`,
        action: 'Track feeding sessions for both babies today',
        type: 'feeding'
      };
    }
    
    if (averageWeekAge <= 8) {
      return {
        insight: `${babyNames} are growing rapidly! Growth spurts are common around 6 weeks - extra feeding is normal for twins.`,
        action: 'Monitor feeding patterns for both babies',
        type: 'growth'
      };
    }
    
    if (averageWeekAge <= 24) {
      return {
        insight: `${babyNames} are becoming more efficient at nursing. Your milk supply is likely well-established for both babies now.`,
        action: 'Continue responsive feeding for both',
        type: 'feeding'
      };
    }
    
    if (averageWeekAge <= 32) {
      return {
        insight: `${babyNames} may be starting solid foods soon. Breast milk remains the primary nutrition source for both.`,
        action: 'Prepare for complementary feeding',
        type: 'milestone'
      };
    }
    
    if (averageWeekAge <= 52) {
      return {
        insight: `${babyNames} are exploring solid foods while continuing to nurse. This combination supports healthy development for both.`,
        action: 'Balance solids and breastfeeding for both babies',
        type: 'milestone'
      };
    }
    
    // Toddler stage
    return {
      insight: `${babyNames} continue to benefit from breastfeeding beyond the first year. You're providing ongoing nutrition and comfort to both.`,
      action: 'Celebrate this milestone',
      type: 'milestone'
    };
  }

  /**
   * Get today's insights for babies (supports single baby or twins)
   */
  getTodaysInsights(babies: Array<{name: string, birthDate: Date}>, lastGrowthEntry?: any): Observable<TodaysInsights> {
    // If called with old signature (single baby), convert to new format
    if (!Array.isArray(babies)) {
      console.warn('getTodaysInsights called with deprecated signature. Please pass babies as array.');
      return of({
        babyProgress: {
          insight: 'Unable to generate insights with current parameters.',
          action: 'Please update to use new insights API',
          type: 'general'
        },
        dailyTip: {
          id: 'fallback_001',
          category: 'support',
          title: 'Stay Connected',
          content: 'Remember that every breastfeeding journey is unique. Trust yourself and seek support when needed.',
          source: 'General',
          evidenceLevel: 'Best practice'
        },
        lastUpdated: new Date()
      });
    }

    // Use the first baby's birth date for tip selection (they should be similar age for twins)
    const primaryBirthDate = babies.length > 0 ? babies[0].birthDate : new Date();

    // Wait for tips data to load if not already loaded
    if (!this.tipsData) {
      return new Observable(observer => {
        const checkData = () => {
          if (this.tipsData) {
            const insights: TodaysInsights = {
              babyProgress: this.getBabyProgress(babies, lastGrowthEntry),
              dailyTip: this.getDailyTip(primaryBirthDate),
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
      babyProgress: this.getBabyProgress(babies, lastGrowthEntry),
      dailyTip: this.getDailyTip(primaryBirthDate),
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
  refreshInsights(babies: Array<{name: string, birthDate: Date}>, lastGrowthEntry?: any): Observable<TodaysInsights> {
    // Clear recent tips to allow getting different content
    this.recentlyShownTips.clear();
    return this.getTodaysInsights(babies, lastGrowthEntry);
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