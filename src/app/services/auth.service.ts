import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { User } from '../models/user.model';
import { Storage } from '@ionic/storage-angular';
import { environment } from '../../environments/environment';
import { GrowthTrackingService } from './growth-tracking.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Firebase services (loaded conditionally)
  private afAuth: any;
  private firestore: any;
  private isFirebaseEnabled = false;

  constructor(
    private router: Router,
    private storage: Storage,
    private growthTrackingService: GrowthTrackingService
  ) {
    this.initializeAuth();
  }

  private async initializeAuth() {
    await this.storage.create();
    
    // Check if Firebase is properly configured
    const isFirebaseConfigured = environment.firebase.apiKey !== 'your-api-key-here' && 
                                 environment.firebase.projectId !== 'your-project-id';
    
    if (false && isFirebaseConfigured) {
      try {
        // Dynamically import Firebase services
        const { AngularFireAuth } = await import('@angular/fire/compat/auth');
        const { AngularFirestore } = await import('@angular/fire/compat/firestore');
        
        // Get injected services (this requires proper DI setup)
        // For now, we'll assume they're available globally
        this.isFirebaseEnabled = true;
        console.log('Firebase is configured and ready');
        
        // Set up auth state listener
        this.setupFirebaseAuthListener();
      } catch (error) {
        console.warn('Firebase not available, using mock authentication');
        this.setupMockAuth();
      }
    } else {
      console.warn('Firebase not configured, using mock authentication');
      this.setupMockAuth();
    }
  }

  private async setupFirebaseAuthListener() {
    if (!this.isFirebaseEnabled) return;

    try {
      // Import Firebase auth
      const { AngularFireAuth } = await import('@angular/fire/compat/auth');
      
      // This would need proper DI injection in a real app
      // For now, we'll use a workaround
      console.log('Setting up Firebase auth listener...');
      
      // Listen to auth state changes
      // this.afAuth.authState.subscribe(async (firebaseUser) => {
      //   if (firebaseUser) {
      //     const user = await this.getUserProfile(firebaseUser.uid);
      //     this.currentUserSubject.next(user);
      //   } else {
      //     this.currentUserSubject.next(null);
      //   }
      // });
      
    } catch (error) {
      console.error('Error setting up Firebase auth listener:', error);
      this.setupMockAuth();
    }
  }

  private setupMockAuth() {
    // Mock authentication for development when Firebase isn't configured
    const mockUser: User = {
      uid: 'mock-user-123',
      email: 'demo@NariCare.app',
      firstName: 'Demo',
      lastName: 'User',
      role: 'user',
      tier: {
        type: 'basic',
        startDate: new Date(),
        consultationsRemaining: 0,
        features: ['knowledge-base', 'group-chat']
      },
      createdAt: new Date(),
      isOnboardingCompleted: true,
      notificationPreferences: {
        articleUpdates: true,
        callReminders: true,
        groupMessages: true,
        growthReminders: true,
        expertMessages: true
      },
      babies: [{
        id: 'baby-123',
        name: 'Baby Demo',
        dateOfBirth: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        gender: 'female',
        birthWeight: 3.2,
        birthHeight: 50
      }]
    };
    
    // Simulate logged in user for demo
    setTimeout(() => {
      this.currentUserSubject.next(mockUser);
    }, 1000);
  }

  async register(email: string, password: string, userData: Partial<User>): Promise<void> {
    if (!this.isFirebaseEnabled) {
      return this.mockRegister(email, password, userData);
    }

    try {
      // Import Firebase auth
      const { AngularFireAuth } = await import('@angular/fire/compat/auth');
      const { AngularFirestore } = await import('@angular/fire/compat/firestore');
      
      // Get Firebase instances (this would normally be injected)
      const auth = (window as any).firebase?.auth();
      const firestore = (window as any).firebase?.firestore();
      
      if (!auth || !firestore) {
        throw new Error('Firebase not properly initialized');
      }

      // Create user with email and password
      const credential = await auth.createUserWithEmailAndPassword(email, password);
      
      if (!credential.user) {
        throw new Error('Failed to create user');
      }

      // Create user profile in Firestore
      const user: User = {
        uid: credential.user.uid,
        email: email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phoneNumber: userData.phoneNumber,
        tier: {
          type: userData.tier?.type || 'basic',
          startDate: new Date(),
          consultationsRemaining: userData.tier?.type === 'one-month' ? 2 : userData.tier?.type === 'three-month' ? 6 : 0,
          features: this.getTierFeatures(userData.tier?.type || 'basic')
        },
        createdAt: new Date(),
        isOnboardingCompleted: false,
        notificationPreferences: {
          articleUpdates: true,
          callReminders: true,
          groupMessages: true,
          growthReminders: true,
          expertMessages: true
        },
        babies: []
      };

      // Save user profile to Firestore
      await firestore.collection('users').doc(credential.user.uid).set(user);
      
      this.currentUserSubject.next(user);
      this.router.navigate(['/onboarding']);

    } catch (error: any) {
      console.error('Firebase registration error:', error);
      throw new Error(this.getFirebaseErrorMessage(error.code) || error.message);
    }
  }

  async login(email: string, password: string): Promise<void> {
    if (!this.isFirebaseEnabled) {
      return this.mockLogin(email, password);
    }

    try {
      // Import Firebase auth
      const auth = (window as any).firebase?.auth();
      
      if (!auth) {
        throw new Error('Firebase not properly initialized');
      }

      // Sign in with email and password
      const credential = await auth.signInWithEmailAndPassword(email, password);
      
      if (!credential.user) {
        throw new Error('Failed to sign in');
      }

      // Get user profile from Firestore
      const user = await this.getUserProfile(credential.user.uid);
      
      if (!user) {
        throw new Error('User profile not found');
      }

      this.currentUserSubject.next(user);
      
      // Navigate based on onboarding status
      if (user.isOnboardingCompleted) {
        this.router.navigate(['/tabs/dashboard']);
      } else {
        this.router.navigate(['/onboarding']);
      }

    } catch (error: any) {
      console.error('Firebase login error:', error);
      throw new Error(this.getFirebaseErrorMessage(error.code) || error.message);
    }
  }

  async logout(): Promise<void> {
    if (!this.isFirebaseEnabled) {
      return this.mockLogout();
    }

    try {
      const auth = (window as any).firebase?.auth();
      
      if (auth) {
        await auth.signOut();
      }
      
      this.currentUserSubject.next(null);
      await this.storage.clear();
      this.router.navigate(['/auth/login']);

    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      this.currentUserSubject.next(null);
      await this.storage.clear();
      this.router.navigate(['/auth/login']);
    }
  }

  private async getUserProfile(uid: string): Promise<User | null> {
    try {
      const firestore = (window as any).firebase?.firestore();
      
      if (!firestore) {
        return null;
      }

      const doc = await firestore.collection('users').doc(uid).get();
      
      if (doc.exists) {
        return { id: doc.id, ...doc.data() } as User;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): Observable<boolean> {
    return this.currentUser$.pipe(map(user => !!user));
  }

  async updateUserProfile(updates: Partial<User>): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) return;

    const updatedUser = { ...user, ...updates };
    this.currentUserSubject.next(updatedUser);
    
    if (!this.isFirebaseEnabled) {
      console.log('Mock profile update:', updates);
      return;
    }
    
    try {
      const firestore = (window as any).firebase?.firestore();
      
      if (firestore) {
        await firestore.collection('users').doc(user.uid).update(updates);
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Mock methods for when Firebase is not available
  private async mockRegister(email: string, password: string, userData: Partial<User>): Promise<void> {
    console.log('Mock registration for:', email);
    const mockUser: User = {
      uid: 'mock-user-' + Date.now(),
      email: email,
      role: 'user',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      phoneNumber: userData.phoneNumber,
      tier: {
        type: userData.tier?.type || 'basic',
        startDate: new Date(),
        consultationsRemaining: userData.tier?.type === 'one-month' ? 2 : userData.tier?.type === 'three-month' ? 6 : 0,
        features: this.getTierFeatures(userData.tier?.type || 'basic')
      },
      createdAt: new Date(),
      isOnboardingCompleted: false,
      notificationPreferences: {
        articleUpdates: true,
        callReminders: true,
        groupMessages: true,
        growthReminders: true,
        expertMessages: true
      },
      babies: []
    };
    
    this.currentUserSubject.next(mockUser);
    this.router.navigate(['/onboarding']);
  }

  private async mockLogin(email: string, password: string): Promise<void> {
    console.log('Mock login for:', email);
    
    // Generate mock growth data for the past 7 days
    const mockGrowthRecords = this.generateMockGrowthData();
    const mockWeightRecords = this.generateMockWeightData();
    const mockStoolRecords = this.generateMockStoolData();
    
    // Store mock data in localStorage for the growth service
    await this.storage.set('growthRecords', mockGrowthRecords);
    await this.storage.set('weightRecords', mockWeightRecords);
    await this.storage.set('stoolRecords', mockStoolRecords);
    
    // Force growth tracking service to reload data
    await this.growthTrackingService.loadStoredData();
    
    const mockUser: User = {
      uid: 'mock-user-123',
      email: email,
      firstName: 'Demo',
      lastName: 'User',
      role: 'user',
      tier: {
        type: 'basic',
        startDate: new Date(),
        consultationsRemaining: 0,
        features: ['knowledge-base', 'group-chat']
      },
      createdAt: new Date(),
      isOnboardingCompleted: true,
      notificationPreferences: {
        articleUpdates: true,
        callReminders: true,
        groupMessages: true,
        growthReminders: true,
        expertMessages: true
      },
      babies: [
        {
          id: 'baby-123',
          name: 'Emma',
          dateOfBirth: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
          gender: 'female',
          birthWeight: 3.2,
          birthHeight: 50
        },
        {
          id: 'baby-456',
          name: 'Oliver',
          dateOfBirth: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
          gender: 'male',
          birthWeight: 3.5,
          birthHeight: 52
        }
      ]
    };
    
    this.currentUserSubject.next(mockUser);
    this.router.navigate(['/tabs/dashboard']);
  }

  private generateMockGrowthData(): any[] {
    const records = [];
    const userId = 'mock-user-123';
    
    // Generate data for both babies
    const babies = [
      { id: 'baby-123', name: 'Emma', daysOld: 45 },
      { id: 'baby-456', name: 'Oliver', daysOld: 120 }
    ];
    
    babies.forEach(baby => {
      // Generate data for the past 7 days for each baby
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Adjust data based on baby's age
        const ageMultiplier = baby.daysOld > 60 ? 1.2 : 1; // Older babies feed more efficiently
        
        const moodOptions = [
          { emoji: '😌', label: 'Relaxed', value: 'relaxed', color: '#10b981' },
          { emoji: '😊', label: 'Happy', value: 'happy', color: '#059669' },
          { emoji: '😢', label: 'Sad', value: 'sad', color: '#6b7280' },
          { emoji: '😴', label: 'Exhausted', value: 'exhausted', color: '#f59e0b' },
          { emoji: '😰', label: 'Anxious', value: 'anxious', color: '#ef4444' }
        ];
        
        const randomMood = moodOptions[Math.floor(Math.random() * moodOptions.length)];
        const breastSides = ['left', 'right', 'both'];
        const supplements = [null, 'breastmilk', 'formula'];
        const lipstickShapes = ['rounded', 'lipstick'];
        
        // Generate realistic times
        const startHour = 6 + Math.floor(Math.random() * 12); // 6 AM to 6 PM
        const startMinute = Math.floor(Math.random() * 60);
        const endMinute = startMinute + 15 + Math.floor(Math.random() * 25); // 15-40 min sessions
        const endHour = startHour + Math.floor(endMinute / 60);
        const finalEndMinute = endMinute % 60;
        
        const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
        const endTime = `${endHour.toString().padStart(2, '0')}:${finalEndMinute.toString().padStart(2, '0')}`;
        
        records.push({
          id: `record-${baby.id}-${i}`,
          babyId: baby.id,
          recordedBy: userId,
          date: date.toISOString(),
          startTime: startTime,
          endTime: endTime,
          breastSide: breastSides[Math.floor(Math.random() * breastSides.length)],
          supplement: supplements[Math.floor(Math.random() * supplements.length)],
          painLevel: Math.floor(Math.random() * 4), // 0-3 pain level
          lipstickShape: lipstickShapes[Math.floor(Math.random() * lipstickShapes.length)],
          mood: randomMood,
          directFeedingSessions: Math.floor(6 + Math.random() * 6), // 6-11 sessions
          avgFeedingDuration: Math.floor(15 + Math.random() * 20), // 15-35 minutes
          pumpingSessions: Math.floor(Math.random() * 4), // 0-3 sessions
          totalPumpingOutput: Math.floor(50 + Math.random() * 150), // 50-200ml
          formulaIntake: baby.daysOld > 60 ? Math.floor(Math.random() * 100) : 0, // Formula for older baby
          peeCount: Math.floor(6 + Math.random() * 4), // 6-9 pees
          poopCount: Math.floor(2 + Math.random() * 3), // 2-4 poops
          moodDescription: i === 0 ? `${baby.name} is feeding well today!` : 
                          i === 2 ? 'A bit tired but managing okay' : '',
          notes: i === 1 ? `${baby.name} seemed extra hungry today, had longer feeding sessions` : 
                 i === 4 ? `Great day! ${baby.name} latched perfectly` : '',
          enteredViaVoice: Math.random() > 0.7, // 30% chance of voice entry
          createdAt: date.toISOString(),
          updatedAt: date.toISOString()
        });
      }
    });
    
    return records;
  }
  
  private generateMockWeightData(): any[] {
    const records = [];
    const userId = 'mock-user-123';
    
    // Generate weight data for both babies
    const babies = [
      { id: 'baby-123', name: 'Emma', startWeight: 3.2, daysOld: 45 },
      { id: 'baby-456', name: 'Oliver', startWeight: 3.5, daysOld: 120 }
    ];
    
    babies.forEach(baby => {
      let currentWeight = baby.startWeight;
      const weeksOld = Math.floor(baby.daysOld / 7);
      
      // Generate weekly weight records
      for (let i = weeksOld; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7)); // Weekly intervals
        
        // Baby gains approximately 150-200g per week initially, then slows down
        const weeklyGain = i > 8 ? 0.10 + (Math.random() * 0.05) : 0.15 + (Math.random() * 0.05);
        currentWeight += weeklyGain;
        
        records.push({
          id: `weight-${baby.id}-${i}`,
          babyId: baby.id,
          recordedBy: userId,
          date: date.toISOString(),
          weight: Math.round(currentWeight * 100) / 100, // Round to 2 decimal places
          height: baby.id === 'baby-123' ? 50 + (weeksOld - i) * 0.8 : 52 + (weeksOld - i) * 0.9, // Height growth
          notes: i === 0 ? `Great weight gain this week for ${baby.name}!` : 
                 i === 2 ? `Steady progress, doctor is happy with ${baby.name}` : 
                 i === 4 ? `${baby.name} back to birth weight!` : '',
          enteredViaVoice: Math.random() > 0.8, // 20% chance of voice entry
          createdAt: date.toISOString()
        });
      }
    });
    
    return records;
  }
  
  private generateMockStoolData(): any[] {
    const records = [];
    const userId = 'mock-user-123';
    
    // Stool color, texture, and size options
    const stoolColors = [
      { value: 'very-dark', label: 'Very dark', color: '#374151' },
      { value: 'dark-green', label: 'Dark green', color: '#059669' },
      { value: 'dark-brown', label: 'Dark brown', color: '#92400e' },
      { value: 'mustard-yellow', label: 'Mustard yellow', color: '#d97706' }
    ];
    
    const stoolTextures = [
      { value: 'liquid', label: 'Liquid', icon: 'water' },
      { value: 'pasty', label: 'Pasty', icon: 'ellipse' },
      { value: 'hard', label: 'Hard', icon: 'diamond' }
    ];
    
    const stoolSizes = [
      { value: 'coin', label: 'Coin', icon: 'ellipse-outline' },
      { value: 'tablespoon', label: 'Tablespoon', icon: 'ellipse' },
      { value: 'bigger', label: 'Bigger', icon: 'ellipse' }
    ];
    
    // Generate data for both babies
    const babies = [
      { id: 'baby-123', name: 'Emma', daysOld: 45 },
      { id: 'baby-456', name: 'Oliver', daysOld: 120 }
    ];
    
    babies.forEach(baby => {
      // Generate stool records for the past 5 days (2-3 per day)
      for (let i = 4; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const recordsPerDay = 2 + Math.floor(Math.random() * 2); // 2-3 records per day
        
        for (let j = 0; j < recordsPerDay; j++) {
          const hour = 8 + j * 6 + Math.floor(Math.random() * 4); // Spread throughout day
          const minute = Math.floor(Math.random() * 60);
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          
          // Age-appropriate stool characteristics
          let colorIndex, textureIndex, sizeIndex;
          
          if (baby.daysOld < 60) {
            // Younger baby - more mustard yellow, pasty
            colorIndex = Math.random() > 0.3 ? 3 : Math.floor(Math.random() * 3); // Favor mustard yellow
            textureIndex = Math.random() > 0.5 ? 1 : 0; // Favor pasty/liquid
            sizeIndex = Math.random() > 0.7 ? 1 : 0; // Favor smaller sizes
          } else {
            // Older baby - more variety
            colorIndex = Math.floor(Math.random() * 4);
            textureIndex = Math.floor(Math.random() * 3);
            sizeIndex = Math.floor(Math.random() * 3);
          }
          
          records.push({
            id: `stool-${baby.id}-${i}-${j}`,
            babyId: baby.id,
            recordedBy: userId,
            date: date.toISOString(),
            time: time,
            color: stoolColors[colorIndex],
            texture: stoolTextures[textureIndex],
            size: stoolSizes[sizeIndex],
            notes: j === 0 && i === 0 ? `${baby.name}'s stool looks healthy today` : 
                   j === 1 && i === 2 ? `Normal consistency for ${baby.name}` : '',
            enteredViaVoice: Math.random() > 0.85, // 15% chance of voice entry
            createdAt: date.toISOString()
          });
        }
      }
    });
    
    return records;
  }

  private async mockLogout(): Promise<void> {
    this.currentUserSubject.next(null);
    await this.storage.clear();
    this.router.navigate(['/auth/login']);
  }

  private getTierFeatures(tierType: string): string[] {
    switch (tierType) {
      case 'one-month':
        return ['knowledge-base', 'group-chat', 'expert-consultation', 'growth-tracking', 'ai-chatbot'];
      case 'three-month':
        return ['knowledge-base', 'group-chat', 'expert-consultation', 'growth-tracking', 'ai-chatbot', 'priority-support'];
      default:
        return ['knowledge-base', 'group-chat'];
    }
  }

  private getFirebaseErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}