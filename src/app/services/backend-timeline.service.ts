import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BabyTimelineItem, BabyTimelineData } from '../models/baby-timeline.model';

@Injectable({
  providedIn: 'root'
})
export class BackendTimelineService {
  private timelineItemsSubject = new BehaviorSubject<BabyTimelineItem[]>([]);
  private userProgressSubject = new BehaviorSubject<Map<string, any>>(new Map());

  constructor(private apiService: ApiService) {
    this.loadTimelineItems();
  }

  // ============================================================================
  // TIMELINE DATA METHODS
  // ============================================================================

  getTimelineForBaby(birthDate: Date): Observable<BabyTimelineData> {
    const currentWeek = this.calculateCurrentWeek(birthDate);
    
    return this.timelineItemsSubject.pipe(
      map(allItems => {
        // Get current week items
        const currentItems = allItems.filter(item => 
          currentWeek >= item.weekStart && currentWeek <= item.weekEnd
        );
        
        // Get upcoming items (next 4 weeks)
        const upcomingItems = allItems.filter(item => 
          item.weekStart > currentWeek && item.weekStart <= currentWeek + 4
        ).slice(0, 4);
        
        // Get recently completed items
        const recentItems = allItems.filter(item => 
          item.weekEnd < currentWeek && item.weekEnd >= currentWeek - 4
        ).slice(-3);

        // Combine all relevant items for display
        const allRelevantItems = [
          ...recentItems,
          ...currentItems,
          ...upcomingItems
        ].sort((a, b) => a.weekStart - b.weekStart);

        return {
          currentWeek,
          items: allRelevantItems,
          upcomingMilestones: upcomingItems,
          recentlyCompleted: recentItems,
          allWeeks: allItems.sort((a, b) => a.weekStart - b.weekStart)
        };
      })
    );
  }

  getBabyTimeline(babyId: string): Observable<BabyTimelineData> {
    return this.apiService.getBabyTimeline(babyId).pipe(
      map(response => {
        if (response.success && response.data) {
          return this.transformTimelineData(response.data);
        }
        
        // Fallback to local timeline calculation
        throw new Error('Failed to load timeline from API');
      }),
      catchError((error) => {
        console.error('Error loading baby timeline from API:', error);
        
        // Fallback: use local timeline items with current week calculation
        // This requires the baby's birth date, which we'd need to get from the baby service
        return this.timelineItemsSubject.pipe(
          map(items => ({
            currentWeek: 0, // Would need baby's birth date to calculate
            items: items.slice(0, 10), // Show first 10 items as fallback
            upcomingMilestones: items.slice(0, 3),
            recentlyCompleted: [],
            allWeeks: items
          }))
        );
      })
    );
  }

  getTimelineItemsForWeek(week: number): Observable<BabyTimelineItem[]> {
    return this.timelineItemsSubject.pipe(
      map(items => items.filter(item => 
        week >= item.weekStart && week <= item.weekEnd
      ))
    );
  }

  getAllTimelineItems(): BabyTimelineItem[] {
    return this.timelineItemsSubject.value;
  }

  searchTimelineItems(searchTerm: string, options?: {
    category?: string;
    weekRange?: string;
  }): Observable<BabyTimelineItem[]> {
    return this.apiService.searchTimelineItems(searchTerm, options).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.map(this.transformTimelineItem);
        }
        return [];
      }),
      catchError((error) => {
        console.error('Error searching timeline items:', error);
        return of([]);
      })
    );
  }

  // ============================================================================
  // PROGRESS TRACKING METHODS
  // ============================================================================

  async markItemCompleted(babyId: string, itemId: string, notes?: string): Promise<void> {
    try {
      const response = await this.apiService.markTimelineItemCompleted(babyId, itemId, notes).toPromise();
      
      if (response?.success) {
        // Update local progress cache
        const currentProgress = this.userProgressSubject.value;
        const babyProgress = currentProgress.get(babyId) || {};
        babyProgress[itemId] = {
          isCompleted: true,
          completedAt: new Date(),
          notes: notes
        };
        currentProgress.set(babyId, babyProgress);
        this.userProgressSubject.next(new Map(currentProgress));
        
        // Update timeline items with completion status
        this.updateTimelineItemCompletion(itemId, true, new Date());
      } else {
        throw new Error(response?.message || 'Failed to mark item as completed');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async unmarkItemCompleted(babyId: string, itemId: string): Promise<void> {
    try {
      const response = await this.apiService.unmarkTimelineItem(babyId, itemId).toPromise();
      
      if (response?.success) {
        // Update local progress cache
        const currentProgress = this.userProgressSubject.value;
        const babyProgress = currentProgress.get(babyId) || {};
        delete babyProgress[itemId];
        currentProgress.set(babyId, babyProgress);
        this.userProgressSubject.next(new Map(currentProgress));
        
        // Update timeline items with completion status
        this.updateTimelineItemCompletion(itemId, false);
      } else {
        throw new Error(response?.message || 'Failed to unmark item');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  getMilestoneSummary(babyId: string): Observable<any> {
    return this.apiService.getMilestoneSummary(babyId).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      }),
      catchError((error) => {
        console.error('Error loading milestone summary:', error);
        return of(null);
      })
    );
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private loadTimelineItems(): void {
    this.apiService.getTimelineItems().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const items = response.data.map(this.transformTimelineItem);
          this.timelineItemsSubject.next(items);
        }
      },
      error: (error) => {
        console.error('Error loading timeline items:', error);
        // Fallback to local timeline data if API fails
        this.loadFallbackTimelineData();
      }
    });
  }

  private loadFallbackTimelineData(): void {
    // Use the same timeline data from the local service as fallback
    const fallbackData: BabyTimelineItem[] = [
      {
        id: 'birth-week',
        weekStart: 0,
        weekEnd: 0,
        title: 'Welcome to the world!',
        shortTitle: 'Birth',
        description: 'Your baby has arrived! This is the beginning of your beautiful journey together.',
        category: 'milestone',
        icon: 'heart',
        color: '#e91e63',
        whatToExpected: [
          'Baby will want to feed 8-12 times in 24 hours',
          'Colostrum (liquid gold) is all baby needs',
          'Skin-to-skin contact helps with bonding',
          'Baby may lose 5-7% of birth weight (normal!)'
        ],
        tips: [
          'Start breastfeeding within the first hour if possible',
          'Keep baby skin-to-skin as much as possible',
          'Let baby feed as often as they want',
          'Don\'t worry about schedules yet - follow baby\'s cues'
        ],
        whenToWorry: [
          'Baby won\'t wake up to feed',
          'No wet diapers in first 24 hours',
          'Baby seems very lethargic'
        ]
      },
      // Add more timeline items as needed...
    ];
    
    this.timelineItemsSubject.next(fallbackData);
  }

  private calculateCurrentWeek(birthDate: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  }

  private updateTimelineItemCompletion(itemId: string, isCompleted: boolean, completedAt?: Date): void {
    const currentItems = this.timelineItemsSubject.value;
    const updatedItems = currentItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          isCompleted,
          completedAt
        };
      }
      return item;
    });
    this.timelineItemsSubject.next(updatedItems);
  }

  // ============================================================================
  // DATA TRANSFORMATION METHODS
  // ============================================================================

  private transformTimelineData = (apiData: any): BabyTimelineData => {
    return {
      currentWeek: apiData.current_week || apiData.currentWeek || 0,
      items: (apiData.items || []).map(this.transformTimelineItem),
      upcomingMilestones: (apiData.upcoming_milestones || apiData.upcomingMilestones || []).map(this.transformTimelineItem),
      recentlyCompleted: (apiData.recently_completed || apiData.recentlyCompleted || []).map(this.transformTimelineItem),
      allWeeks: (apiData.all_weeks || apiData.allWeeks || []).map(this.transformTimelineItem)
    };
  };

  private transformTimelineItem = (apiItem: any): BabyTimelineItem => {
    // Parse JSON content if it's a string
    let parsedContent = apiItem.content;
    if (typeof parsedContent === 'string') {
      try {
        parsedContent = JSON.parse(parsedContent);
      } catch (error) {
        console.warn('Failed to parse timeline item content:', error);
        parsedContent = {};
      }
    }

    return {
      id: apiItem.id,
      weekStart: apiItem.week_start || apiItem.weekStart,
      weekEnd: apiItem.week_end || apiItem.weekEnd,
      title: apiItem.title,
      shortTitle: apiItem.short_title || apiItem.shortTitle,
      description: apiItem.description,
      category: apiItem.category,
      icon: apiItem.icon,
      color: apiItem.color,
      isCompleted: apiItem.is_completed || apiItem.isCompleted,
      completedAt: apiItem.completed_at ? new Date(apiItem.completed_at) : undefined,
      tips: parsedContent.tips || [],
      whatToExpected: parsedContent.whatToExpected || parsedContent.what_to_expected || [],
      whenToWorry: parsedContent.whenToWorry || parsedContent.when_to_worry || [],
      videoLinks: parsedContent.videoLinks || parsedContent.video_links || [],
      cdcMilestones: parsedContent.cdcMilestones || parsedContent.cdc_milestones || []
    };
  };

  private getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }
    
    if (error?.error?.message) {
      return error.error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  // ============================================================================
  // UTILITY METHODS FOR COMPATIBILITY
  // ============================================================================

  // Get timeline items in chunks for pagination
  getTimelineChunk(startWeek: number, endWeek: number): BabyTimelineItem[] {
    return this.timelineItemsSubject.value.filter(item => 
      item.weekStart >= startWeek && item.weekEnd <= endWeek
    );
  }

  // Get timeline items by category
  getTimelineByCategory(category: string): BabyTimelineItem[] {
    return this.timelineItemsSubject.value.filter(item => item.category === category);
  }

  // Method to refresh timeline data
  refreshTimeline(): void {
    this.loadTimelineItems();
  }
}