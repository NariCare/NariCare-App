import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BabyTimelineItem, BabyTimelineData } from '../models/baby-timeline.model';

@Injectable({
  providedIn: 'root'
})
export class BabyTimelineService {
  
  private readonly timelineData: BabyTimelineItem[] = [
    // Week 0-2: Newborn Period
    {
      id: 'newborn-feeding',
      weekStart: 0,
      weekEnd: 2,
      title: 'First Feeds & Bonding',
      description: 'Your baby is learning to breastfeed and you\'re both getting to know each other',
      category: 'feeding',
      icon: 'heart',
      color: '#e91e63',
      whatToExpect: [
        'Baby feeds 8-12 times per day',
        'Colostrum (liquid gold) provides perfect nutrition',
        'Baby may lose 5-7% of birth weight initially',
        'Cluster feeding is completely normal'
      ],
      tips: [
        'Skin-to-skin contact helps with bonding and feeding',
        'Let baby feed as often as they want',
        'Don\'t worry about schedules yet',
        'Rest when baby rests'
      ],
      whenToWorry: [
        'No wet diapers for 24 hours',
        'Baby seems lethargic or won\'t wake to feed',
        'Severe nipple pain that doesn\'t improve'
      ]
    },
    {
      id: 'milk-coming-in',
      weekStart: 2,
      weekEnd: 4,
      title: 'Milk Supply Establishing',
      description: 'Your mature milk is coming in and feeding patterns are developing',
      category: 'feeding',
      icon: 'water',
      color: '#26a69a',
      whatToExpect: [
        'Breasts may feel full and heavy',
        'Baby starts gaining weight steadily',
        'Feeding sessions may become more predictable',
        'You might experience some engorgement'
      ],
      tips: [
        'Feed frequently to prevent engorgement',
        'Use cold compresses between feeds if needed',
        'Ensure baby empties one breast before switching',
        'Stay hydrated and eat well'
      ],
      whenToWorry: [
        'Severe engorgement that doesn\'t improve',
        'Baby not gaining weight by day 10-14',
        'Signs of mastitis (fever, red streaks)'
      ]
    },
    // Week 4-8: Early Infancy
    {
      id: 'growth-spurt-6weeks',
      weekStart: 4,
      weekEnd: 8,
      title: '6-Week Growth Spurt',
      description: 'Baby is going through their first major growth spurt',
      category: 'development',
      icon: 'trending-up',
      color: '#ff7043',
      whatToExpect: [
        'Increased appetite and more frequent feeding',
        'Baby may be fussier than usual',
        'Your milk supply will increase to meet demand',
        'Growth spurt typically lasts 2-3 days'
      ],
      tips: [
        'Follow baby\'s lead and feed on demand',
        'Don\'t supplement unless medically necessary',
        'Get extra rest and support',
        'Trust your body to make enough milk'
      ],
      whenToWorry: [
        'Baby seems inconsolable for extended periods',
        'Significant decrease in wet/dirty diapers',
        'You feel overwhelmed and need support'
      ]
    },
    {
      id: 'social-smiles',
      weekStart: 6,
      weekEnd: 10,
      title: 'First Social Smiles',
      description: 'Your baby is starting to smile and interact more socially',
      category: 'milestone',
      icon: 'happy',
      color: '#4caf50',
      whatToExpected: [
        'Baby smiles in response to your voice',
        'More alert periods during the day',
        'Beginning to coo and make sounds',
        'Better head control during tummy time'
      ],
      tips: [
        'Talk and sing to your baby often',
        'Make eye contact during feeding',
        'Respond to baby\'s cues and sounds',
        'Enjoy these precious bonding moments'
      ]
    },
    // Week 8-12: Developing Patterns
    {
      id: 'feeding-patterns',
      weekStart: 8,
      weekEnd: 12,
      title: 'Feeding Patterns Emerging',
      description: 'Feeding is becoming more predictable and efficient',
      category: 'feeding',
      icon: 'time',
      color: '#42a5f5',
      whatToExpect: [
        'Feeds may space out to every 2-3 hours',
        'Baby feeds more efficiently',
        'Longer stretches between night feeds',
        'You feel more confident with breastfeeding'
      ],
      tips: [
        'Still follow baby\'s cues rather than strict schedules',
        'Enjoy longer awake periods with baby',
        'Consider introducing a bedtime routine',
        'Take care of your own nutrition and hydration'
      ]
    },
    {
      id: 'growth-spurt-3months',
      weekStart: 10,
      weekEnd: 14,
      title: '3-Month Growth Spurt',
      description: 'Another growth spurt brings increased appetite and development',
      category: 'development',
      icon: 'trending-up',
      color: '#ff7043',
      whatToExpect: [
        'Increased feeding frequency again',
        'Baby may seem hungrier than usual',
        'Possible temporary fussiness',
        'Rapid physical and mental development'
      ],
      tips: [
        'Increase feeding frequency as needed',
        'Don\'t worry about temporary schedule disruption',
        'Ensure you\'re eating enough calories',
        'Ask for help with household tasks'
      ]
    },
    // Week 12-16: Three Month Mark
    {
      id: 'sleep-patterns',
      weekStart: 12,
      weekEnd: 16,
      title: 'Sleep Patterns Developing',
      description: 'Baby\'s sleep cycles are maturing and becoming more predictable',
      category: 'sleep',
      icon: 'moon',
      color: '#9c27b0',
      whatToExpect: [
        'Longer night sleep stretches (4-6 hours)',
        'More defined nap times during the day',
        'Baby may sleep through the night occasionally',
        'Dream feeds may become less necessary'
      ],
      tips: [
        'Establish a consistent bedtime routine',
        'Put baby down awake but drowsy',
        'Keep night feeds calm and quiet',
        'Be patient - every baby is different'
      ]
    },
    // Week 16-20: Four Month Changes
    {
      id: 'four-month-changes',
      weekStart: 16,
      weekEnd: 20,
      title: '4-Month Sleep Regression',
      description: 'Baby\'s sleep patterns may temporarily change as their brain develops',
      category: 'sleep',
      icon: 'alert-circle',
      color: '#f59e0b',
      whatToExpect: [
        'Previously good sleeper may wake more often',
        'Shorter naps during the day',
        'Increased night wakings',
        'This is temporary and developmental'
      ],
      tips: [
        'Stick to consistent routines',
        'Offer extra comfort and patience',
        'Continue breastfeeding for comfort',
        'Remember this phase will pass'
      ]
    },
    // Week 20-24: Five to Six Months
    {
      id: 'solid-food-readiness',
      weekStart: 20,
      weekEnd: 24,
      title: 'Getting Ready for Solids',
      description: 'Baby is showing signs of readiness for complementary foods',
      category: 'feeding',
      icon: 'restaurant',
      color: '#26a69a',
      whatToExpect: [
        'Baby can sit with support',
        'Shows interest in food you\'re eating',
        'Lost the tongue-thrust reflex',
        'Can hold head steady'
      ],
      tips: [
        'Breast milk remains the primary nutrition',
        'Start with single ingredients',
        'Let baby explore and play with food',
        'Continue breastfeeding before offering solids'
      ]
    },
    // Week 24+: Six Months and Beyond
    {
      id: 'mobile-baby',
      weekStart: 24,
      weekEnd: 32,
      title: 'Mobile Baby Phase',
      description: 'Baby is becoming more mobile and independent',
      category: 'development',
      icon: 'walk',
      color: '#4caf50',
      whatToExpect: [
        'Rolling, sitting, possibly crawling',
        'More distracted during feeds',
        'Shorter but more frequent nursing sessions',
        'Increased solid food intake'
      ],
      tips: [
        'Find quiet spaces for nursing',
        'Offer breast before meals',
        'Be flexible with feeding positions',
        'Continue offering breast milk throughout the day'
      ]
    }
  ];

  constructor() {}

  getTimelineForBaby(birthDate: Date): Observable<BabyTimelineData> {
    const currentWeek = this.calculateCurrentWeek(birthDate);
    
    // Get current and upcoming items
    const currentItems = this.timelineData.filter(item => 
      currentWeek >= item.weekStart && currentWeek <= item.weekEnd
    );
    
    const upcomingItems = this.timelineData.filter(item => 
      item.weekStart > currentWeek && item.weekStart <= currentWeek + 4
    ).slice(0, 3);
    
    const recentItems = this.timelineData.filter(item => 
      item.weekEnd < currentWeek && item.weekEnd >= currentWeek - 4
    ).slice(-2);

    return of({
      currentWeek,
      items: [...currentItems, ...upcomingItems],
      upcomingMilestones: upcomingItems,
      recentlyCompleted: recentItems
    });
  }

  private calculateCurrentWeek(birthDate: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  }

  getTimelineItemsForWeek(week: number): BabyTimelineItem[] {
    return this.timelineData.filter(item => 
      week >= item.weekStart && week <= item.weekEnd
    );
  }

  getAllTimelineItems(): BabyTimelineItem[] {
    return this.timelineData;
  }

  markItemCompleted(itemId: string): void {
    // In a real app, this would update the backend
    console.log(`Marked timeline item ${itemId} as completed`);
  }
}