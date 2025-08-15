import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { GrowthTrackingService } from '../../services/growth-tracking.service';
import { AuthService } from '../../services/auth.service';
import { 
  EmotionCheckinRecord, 
  EmotionalStruggle, 
  PositiveMoment, 
  ConcerningThought 
} from '../../models/emotion-checkin.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-emotion-checkin-modal',
  templateUrl: './emotion-checkin-modal.component.html',
  styleUrls: ['./emotion-checkin-modal.component.scss']
})
export class EmotionCheckinModalComponent implements OnInit {
  @Input() selectedBaby?: any; // Not used but kept for consistency

  emotionForm: FormGroup;
  user: User | null = null;
  currentStep = 1;
  totalSteps = 4;
  
  // Selection states
  selectedStruggles: EmotionalStruggle[] = [];
  selectedPositiveMoments: PositiveMoment[] = [];
  selectedConcerningThoughts: ConcerningThought[] = [];
  
  // Show crisis alert
  showCrisisAlert = false;

  // Predefined options
  emotionalStruggles: EmotionalStruggle[] = [
    { id: 'tired', text: 'I feel exhausted and overwhelmed', emoji: '😴', category: 'physical' },
    { id: 'sad', text: 'I feel sad or down more than usual', emoji: '😢', category: 'emotional' },
    { id: 'anxious', text: 'I feel anxious or worried constantly', emoji: '😰', category: 'emotional' },
    { id: 'guilty', text: 'I feel guilty about my parenting', emoji: '😔', category: 'emotional' },
    { id: 'isolated', text: 'I feel disconnected from others', emoji: '😞', category: 'social' },
    { id: 'inadequate', text: 'I feel like I\'m not good enough as a mother', emoji: '😟', category: 'emotional' },
    { id: 'angry', text: 'I feel irritable or angry more often', emoji: '😠', category: 'emotional' },
    { id: 'hopeless', text: 'I feel hopeless about the future', emoji: '😰', category: 'emotional' },
    { id: 'physical-pain', text: 'I\'m experiencing physical discomfort', emoji: '😣', category: 'physical' },
    { id: 'sleep-deprived', text: 'I\'m struggling with lack of sleep', emoji: '😵', category: 'physical' }
  ];

  positiveMoments: PositiveMoment[] = [
    { id: 'bonding', text: 'I felt a special connection with my baby', emoji: '🥰', category: 'bonding' },
    { id: 'successful-feed', text: 'I had a successful breastfeeding session', emoji: '🌟', category: 'achievement' },
    { id: 'support', text: 'I received helpful support from someone', emoji: '🤗', category: 'support' },
    { id: 'proud', text: 'I felt proud of my progress', emoji: '😊', category: 'personal' },
    { id: 'peaceful', text: 'I had a moment of peace and calm', emoji: '😌', category: 'personal' },
    { id: 'confident', text: 'I felt confident in my abilities', emoji: '💪', category: 'personal' },
    { id: 'grateful', text: 'I felt grateful for this journey', emoji: '🙏', category: 'personal' },
    { id: 'baby-milestone', text: 'My baby reached a new milestone', emoji: '🎉', category: 'bonding' },
    { id: 'self-care', text: 'I took time for self-care', emoji: '💆‍♀️', category: 'personal' },
    { id: 'community', text: 'I connected with other mothers', emoji: '👥', category: 'support' }
  ];

  concerningThoughts: ConcerningThought[] = [
    { id: 'harm-thoughts', text: 'I\'ve thought of harming myself or my baby', emoji: '🚨', severity: 'critical' },
    { id: 'baby-better-off', text: 'I think my baby would be better off without me', emoji: '💔', severity: 'critical' },
    { id: 'escape-thoughts', text: 'I have thoughts of running away or escaping', emoji: '🏃‍♀️', severity: 'high' },
    { id: 'failure-thoughts', text: 'I constantly think I\'m failing as a mother', emoji: '😞', severity: 'moderate' },
    { id: 'intrusive-thoughts', text: 'I have scary thoughts I can\'t control', emoji: '😨', severity: 'high' },
    { id: 'regret-baby', text: 'I regret having my baby', emoji: '😔', severity: 'high' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController,
    private growthService: GrowthTrackingService,
    private authService: AuthService
  ) {
    this.emotionForm = this.formBuilder.group({
      gratefulFor: [''],
      proudOfToday: [''],
      tomorrowGoal: [''],
      additionalNotes: ['']
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  async closeModal() {
    if (this.showCrisisAlert) {
      const alert = await this.alertController.create({
        header: 'Are you sure?',
        message: 'We noticed you selected some concerning thoughts. Please consider reaching out for support before closing.',
        buttons: [
          {
            text: 'Get Help Now',
            handler: () => {
              this.showCrisisSupport();
            }
          },
          {
            text: 'Close Anyway',
            role: 'destructive',
            handler: () => {
              this.modalController.dismiss();
            }
          }
        ]
      });
      await alert.present();
    } else {
      await this.modalController.dismiss();
    }
  }

  nextStep() {
    if (this.validateCurrentStep()) {
      this.currentStep++;
      
      // Check for crisis alert when moving past concerning thoughts step
      if (this.currentStep === 4 && this.selectedConcerningThoughts.length > 0) {
        this.showCrisisAlert = true;
        this.showCrisisSupport();
      }
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  private validateCurrentStep(): boolean {
    // All steps are optional, so always return true
    // Users can proceed even without selecting anything
    return true;
  }

  // Selection methods for struggles
  toggleStruggle(struggle: EmotionalStruggle) {
    const index = this.selectedStruggles.findIndex(s => s.id === struggle.id);
    if (index > -1) {
      this.selectedStruggles.splice(index, 1);
    } else {
      this.selectedStruggles.push(struggle);
    }
  }

  isStruggleSelected(struggle: EmotionalStruggle): boolean {
    return this.selectedStruggles.some(s => s.id === struggle.id);
  }

  // Selection methods for positive moments
  togglePositiveMoment(moment: PositiveMoment) {
    const index = this.selectedPositiveMoments.findIndex(m => m.id === moment.id);
    if (index > -1) {
      this.selectedPositiveMoments.splice(index, 1);
    } else {
      this.selectedPositiveMoments.push(moment);
    }
  }

  isPositiveMomentSelected(moment: PositiveMoment): boolean {
    return this.selectedPositiveMoments.some(m => m.id === moment.id);
  }

  // Selection methods for concerning thoughts
  toggleConcerningThought(thought: ConcerningThought) {
    const index = this.selectedConcerningThoughts.findIndex(t => t.id === thought.id);
    if (index > -1) {
      this.selectedConcerningThoughts.splice(index, 1);
    } else {
      this.selectedConcerningThoughts.push(thought);
      
      // Immediately show crisis support if critical thought is selected
      if (thought.severity === 'critical') {
        this.showCrisisAlert = true;
        setTimeout(() => {
          this.showCrisisSupport();
        }, 500);
      }
    }
  }

  isConcerningThoughtSelected(thought: ConcerningThought): boolean {
    return this.selectedConcerningThoughts.some(t => t.id === thought.id);
  }

  private async showCrisisSupport() {
    const alert = await this.alertController.create({
      header: 'Immediate Support Recommended',
      message: 'Your responses indicate you may be experiencing thoughts that require immediate attention. Please know you are not alone, and help is available. Reaching out is a sign of incredible strength.',
      buttons: [
        {
          text: 'Call Crisis Hotline',
          handler: () => {
            window.open('tel:988', '_system'); // US National Suicide Prevention Lifeline
          }
        },
        {
          text: 'Call Emergency Services',
          handler: () => {
            window.open('tel:911', '_system');
          }
        },
        {
          text: 'Find Local Resources',
          handler: () => {
            window.open('https://www.postpartum.net/get-help/locations/', '_blank');
          }
        },
        {
          text: 'Continue Check-in',
          role: 'cancel'
        }
      ],
      cssClass: 'crisis-alert'
    });
    await alert.present();
  }

  // Form submission
  async saveEmotionCheckin() {
    if (this.user) {
      try {
        const formValue = this.emotionForm.value;
        
        const record: Omit<EmotionCheckinRecord, 'id' | 'createdAt'> = {
          userId: this.user.uid,
          date: new Date(),
          time: new Date().toTimeString().slice(0, 5),
          selectedStruggles: this.selectedStruggles,
          selectedPositiveMoments: this.selectedPositiveMoments,
          selectedConcerningThoughts: this.selectedConcerningThoughts,
          gratefulFor: formValue.gratefulFor,
          proudOfToday: formValue.proudOfToday,
          tomorrowGoal: formValue.tomorrowGoal,
          additionalNotes: formValue.additionalNotes,
          enteredViaVoice: false
        };

        await this.growthService.addEmotionCheckinRecord(record);
        
        const toast = await this.toastController.create({
          message: 'Emotion check-in saved successfully! Thank you for taking care of yourself. 💕',
          duration: 3000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        await this.modalController.dismiss({ saved: true });

      } catch (error) {
        const toast = await this.toastController.create({
          message: 'Failed to save emotion check-in. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    }
  }

  canSave(): boolean {
    // Allow saving even if nothing is selected - sometimes that's meaningful too
    return true;
  }

  getProgressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  getCurrentTime(): string {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  }

  getSelectedCount(type: 'struggles' | 'positive' | 'concerning'): number {
    switch (type) {
      case 'struggles':
        return this.selectedStruggles.length;
      case 'positive':
        return this.selectedPositiveMoments.length;
      case 'concerning':
        return this.selectedConcerningThoughts.length;
      default:
        return 0;
    }
  }

  hasCriticalThoughts(): boolean {
    return this.selectedConcerningThoughts.some(t => t.severity === 'critical');
  }
}