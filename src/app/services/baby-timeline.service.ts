import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BabyTimelineItem, BabyTimelineData } from '../models/baby-timeline.model';

@Injectable({
  providedIn: 'root'
})
export class BabyTimelineService {
  
  private readonly timelineData: BabyTimelineItem[] = [
    // Week 0: Birth
    {
      id: 'birth-week',
      weekStart: 0,
      weekEnd: 0,
      title: 'Welcome to the world!',
      description: 'Your baby has arrived! This is the beginning of your beautiful breastfeeding journey together.',
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
    
    // Week 1: First Week
    {
      id: 'first-week',
      weekStart: 1,
      weekEnd: 1,
      title: 'Learning together',
      description: 'You and baby are both learning! Every feed is practice for both of you.',
      category: 'feeding',
      icon: 'school',
      color: '#26a69a',
      whatToExpected: [
        'Frequent feeding continues (8-12 times daily)',
        'Baby\'s stomach is tiny (size of a marble!)',
        'Colostrum transitions to mature milk',
        'Some nipple tenderness is normal initially'
      ],
      tips: [
        'Focus on getting a good latch - ask for help!',
        'Feed from both breasts each session',
        'Keep baby awake during feeds by gentle stimulation',
        'Rest when baby rests - sleep is crucial for milk production'
      ],
      whenToWorry: [
        'Severe nipple pain that doesn\'t improve',
        'Baby not having wet diapers',
        'Baby seems dehydrated or very sleepy'
      ]
    },

    // Week 2: Milk Coming In
    {
      id: 'milk-coming-in',
      weekStart: 2,
      weekEnd: 2,
      title: 'Your milk is coming in!',
      description: 'Your breasts may feel fuller as your mature milk increases. This is exciting progress!',
      category: 'feeding',
      icon: 'water',
      color: '#42a5f5',
      whatToExpected: [
        'Breasts feel fuller, heavier, and warmer',
        'Milk changes from yellow to white/bluish',
        'Baby should regain birth weight soon',
        'You might experience some engorgement'
      ],
      tips: [
        'Feed frequently to prevent severe engorgement',
        'Use cold compresses between feeds if needed',
        'Ensure baby empties one breast before switching',
        'Hand express a little milk if breasts are too full for baby to latch'
      ],
      whenToWorry: [
        'Severe engorgement that prevents baby from latching',
        'Red streaks on breasts with fever',
        'Baby still losing weight after day 5'
      ]
    },

    // Week 3: Finding Rhythm
    {
      id: 'finding-rhythm',
      weekStart: 3,
      weekEnd: 3,
      title: 'Finding your rhythm',
      description: 'Feeding patterns are starting to emerge. You\'re both getting more comfortable!',
      category: 'development',
      icon: 'musical-notes',
      color: '#ff7043',
      whatToExpected: [
        'Feeding sessions may become slightly more predictable',
        'Baby is more alert during awake periods',
        'You feel more confident with positioning',
        'Night feeds are still very important'
      ],
      tips: [
        'Start to notice baby\'s hunger cues',
        'Try different feeding positions for comfort',
        'Keep a simple feeding log if helpful',
        'Accept help with household tasks'
      ],
      whenToWorry: [
        'Baby not gaining weight appropriately',
        'Persistent feeding difficulties',
        'Signs of postpartum depression or anxiety'
      ]
    },

    // Week 4: One Month Milestone
    {
      id: 'one-month',
      weekStart: 4,
      weekEnd: 4,
      title: 'One month milestone! 🎉',
      description: 'Congratulations! You\'ve made it through the first month. You\'re doing amazing!',
      category: 'milestone',
      icon: 'trophy',
      color: '#4caf50',
      whatToExpected: [
        'Baby has likely doubled their daily milk intake',
        'Feeding sessions may be more efficient',
        'You might notice growth spurts',
        'Baby is more interactive and alert'
      ],
      tips: [
        'Celebrate this major milestone!',
        'Trust your body - you\'re making enough milk',
        'Continue feeding on demand',
        'Take progress photos - you\'ll treasure them later'
      ],
      whenToWorry: [
        'Baby not back to birth weight',
        'Fewer than 6 wet diapers per day',
        'You feel overwhelmed or depressed'
      ]
    },

    // Week 5: Growth Patterns
    {
      id: 'growth-patterns',
      weekStart: 5,
      weekEnd: 5,
      title: 'Growth spurts are normal',
      description: 'Baby might seem extra hungry some days. This is completely normal and helps boost your supply!',
      category: 'development',
      icon: 'trending-up',
      color: '#9c27b0',
      whatToExpected: [
        'Days when baby wants to feed constantly',
        'Increased fussiness during growth spurts',
        'Your milk supply adjusts to baby\'s needs',
        'Growth spurts typically last 2-3 days'
      ],
      tips: [
        'Follow baby\'s lead during growth spurts',
        'Don\'t supplement unless medically necessary',
        'Stay hydrated and eat well',
        'Rest as much as possible'
      ],
      whenToWorry: [
        'Baby seems inconsolable for extended periods',
        'Significant decrease in wet diapers',
        'You feel your milk supply is inadequate'
      ]
    },

    // Week 6: Six Week Growth Spurt
    {
      id: 'six-week-spurt',
      weekStart: 6,
      weekEnd: 6,
      title: 'The famous 6-week growth spurt',
      description: 'This is a big one! Baby is going through rapid development and needs extra nutrition.',
      category: 'development',
      icon: 'flash',
      color: '#ff9800',
      whatToExpected: [
        'Very frequent feeding for 2-3 days',
        'Baby may be fussier than usual',
        'Your milk supply will increase to meet demand',
        'You might feel exhausted'
      ],
      tips: [
        'This is temporary - usually lasts 2-3 days',
        'Feed as often as baby wants',
        'Ask family for extra support',
        'Trust that your body will make enough milk'
      ],
      whenToWorry: [
        'Growth spurt lasts more than a week',
        'Baby shows signs of dehydration',
        'You feel unable to cope'
      ]
    },

    // Week 7: Social Development
    {
      id: 'social-smiles',
      weekStart: 7,
      weekEnd: 7,
      title: 'First real smiles! 😊',
      description: 'Those magical first social smiles are appearing! Your baby is starting to interact more.',
      category: 'milestone',
      icon: 'happy',
      color: '#4caf50',
      whatToExpected: [
        'Baby smiles in response to your voice',
        'More eye contact during feeding',
        'Beginning to coo and make sounds',
        'Longer alert periods'
      ],
      tips: [
        'Talk and sing to baby during feeds',
        'Make lots of eye contact',
        'Respond to baby\'s sounds and smiles',
        'Take videos - these moments are precious!'
      ],
      whenToWorry: [
        'No response to your voice or face',
        'Baby seems very passive',
        'Feeding difficulties persist'
      ]
    },

    // Week 8: Two Month Approach
    {
      id: 'two-month-approach',
      weekStart: 8,
      weekEnd: 8,
      title: 'Approaching 2 months',
      description: 'Feeding is becoming more efficient and you\'re both more confident!',
      category: 'feeding',
      icon: 'checkmark-circle',
      color: '#26a69a',
      whatToExpected: [
        'Feeds may space out slightly (every 2-3 hours)',
        'Baby feeds more efficiently',
        'You feel more confident with breastfeeding',
        'Night feeds are still important'
      ],
      tips: [
        'Still follow baby\'s cues rather than strict schedules',
        'Enjoy longer awake periods with baby',
        'Consider a simple bedtime routine',
        'Take care of your own nutrition'
      ],
      whenToWorry: [
        'Sudden decrease in feeding frequency',
        'Baby seems less interested in feeding',
        'Weight gain slows significantly'
      ]
    },

    // Week 9: Routine Emerging
    {
      id: 'routine-emerging',
      weekStart: 9,
      weekEnd: 9,
      title: 'Gentle routines emerging',
      description: 'You might notice some patterns in baby\'s feeding and sleeping. This is progress!',
      category: 'development',
      icon: 'time',
      color: '#673ab7',
      whatToExpected: [
        'Some predictability in feeding times',
        'Baby may have longer sleep stretches',
        'More defined awake and sleep periods',
        'You feel more in tune with baby\'s needs'
      ],
      tips: [
        'Follow baby\'s natural rhythms',
        'Don\'t force rigid schedules yet',
        'Notice baby\'s unique patterns',
        'Flexibility is still key'
      ],
      whenToWorry: [
        'Baby suddenly becomes very irregular',
        'Significant changes in feeding behavior',
        'You feel something isn\'t right'
      ]
    },

    // Week 10: Communication Skills
    {
      id: 'communication-skills',
      weekStart: 10,
      weekEnd: 10,
      title: 'Baby\'s communication skills',
      description: 'Baby is becoming more expressive! You\'re learning each other\'s language.',
      category: 'milestone',
      icon: 'chatbubbles',
      color: '#e91e63',
      whatToExpected: [
        'More varied cries for different needs',
        'Cooing and gurgling sounds',
        'Better head control during feeds',
        'More responsive to your voice'
      ],
      tips: [
        'Learn to distinguish different cries',
        'Respond to baby\'s attempts at communication',
        'Talk to baby throughout the day',
        'Enjoy these developing interactions'
      ],
      whenToWorry: [
        'No response to sounds or voices',
        'Very limited crying or sounds',
        'Feeding becomes increasingly difficult'
      ]
    },

    // Week 11: Efficiency Improves
    {
      id: 'efficiency-improves',
      weekStart: 11,
      weekEnd: 11,
      title: 'Feeding efficiency improves',
      description: 'Baby is getting better at breastfeeding! Feeds may be shorter but more effective.',
      category: 'feeding',
      icon: 'speedometer',
      color: '#00bcd4',
      whatToExpected: [
        'Shorter but more effective feeding sessions',
        'Baby may finish feeding in 10-20 minutes',
        'Less frequent feeding (every 2-4 hours)',
        'You have more time between feeds'
      ],
      tips: [
        'Don\'t worry if feeds are shorter - baby is more efficient',
        'Still offer both breasts',
        'Use extra time for self-care',
        'Continue following baby\'s hunger cues'
      ],
      whenToWorry: [
        'Feeds become extremely short (under 5 minutes)',
        'Baby seems unsatisfied after feeds',
        'Significant drop in wet diapers'
      ]
    },

    // Week 12: Three Month Growth Spurt
    {
      id: 'three-month-spurt',
      weekStart: 12,
      weekEnd: 12,
      title: '3-month growth spurt',
      description: 'Another big growth spurt! Baby is developing rapidly in many ways.',
      category: 'development',
      icon: 'rocket',
      color: '#ff5722',
      whatToExpected: [
        'Increased appetite and feeding frequency',
        'Possible temporary fussiness',
        'Rapid physical and cognitive development',
        'Sleep patterns may temporarily change'
      ],
      tips: [
        'Increase feeding frequency as needed',
        'Don\'t worry about temporary schedule disruption',
        'Ensure you\'re eating enough calories',
        'This growth spurt may last 3-5 days'
      ],
      whenToWorry: [
        'Growth spurt lasts more than a week',
        'Baby shows signs of illness',
        'You feel unable to meet baby\'s needs'
      ]
    },

    // Week 13: Sleep Development
    {
      id: 'sleep-development',
      weekStart: 13,
      weekEnd: 13,
      title: 'Sleep patterns developing',
      description: 'Baby\'s sleep cycles are maturing. You might get longer stretches at night!',
      category: 'sleep',
      icon: 'moon',
      color: '#3f51b5',
      whatToExpected: [
        'Longer night sleep stretches (3-5 hours)',
        'More defined day and night patterns',
        'Baby may sleep through some feeds',
        'Naps become more predictable'
      ],
      tips: [
        'Establish a simple bedtime routine',
        'Keep night feeds calm and quiet',
        'Put baby down awake but drowsy',
        'Be patient - every baby is different'
      ],
      whenToWorry: [
        'Baby suddenly stops gaining weight',
        'Extreme difficulty waking baby to feed',
        'Signs of illness or lethargy'
      ]
    },

    // Week 14: Personality Emerging
    {
      id: 'personality-emerging',
      weekStart: 14,
      weekEnd: 14,
      title: 'Baby\'s personality emerging',
      description: 'You\'re starting to see glimpses of baby\'s unique personality! How exciting!',
      category: 'milestone',
      icon: 'star',
      color: '#e91e63',
      whatToExpected: [
        'More distinct preferences and reactions',
        'Different responses to various situations',
        'Unique feeding patterns and behaviors',
        'More interactive during awake times'
      ],
      tips: [
        'Observe and appreciate baby\'s uniqueness',
        'Adapt your approach to baby\'s temperament',
        'Document these special moments',
        'Trust your instincts about your baby'
      ],
      whenToWorry: [
        'Baby seems very passive or unresponsive',
        'Feeding becomes increasingly difficult',
        'You\'re concerned about development'
      ]
    },

    // Week 15: Routine Flexibility
    {
      id: 'routine-flexibility',
      weekStart: 15,
      weekEnd: 15,
      title: 'Flexible routines work best',
      description: 'You\'re finding what works for your family. Flexibility is your friend!',
      category: 'development',
      icon: 'refresh',
      color: '#607d8b',
      whatToExpected: [
        'Some days are more predictable than others',
        'Baby\'s needs change as they grow',
        'You\'re becoming more adaptable',
        'Confidence in your parenting grows'
      ],
      tips: [
        'Embrace flexibility over rigid schedules',
        'Adjust routines as baby grows',
        'What works today might change tomorrow',
        'You\'re the expert on your baby'
      ],
      whenToWorry: [
        'Complete lack of any patterns',
        'Feeding becomes chaotic and stressful',
        'You feel completely overwhelmed'
      ]
    },

    // Week 16: Four Month Changes
    {
      id: 'four-month-changes',
      weekStart: 16,
      weekEnd: 16,
      title: 'Four month sleep changes',
      description: 'Baby\'s sleep patterns are maturing, which might temporarily disrupt their sleep.',
      category: 'sleep',
      icon: 'bed',
      color: '#795548',
      whatToExpected: [
        'Previously good sleeper may wake more often',
        'Shorter naps during the day',
        'Increased night wakings temporarily',
        'This is developmental, not a problem!'
      ],
      tips: [
        'Stick to consistent routines',
        'Offer extra comfort and patience',
        'Continue breastfeeding for comfort',
        'Remember this phase will pass'
      ],
      whenToWorry: [
        'Baby seems ill or in pain',
        'Complete refusal to sleep',
        'Feeding problems accompany sleep issues'
      ]
    },

    // Week 17: Distraction Phase
    {
      id: 'distraction-phase',
      weekStart: 17,
      weekEnd: 17,
      title: 'Hello, distractible baby!',
      description: 'Baby is becoming more aware of the world and might get distracted during feeds.',
      category: 'feeding',
      icon: 'eye',
      color: '#009688',
      whatToExpected: [
        'Baby looks around during feeding',
        'Easily distracted by sounds or movement',
        'May pull off breast to look around',
        'Feeds might take longer'
      ],
      tips: [
        'Find a quiet, dimly lit space for feeding',
        'Minimize distractions during feeds',
        'Be patient - this is normal development',
        'Try feeding when baby is sleepy'
      ],
      whenToWorry: [
        'Baby completely refuses to feed',
        'Significant weight loss',
        'Signs of dehydration'
      ]
    },

    // Week 18: Hand Coordination
    {
      id: 'hand-coordination',
      weekStart: 18,
      weekEnd: 18,
      title: 'Hands are fascinating!',
      description: 'Baby is discovering their hands and might grab at everything, including you during feeds!',
      category: 'milestone',
      icon: 'hand-left',
      color: '#ff9800',
      whatToExpected: [
        'Baby grabs at your clothes, hair, or breast',
        'Hands come together at midline',
        'Reaching for objects',
        'May try to "help" during feeding'
      ],
      tips: [
        'Wear simple clothing during feeds',
        'Give baby something safe to hold',
        'Trim baby\'s nails regularly',
        'Enjoy watching their development'
      ],
      whenToWorry: [
        'No use of hands or arms',
        'Baby seems to have lost previously gained skills',
        'Feeding becomes very difficult'
      ]
    },

    // Week 19: Teething Preparation
    {
      id: 'teething-prep',
      weekStart: 19,
      weekEnd: 19,
      title: 'Preparing for teething',
      description: 'While teeth won\'t appear for a while, baby\'s gums might start feeling different.',
      category: 'development',
      icon: 'medical',
      color: '#607d8b',
      whatToExpected: [
        'Increased drooling',
        'Baby puts everything in mouth',
        'Possible increased fussiness',
        'May bite down during feeding'
      ],
      tips: [
        'Offer safe teething toys',
        'If baby bites, gently break suction and say "no biting"',
        'Keep extra bibs handy for drool',
        'Massage baby\'s gums with clean finger'
      ],
      whenToWorry: [
        'Signs of actual illness (fever, etc.)',
        'Baby completely refuses to feed',
        'Persistent biting that causes injury'
      ]
    },

    // Week 20: Five Month Milestone
    {
      id: 'five-months',
      weekStart: 20,
      weekEnd: 20,
      title: 'Five months of amazing growth!',
      description: 'Look how far you\'ve both come! Baby is becoming more interactive and social.',
      category: 'milestone',
      icon: 'celebration',
      color: '#e91e63',
      whatToExpected: [
        'Baby laughs and shows joy',
        'More predictable feeding patterns',
        'Increased interest in surroundings',
        'Better head and neck control'
      ],
      tips: [
        'Celebrate this milestone!',
        'Take photos and videos',
        'Enjoy baby\'s increased interaction',
        'Continue responsive feeding'
      ],
      whenToWorry: [
        'Baby not meeting developmental milestones',
        'Feeding problems persist',
        'You have concerns about growth'
      ]
    },

    // Week 21: Solid Food Curiosity
    {
      id: 'solid-curiosity',
      weekStart: 21,
      weekEnd: 21,
      title: 'Curious about your food?',
      description: 'Baby might start showing interest in what you\'re eating. They\'re getting ready for solids!',
      category: 'feeding',
      icon: 'restaurant',
      color: '#4caf50',
      whatToExpected: [
        'Baby watches you eat with interest',
        'Reaches for your food',
        'Opens mouth when seeing food',
        'Can sit with support'
      ],
      tips: [
        'Let baby watch you eat',
        'Breast milk is still the main nutrition',
        'Don\'t rush into solids',
        'Wait for clear readiness signs'
      ],
      whenToWorry: [
        'No interest in surroundings',
        'Cannot sit even with support',
        'Feeding difficulties increase'
      ]
    },

    // Week 22: Motor Skills
    {
      id: 'motor-skills',
      weekStart: 22,
      weekEnd: 22,
      title: 'Motor skills developing',
      description: 'Baby is becoming more mobile and coordinated. Feeding positions might need adjusting!',
      category: 'development',
      icon: 'fitness',
      color: '#ff5722',
      whatToExpected: [
        'Rolling from back to front',
        'Better sitting balance',
        'Reaching and grabbing more accurately',
        'May prefer certain feeding positions'
      ],
      tips: [
        'Be flexible with feeding positions',
        'Ensure baby\'s safety during feeds',
        'Let baby practice new skills',
        'Childproof your feeding area'
      ],
      whenToWorry: [
        'Loss of previously gained motor skills',
        'Baby seems weak or floppy',
        'Difficulty maintaining feeding positions'
      ]
    },

    // Week 23: Pre-Solids Preparation
    {
      id: 'pre-solids',
      weekStart: 23,
      weekEnd: 23,
      title: 'Almost ready for solids!',
      description: 'Baby is showing more signs of readiness for complementary foods alongside breast milk.',
      category: 'feeding',
      icon: 'nutrition',
      color: '#8bc34a',
      whatToExpected: [
        'Lost the tongue-thrust reflex',
        'Can hold head steady',
        'Shows clear interest in food',
        'Can sit with minimal support'
      ],
      tips: [
        'Continue breastfeeding as primary nutrition',
        'Research baby-led weaning or purees',
        'Prepare for messy meal times',
        'Start with single ingredients'
      ],
      whenToWorry: [
        'Baby cannot sit even with support',
        'No interest in food or eating',
        'Persistent tongue-thrust reflex'
      ]
    },

    // Week 24: Six Month Milestone
    {
      id: 'six-months',
      weekStart: 24,
      weekEnd: 24,
      title: 'Six months! Time for solids! 🥄',
      description: 'Congratulations! You\'ve reached the six-month milestone. Time to introduce complementary foods!',
      category: 'milestone',
      icon: 'restaurant',
      color: '#4caf50',
      whatToExpected: [
        'Baby is ready for first foods',
        'Breast milk remains primary nutrition',
        'Messy, fun meal times begin',
        'New textures and flavors to explore'
      ],
      tips: [
        'Start with single ingredients',
        'Offer breast milk before solids',
        'Let baby explore and play with food',
        'Be patient - eating is a new skill'
      ],
      whenToWorry: [
        'Baby shows signs of allergic reactions',
        'Complete refusal of all foods',
        'Choking or difficulty swallowing'
      ]
    },

    // Continue with more weeks...
    // Week 25-52 would follow similar pattern with age-appropriate content
    
    // Week 25: First Foods Adventure
    {
      id: 'first-foods',
      weekStart: 25,
      weekEnd: 25,
      title: 'First foods adventure begins',
      description: 'Baby is exploring new tastes and textures while breast milk remains their main nutrition.',
      category: 'feeding',
      icon: 'leaf',
      color: '#8bc34a',
      whatToExpected: [
        'Baby plays with food more than eating',
        'Breast milk still provides most nutrition',
        'Gagging is normal as baby learns',
        'Very small amounts of food consumed'
      ],
      tips: [
        'Food before one is just for fun!',
        'Continue breastfeeding on demand',
        'Offer variety but don\'t force',
        'Make mealtimes enjoyable and stress-free'
      ],
      whenToWorry: [
        'Signs of food allergies',
        'Baby seems to be choking frequently',
        'Complete refusal to try any foods'
      ]
    },

    // Week 30: Mobile Baby
    {
      id: 'mobile-baby',
      weekStart: 30,
      weekEnd: 30,
      title: 'Your mobile little one',
      description: 'Baby is becoming more mobile! This might affect feeding patterns and positions.',
      category: 'development',
      icon: 'walk',
      color: '#ff9800',
      whatToExpected: [
        'Crawling or attempting to crawl',
        'More distracted during feeds',
        'Shorter but more frequent nursing',
        'Prefers certain feeding positions'
      ],
      tips: [
        'Find quiet spaces for nursing',
        'Be flexible with feeding positions',
        'Offer breast before meals and snacks',
        'Baby-proof your home'
      ],
      whenToWorry: [
        'Significant decrease in milk intake',
        'Baby seems to be weaning too early',
        'Feeding becomes very stressful'
      ]
    },

    // Week 36: Nine Month Development
    {
      id: 'nine-months',
      weekStart: 36,
      weekEnd: 36,
      title: 'Nine months of growth!',
      description: 'Baby has been outside as long as they were inside! What an incredible journey.',
      category: 'milestone',
      icon: 'trophy',
      color: '#e91e63',
      whatToExpected: [
        'Baby may be crawling or cruising',
        'Eating more solid foods',
        'Still benefits greatly from breast milk',
        'More independent but still needs comfort nursing'
      ],
      tips: [
        'Continue breastfeeding alongside solids',
        'Nursing provides comfort and nutrition',
        'Follow baby\'s lead on frequency',
        'Celebrate this amazing milestone!'
      ],
      whenToWorry: [
        'Baby completely refuses breast milk',
        'Significant developmental delays',
        'Feeding becomes very difficult'
      ]
    },

    // Week 52: One Year!
    {
      id: 'one-year',
      weekStart: 52,
      weekEnd: 52,
      title: 'One year of breastfeeding! 🎂',
      description: 'Congratulations! You\'ve reached the one-year milestone. What an incredible achievement!',
      category: 'milestone',
      icon: 'gift',
      color: '#4caf50',
      whatToExpected: [
        'Baby is walking or close to it',
        'Eating a variety of solid foods',
        'Breast milk still provides important nutrition',
        'Nursing may be mainly for comfort'
      ],
      tips: [
        'Celebrate this amazing achievement!',
        'Continue as long as you and baby want',
        'WHO recommends breastfeeding to 2 years+',
        'You\'ve given your baby the best start'
      ],
      whenToWorry: [
        'You feel pressured to stop before you\'re ready',
        'Baby shows signs of nutritional deficiencies',
        'Breastfeeding becomes painful again'
      ]
    }
  ];

  constructor() {}

  getTimelineForBaby(birthDate: Date): Observable<BabyTimelineData> {
    const currentWeek = this.calculateCurrentWeek(birthDate);
    
    // Get current week items
    const currentItems = this.timelineData.filter(item => 
      currentWeek >= item.weekStart && currentWeek <= item.weekEnd
    );
    
    // Get upcoming items (next 4 weeks)
    const upcomingItems = this.timelineData.filter(item => 
      item.weekStart > currentWeek && item.weekStart <= currentWeek + 4
    ).slice(0, 4);
    
    // Get recently completed items
    const recentItems = this.timelineData.filter(item => 
      item.weekEnd < currentWeek && item.weekEnd >= currentWeek - 4
    ).slice(-3);

    // Combine all relevant items for display
    const allRelevantItems = [
      ...recentItems,
      ...currentItems,
      ...upcomingItems
    ].sort((a, b) => a.weekStart - b.weekStart);

    return of({
      currentWeek,
      items: allRelevantItems,
      upcomingMilestones: upcomingItems,
      recentlyCompleted: recentItems,
      allWeeks: this.timelineData.sort((a, b) => a.weekStart - b.weekStart)
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

  // Get timeline items in chunks for pagination
  getTimelineChunk(startWeek: number, endWeek: number): BabyTimelineItem[] {
    return this.timelineData.filter(item => 
      item.weekStart >= startWeek && item.weekEnd <= endWeek
    );
  }

  // Get timeline items by category
  getTimelineByCategory(category: string): BabyTimelineItem[] {
    return this.timelineData.filter(item => item.category === category);
  }
}