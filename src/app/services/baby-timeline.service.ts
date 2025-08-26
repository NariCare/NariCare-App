import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BabyTimelineItem, BabyTimelineData } from '../models/baby-timeline.model';

@Injectable({
  providedIn: 'root'
})
export class BabyTimelineService {
  
  private readonly timelineData: BabyTimelineItem[] = [
    // Birth - Week 0
    {
      id: 'birth-week',
      weekStart: 0,
      weekEnd: 0,
      title: 'Welcome to the world!',
      shortTitle: 'Birth',
      description: 'Your baby has arrived! This is the beginning of your beautiful journey together.',
      category: 'milestone',
      icon: 'heart',
      color: '#8383ed',
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
      ],
      videoLinks: [
        {
          title: 'Newborn Reflexes',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/newborn-reflexes.mp4',
          description: 'Learn about normal newborn reflexes and behaviors',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/newborn-reflexes-thumb.jpg',
          category: 'movement'
        },
        {
          title: 'Early Bonding',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/early-bonding.mp4',
          description: 'Understanding early parent-baby bonding',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/early-bonding-thumb.jpg',
          category: 'social'
        }
      ]
    },

    // 2 Months - Week 8
    {
      id: 'two-months-milestones',
      weekStart: 8,
      weekEnd: 8,
      title: '2 Months: Social Smiles & Calming',
      shortTitle: '2 Months',
      description: 'Your baby is becoming more social and responsive! Watch for those magical first smiles.',
      category: 'milestone',
      icon: 'happy',
      color: '#4caf50',
      whatToExpected: [
        'Calms down when spoken to or picked up',
        'Looks at your face and makes eye contact',
        'Seems happy to see you when you walk up to them',
        'Smiles when you talk to or smile at them',
        'Can hold head up when on tummy',
        'Moves both arms and both legs',
        'Opens hands briefly'
      ],
      tips: [
        'Talk and sing to your baby throughout the day',
        'Give plenty of tummy time when baby is awake',
        'Respond to baby\'s smiles and sounds',
        'Read to your baby daily',
        'Take photos and videos of these precious moments'
      ],
      whenToWorry: [
        'Doesn\'t respond to loud sounds',
        'Doesn\'t watch things as they move',
        'Doesn\'t smile at people',
        'Can\'t hold head up when pushing up during tummy time',
        'Doesn\'t bring hands to mouth'
      ],
      videoLinks: [
        {
          title: '2 Months - Calms down when spoken to or picked up',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/2months-calms-down.mp4',
          description: 'See how a 2-month-old baby calms down when mom speaks to and picks her up',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/2months-calms-thumb.jpg',
          category: 'social'
        },
        {
          title: '2 Months - Looks at your face',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/2months-looks-at-face.mp4',
          description: 'Watch how babies at 2 months look at and focus on faces',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/2months-face-thumb.jpg',
          category: 'social'
        },
        {
          title: '2 Months - Smiles when you talk to or smile at them',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/2months-social-smile.mp4',
          description: 'See the beautiful social smiles that emerge at 2 months',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/2months-smile-thumb.jpg',
          category: 'social'
        },
        {
          title: '2 Months - Holds head up when on tummy',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/2months-tummy-time.mp4',
          description: 'Learn about tummy time and head control development',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/2months-tummy-thumb.jpg',
          category: 'movement'
        }
      ]
    },

    // 4 Months - Week 16
    {
      id: 'four-months-milestones',
      weekStart: 16,
      weekEnd: 16,
      title: '4 Months: Laughing & Reaching',
      shortTitle: '4 Months',
      description: 'Your baby is becoming more interactive and playful! Expect lots of giggles and reaching.',
      category: 'milestone',
      icon: 'musical-notes',
      color: '#ff9800',
      whatToExpected: [
        'Smiles on their own to get your attention',
        'Chuckles (not yet a full laugh) when you try to make them laugh',
        'Looks at you, moves, or makes sounds to get or keep your attention',
        'Holds head steady without support when you are holding them',
        'Holds a toy when you put it in their hand',
        'Uses their arm to swing at toys',
        'Brings hands to mouth',
        'Pushes up onto elbows/forearms when on tummy'
      ],
      tips: [
        'Play peek-a-boo and other interactive games',
        'Provide safe toys for baby to grasp and explore',
        'Continue tummy time to strengthen neck and shoulder muscles',
        'Talk to baby and wait for them to respond',
        'Sing songs and read books together'
      ],
      whenToWorry: [
        'Doesn\'t watch things as they move',
        'Doesn\'t smile at people',
        'Can\'t hold head steady',
        'Doesn\'t coo or make sounds',
        'Doesn\'t bring things to mouth',
        'Doesn\'t push down with legs when feet are placed on a hard surface'
      ],
      videoLinks: [
        {
          title: '4 Months - Smiles on their own to get your attention',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/4months-smiles-attention.mp4',
          description: 'See how 4-month-old babies use smiles to communicate',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/4months-smile-thumb.jpg',
          category: 'social'
        },
        {
          title: '4 Months - Chuckles when you try to make them laugh',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/4months-chuckles.mp4',
          description: 'Watch babies respond with chuckles to playful interactions',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/4months-laugh-thumb.jpg',
          category: 'social'
        },
        {
          title: '4 Months - Holds head steady without support',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/4months-head-control.mp4',
          description: 'See the development of steady head control at 4 months',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/4months-head-thumb.jpg',
          category: 'movement'
        },
        {
          title: '4 Months - Uses arm to swing at toys',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/4months-reaching.mp4',
          description: 'Watch how babies start reaching and swinging at objects',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/4months-reach-thumb.jpg',
          category: 'movement'
        }
      ]
    },

    // 6 Months - Week 24
    {
      id: 'six-months-milestones',
      weekStart: 24,
      weekEnd: 24,
      title: '6 Months: Sitting & Exploring',
      shortTitle: '6 Months',
      description: 'Half a year milestone! Your baby is becoming more mobile and curious about everything.',
      category: 'milestone',
      icon: 'cube',
      color: '#2196f3',
      whatToExpected: [
        'Knows familiar people and begins to know if someone is a stranger',
        'Likes to play with others, especially parents',
        'Responds to other people\'s emotions and often seems happy',
        'Likes to look at self in a mirror',
        'Responds to sounds by making sounds',
        'Strings vowels together when babbling ("ah," "eh," "oh")',
        'Takes turns making sounds with you',
        'Blows "raspberries" (sticks tongue out and blows)',
        'Brings things to mouth',
        'Reaches for things',
        'Closes lips to show they don\'t want more food'
      ],
      tips: [
        'Introduce solid foods alongside breastfeeding',
        'Let baby explore different textures safely',
        'Play games that involve taking turns',
        'Provide unbreakable mirrors for baby to look at',
        'Continue reading and talking throughout the day'
      ],
      whenToWorry: [
        'Doesn\'t try to get things that are in reach',
        'Shows no affection for caregivers',
        'Doesn\'t respond to sounds around them',
        'Has difficulty getting things to mouth',
        'Doesn\'t make vowel sounds ("ah", "eh", "oh")',
        'Doesn\'t roll over in either direction',
        'Doesn\'t laugh or make squealing sounds',
        'Seems very stiff, with tight muscles',
        'Seems very floppy, like a rag doll'
      ],
      videoLinks: [
        {
          title: '6 Months - Knows familiar people',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/6months-familiar-people.mp4',
          description: 'See how babies recognize and respond to familiar faces',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/6months-familiar-thumb.jpg',
          category: 'social'
        },
        {
          title: '6 Months - Takes turns making sounds',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/6months-turn-taking.mp4',
          description: 'Watch babies engage in back-and-forth sound conversations',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/6months-sounds-thumb.jpg',
          category: 'language'
        },
        {
          title: '6 Months - Brings things to mouth',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/6months-mouth-exploration.mp4',
          description: 'See how babies explore objects by bringing them to their mouth',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/6months-mouth-thumb.jpg',
          category: 'cognitive'
        },
        {
          title: '6 Months - Sits without support',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/6months-sitting.mp4',
          description: 'Watch the development of independent sitting skills',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/6months-sit-thumb.jpg',
          category: 'movement'
        }
      ]
    },

    // 9 Months - Week 36
    {
      id: 'nine-months-milestones',
      weekStart: 36,
      weekEnd: 36,
      title: '9 Months: Crawling & Communication',
      shortTitle: '9 Months',
      description: 'Your baby is on the move! Crawling, babbling, and exploring everything within reach.',
      category: 'milestone',
      icon: 'walk',
      color: '#9c27b0',
      whatToExpected: [
        'Is shy, clingy, or fearful around strangers',
        'Shows several facial expressions, like happy, sad, angry, and surprised',
        'Looks when you call their name',
        'Reacts when you leave (looks, reaches for you, or cries)',
        'Smiles or laughs when you play peek-a-boo',
        'Makes a lot of different sounds like "mamamama" and "bababababa"',
        'Copies sounds and gestures you make',
        'Uses fingers to point at things',
        'Watches the path of something as it falls',
        'Looks for things they see you hide',
        'Puts things in their mouth',
        'Moves things smoothly from one hand to the other',
        'Picks up things like cereal o\'s between thumb and index finger',
        'Sits without support',
        'Gets to a sitting position by themselves',
        'Crawls',
        'Pulls up to stand'
      ],
      tips: [
        'Baby-proof your home as mobility increases',
        'Encourage crawling with toys just out of reach',
        'Play hiding games to develop object permanence',
        'Offer finger foods for self-feeding practice',
        'Continue breastfeeding alongside solid foods'
      ],
      whenToWorry: [
        'Doesn\'t sit with help',
        'Doesn\'t babble ("mama", "baba", "dada")',
        'Doesn\'t play any games involving back-and-forth play',
        'Doesn\'t respond to their own name',
        'Doesn\'t seem to recognize familiar people',
        'Doesn\'t look where you point',
        'Doesn\'t transfer toys from one hand to the other'
      ],
      videoLinks: [
        {
          title: '9 Months - Looks when you call their name',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/9months-responds-name.mp4',
          description: 'See how babies respond when their name is called',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/9months-name-thumb.jpg',
          category: 'language'
        },
        {
          title: '9 Months - Plays peek-a-boo',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/9months-peekaboo.mp4',
          description: 'Watch babies enjoy and participate in peek-a-boo games',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/9months-peekaboo-thumb.jpg',
          category: 'social'
        },
        {
          title: '9 Months - Uses fingers to point',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/9months-pointing.mp4',
          description: 'See how babies start using pointing to communicate',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/9months-point-thumb.jpg',
          category: 'cognitive'
        },
        {
          title: '9 Months - Crawls',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/9months-crawling.mp4',
          description: 'Watch different crawling styles and techniques',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/9months-crawl-thumb.jpg',
          category: 'movement'
        },
        {
          title: '9 Months - Picks up small objects',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/9months-pincer-grasp.mp4',
          description: 'See the development of the pincer grasp (thumb and finger)',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/9months-pincer-thumb.jpg',
          category: 'movement'
        }
      ]
    },

    // 12 Months - Week 52
    {
      id: 'twelve-months-milestones',
      weekStart: 52,
      weekEnd: 52,
      title: '12 Months: First Birthday!',
      shortTitle: '1 Year',
      description: 'Happy first birthday! Your baby is now a toddler with so many new skills and personality.',
      category: 'milestone',
      icon: 'gift',
      color: '#8383ed',
      whatToExpected: [
        'Plays games with you, like pat-a-cake',
        'Waves "bye-bye"',
        'Calls a parent "mama" or "dada" or another special name',
        'Understands "no" (pauses briefly or stops when you say it)',
        'Puts something in a container, like a block in a cup',
        'Looks for things they see you hide, like a toy under a blanket',
        'Pulls up to stand',
        'Walks, holding on to furniture',
        'Drinks from a cup without a lid, as you hold it',
        'Picks up things between thumb and pointer finger, like small bits of food'
      ],
      tips: [
        'Celebrate this amazing milestone!',
        'Continue breastfeeding as long as you both want',
        'Encourage walking by holding their hands',
        'Read books and point to pictures',
        'Sing songs with actions and gestures'
      ],
      whenToWorry: [
        'Doesn\'t crawl',
        'Can\'t stand when supported',
        'Doesn\'t search for things that they see you hide',
        'Doesn\'t say single words like "mama" or "dada"',
        'Doesn\'t learn gestures like waving or shaking head',
        'Doesn\'t point at things',
        'Loses skills they once had'
      ],
      videoLinks: [
        {
          title: '12 Months - Waves "bye-bye"',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/12months-waves-bye.mp4',
          description: 'See how 1-year-olds wave goodbye',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/12months-wave-thumb.jpg',
          category: 'social'
        },
        {
          title: '12 Months - Says "mama" or "dada"',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/12months-first-words.mp4',
          description: 'Listen to babies saying their first meaningful words',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/12months-words-thumb.jpg',
          category: 'language'
        },
        {
          title: '12 Months - Looks for hidden objects',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/12months-object-permanence.mp4',
          description: 'Watch babies search for toys they see you hide',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/12months-hide-thumb.jpg',
          category: 'cognitive'
        },
        {
          title: '12 Months - Walks holding furniture',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/12months-cruising.mp4',
          description: 'See babies "cruising" along furniture before independent walking',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/12months-cruise-thumb.jpg',
          category: 'movement'
        }
      ]
    },

    // 15 Months - Week 65
    {
      id: 'fifteen-months-milestones',
      weekStart: 65,
      weekEnd: 65,
      title: '15 Months: Walking & Talking',
      shortTitle: '15 Months',
      description: 'Your toddler is becoming more independent with walking and using words!',
      category: 'milestone',
      icon: 'footsteps',
      color: '#ff5722',
      whatToExpected: [
        'Copies other children while playing, like taking toys out of a container when another child does',
        'Shows you an object they like',
        'Claps when excited',
        'Hugs stuffed animals or other soft objects',
        'Shows you affection (hugs, cuddles, or kisses you)',
        'Tries to say one or two words besides "mama" or "dada", like "ba" for ball or "da" for dog',
        'Looks at a familiar object when you name it',
        'Follows directions given with both a gesture and words',
        'Points to ask for something or to get help',
        'Takes a few steps on their own',
        'Uses fingers to feed themselves some food'
      ],
      tips: [
        'Encourage walking by creating safe spaces to explore',
        'Read books and name objects in pictures',
        'Sing songs and encourage clapping along',
        'Provide opportunities for social play with other children',
        'Continue offering healthy finger foods'
      ],
      whenToWorry: [
        'Doesn\'t point to show things to others',
        'Can\'t walk',
        'Doesn\'t know what familiar things are for',
        'Doesn\'t copy others',
        'Doesn\'t gain new words',
        'Doesn\'t have at least 6 words',
        'Doesn\'t care if a caregiver leaves or returns',
        'Loses skills they once had'
      ],
      videoLinks: [
        {
          title: '15 Months - Takes a few steps on their own',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/15months-first-steps.mp4',
          description: 'Watch toddlers take their first independent steps',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/15months-steps-thumb.jpg',
          category: 'movement'
        },
        {
          title: '15 Months - Points to ask for something',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/15months-pointing-request.mp4',
          description: 'See how toddlers use pointing to communicate needs',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/15months-point-thumb.jpg',
          category: 'language'
        },
        {
          title: '15 Months - Shows affection',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/15months-affection.mp4',
          description: 'Watch toddlers express love through hugs and kisses',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/15months-hug-thumb.jpg',
          category: 'social'
        }
      ]
    },

    // 18 Months - Week 78
    {
      id: 'eighteen-months-milestones',
      weekStart: 78,
      weekEnd: 78,
      title: '18 Months: Independence & Exploration',
      shortTitle: '18 Months',
      description: 'Your toddler is asserting independence and exploring the world with confidence!',
      category: 'milestone',
      icon: 'rocket',
      color: '#607d8b',
      whatToExpected: [
        'Moves away from you, but looks to make sure you are close by',
        'Points to show someone what they want',
        'Puts hands out for you to wash them',
        'Looks at a few pages in a book with you',
        'Helps you dress them by pushing arm through sleeve or lifting up foot',
        'Tries to say three or more words besides "mama" or "dada"',
        'Understands simple directions like "Pick up the toy"',
        'Points to one body part',
        'Scribbles on their own',
        'Walks without holding on to anyone or anything',
        'Climbs on and off a couch or chair without help',
        'Runs',
        'Pulls toys while walking, like a toy on a string',
        'Helps feed themselves with a spoon',
        'Tries to use a fork'
      ],
      tips: [
        'Provide safe climbing opportunities',
        'Encourage independence in eating and dressing',
        'Read interactive books together',
        'Create art opportunities with large crayons',
        'Set up obstacle courses for physical development'
      ],
      whenToWorry: [
        'Doesn\'t point to show things to others',
        'Can\'t walk',
        'Doesn\'t know what familiar things are for',
        'Doesn\'t copy others',
        'Doesn\'t gain new words',
        'Doesn\'t notice or mind when a caregiver leaves or returns',
        'Loses skills they once had'
      ],
      videoLinks: [
        {
          title: '18 Months - Walks without holding on',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/18months-independent-walking.mp4',
          description: 'See confident independent walking at 18 months',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/18months-walk-thumb.jpg',
          category: 'movement'
        },
        {
          title: '18 Months - Says three or more words',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/18months-vocabulary.mp4',
          description: 'Listen to expanding vocabulary at 18 months',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/18months-words-thumb.jpg',
          category: 'language'
        },
        {
          title: '18 Months - Scribbles on their own',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/18months-scribbling.mp4',
          description: 'Watch early drawing and scribbling development',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/18months-scribble-thumb.jpg',
          category: 'cognitive'
        },
        {
          title: '18 Months - Helps with dressing',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/18months-dressing-help.mp4',
          description: 'See how toddlers start helping with getting dressed',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/18months-dress-thumb.jpg',
          category: 'movement'
        }
      ]
    },

    // 2 Years - Week 104
    {
      id: 'two-years-milestones',
      weekStart: 104,
      weekEnd: 104,
      title: '2 Years: Language Explosion!',
      shortTitle: '2 Years',
      description: 'Your toddler is talking more, playing creatively, and showing their unique personality!',
      category: 'milestone',
      icon: 'chatbubbles',
      color: '#3f51b5',
      whatToExpected: [
        'Notices when others are hurt or upset, like pausing or looking sad when someone is crying',
        'Looks at your face to see how to react in a new situation',
        'Points to things in a book when you ask, like "Where is the bear?"',
        'Says at least 50 words',
        'Says two or more words together, with one action word, like "Doggie run"',
        'Names things in a book when you point and ask, "What is this?"',
        'Says words like "I," "me," or "we"',
        'Uses things to pretend, like feeding a doll with a toy bottle',
        'Shows simple problem-solving skills, like standing on a small stool to reach something',
        'Follows two-step instructions like "Put the toy down and come here"',
        'Shows they know at least one color, like pointing to a red crayon when you ask, "Which one is red?"',
        'Kicks a ball',
        'Runs',
        'Walks (not climbs) up a few stairs with or without help',
        'Eats with a spoon'
      ],
      tips: [
        'Encourage pretend play with dolls, cars, and household items',
        'Read books and ask questions about the pictures',
        'Sing songs and nursery rhymes together',
        'Provide opportunities for running and climbing',
        'Continue breastfeeding if desired - WHO recommends until age 2+'
      ],
      whenToWorry: [
        'Doesn\'t use 2-word phrases (like "drink milk")',
        'Doesn\'t know what to do with common things, like brush, phone, fork, spoon',
        'Doesn\'t copy actions and words',
        'Doesn\'t follow simple instructions',
        'Doesn\'t walk steadily',
        'Loses skills they once had'
      ],
      videoLinks: [
        {
          title: '2 Years - Says two-word phrases',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/24months-two-words.mp4',
          description: 'Listen to 2-year-olds combining words into phrases',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/24months-phrases-thumb.jpg',
          category: 'language'
        },
        {
          title: '2 Years - Pretend play',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/24months-pretend-play.mp4',
          description: 'Watch imaginative pretend play development',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/24months-pretend-thumb.jpg',
          category: 'cognitive'
        },
        {
          title: '2 Years - Follows two-step instructions',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/24months-instructions.mp4',
          description: 'See how 2-year-olds follow complex directions',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/24months-follow-thumb.jpg',
          category: 'language'
        },
        {
          title: '2 Years - Kicks a ball',
          url: 'https://www.cdc.gov/ncbddd/actearly/milestones/videos/24months-kicks-ball.mp4',
          description: 'Watch gross motor skills like kicking and running',
          thumbnail: 'https://www.cdc.gov/ncbddd/actearly/milestones/images/24months-kick-thumb.jpg',
          category: 'movement'
        }
      ]
    },

    // Fill in intermediate weeks with feeding and development content
    // Week 1-2: Early Days
    {
      id: 'early-days-1-2',
      weekStart: 1,
      weekEnd: 2,
      title: 'Learning Together',
      shortTitle: 'Early Days',
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

    // Week 3-4: Milk Coming In
    {
      id: 'milk-coming-in-3-4',
      weekStart: 3,
      weekEnd: 4,
      title: 'Your Milk is Coming In!',
      shortTitle: 'Milk In',
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

    // Week 5-7: Growth Spurts
    {
      id: 'growth-spurts-5-7',
      weekStart: 5,
      weekEnd: 7,
      title: 'Growth Spurts & Development',
      shortTitle: 'Growth',
      description: 'Baby might seem extra hungry some days. This is completely normal and helps boost your supply!',
      category: 'development',
      icon: 'trending-up',
      color: '#9c27b0',
      whatToExpected: [
        'Days when baby wants to feed constantly',
        'Increased fussiness during growth spurts',
        'Your milk supply adjusts to baby\'s needs',
        'Growth spurts typically last 2-3 days',
        'Baby becomes more alert and interactive'
      ],
      tips: [
        'Follow baby\'s lead during growth spurts',
        'Don\'t supplement unless medically necessary',
        'Stay hydrated and eat well',
        'Rest as much as possible',
        'Talk and sing to baby during alert periods'
      ],
      whenToWorry: [
        'Baby seems inconsolable for extended periods',
        'Significant decrease in wet diapers',
        'You feel your milk supply is inadequate'
      ]
    },

    // Week 9-15: Routine Development
    {
      id: 'routine-development-9-15',
      weekStart: 9,
      weekEnd: 15,
      title: 'Finding Your Rhythm',
      shortTitle: 'Routine',
      description: 'Feeding patterns are starting to emerge. You\'re both getting more comfortable!',
      category: 'development',
      icon: 'time',
      color: '#673ab7',
      whatToExpected: [
        'Some predictability in feeding times',
        'Baby may have longer sleep stretches',
        'More defined awake and sleep periods',
        'You feel more in tune with baby\'s needs',
        'Baby starts to show preferences'
      ],
      tips: [
        'Follow baby\'s natural rhythms',
        'Don\'t force rigid schedules yet',
        'Notice baby\'s unique patterns',
        'Flexibility is still key',
        'Establish simple bedtime routines'
      ],
      whenToWorry: [
        'Baby suddenly becomes very irregular',
        'Significant changes in feeding behavior',
        'You feel something isn\'t right'
      ]
    },

    // Week 17-23: Distraction Phase
    {
      id: 'distraction-phase-17-23',
      weekStart: 17,
      weekEnd: 23,
      title: 'Hello, Distractible Baby!',
      shortTitle: 'Distracted',
      description: 'Baby is becoming more aware of the world and might get distracted during feeds.',
      category: 'feeding',
      icon: 'eye',
      color: '#009688',
      whatToExpected: [
        'Baby looks around during feeding',
        'Easily distracted by sounds or movement',
        'May pull off breast to look around',
        'Feeds might take longer',
        'Increased hand coordination and reaching'
      ],
      tips: [
        'Find a quiet, dimly lit space for feeding',
        'Minimize distractions during feeds',
        'Be patient - this is normal development',
        'Try feeding when baby is sleepy',
        'Give baby something safe to hold during feeds'
      ],
      whenToWorry: [
        'Baby completely refuses to feed',
        'Significant weight loss',
        'Signs of dehydration'
      ]
    },

    // Week 25-35: Solid Foods Introduction
    {
      id: 'solid-foods-25-35',
      weekStart: 25,
      weekEnd: 35,
      title: 'First Foods Adventure',
      shortTitle: 'Solids',
      description: 'Baby is exploring new tastes and textures while breast milk remains their main nutrition.',
      category: 'feeding',
      icon: 'restaurant',
      color: '#8bc34a',
      whatToExpected: [
        'Baby plays with food more than eating',
        'Breast milk still provides most nutrition',
        'Gagging is normal as baby learns',
        'Very small amounts of food consumed',
        'Increased interest in what you\'re eating'
      ],
      tips: [
        'Food before one is just for fun!',
        'Continue breastfeeding on demand',
        'Offer variety but don\'t force',
        'Make mealtimes enjoyable and stress-free',
        'Let baby self-feed and explore textures'
      ],
      whenToWorry: [
        'Signs of food allergies',
        'Baby seems to be choking frequently',
        'Complete refusal to try any foods'
      ]
    },

    // Week 37-51: Mobile Baby
    {
      id: 'mobile-baby-37-51',
      weekStart: 37,
      weekEnd: 51,
      title: 'Your Mobile Little One',
      shortTitle: 'Mobile',
      description: 'Baby is becoming more mobile! This might affect feeding patterns and positions.',
      category: 'development',
      icon: 'walk',
      color: '#ff9800',
      whatToExpected: [
        'Crawling or attempting to crawl',
        'More distracted during feeds',
        'Shorter but more frequent nursing',
        'Prefers certain feeding positions',
        'Increased curiosity about surroundings'
      ],
      tips: [
        'Find quiet spaces for nursing',
        'Be flexible with feeding positions',
        'Offer breast before meals and snacks',
        'Baby-proof your home',
        'Encourage exploration in safe environments'
      ],
      whenToWorry: [
        'Significant decrease in milk intake',
        'Baby seems to be weaning too early',
        'Feeding becomes very stressful'
      ]
    },

    // Week 53-78: Toddler Feeding
    {
      id: 'toddler-feeding-53-78',
      weekStart: 53,
      weekEnd: 78,
      title: 'Toddler Nursing',
      shortTitle: 'Toddler',
      description: 'Your toddler still benefits from breastfeeding alongside their varied diet.',
      category: 'feeding',
      icon: 'nutrition',
      color: '#795548',
      whatToExpected: [
        'Nursing mainly for comfort and connection',
        'Eating a variety of solid foods',
        'May ask for "milk" or have special nursing words',
        'Nursing sessions may be shorter but meaningful',
        'Increased independence in eating'
      ],
      tips: [
        'Continue breastfeeding as long as you both want',
        'WHO recommends breastfeeding to 2 years and beyond',
        'Nursing provides comfort during illness or stress',
        'Don\'t feel pressured to wean before you\'re ready',
        'Celebrate your extended breastfeeding journey'
      ],
      whenToWorry: [
        'You feel pressured to stop before you\'re ready',
        'Breastfeeding becomes painful again',
        'Concerns about nutritional adequacy'
      ]
    },

    // Week 79-104: Extended Breastfeeding
    {
      id: 'extended-breastfeeding-79-104',
      weekStart: 79,
      weekEnd: 104,
      title: 'Extended Breastfeeding Journey',
      shortTitle: 'Extended',
      description: 'You\'re providing incredible benefits through extended breastfeeding. What an achievement!',
      category: 'feeding',
      icon: 'trophy',
      color: '#4caf50',
      whatToExpected: [
        'Nursing primarily for emotional comfort',
        'Strong immune system benefits continue',
        'Special bonding moments',
        'Toddler may nurse less frequently',
        'Continued nutritional benefits'
      ],
      tips: [
        'You\'re giving your child the best possible start',
        'Extended breastfeeding is normal worldwide',
        'Trust your instincts about when to wean',
        'Seek support from other extended breastfeeding mothers',
        'Be proud of your incredible journey'
      ],
      whenToWorry: [
        'You feel overwhelmed or touched out',
        'Nursing becomes consistently painful',
        'You want to wean but don\'t know how'
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