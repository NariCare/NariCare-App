import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { User } from '../models/user.model';
import { Storage } from '@ionic/storage-angular';
import { environment } from '../../environments/environment';

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
    private storage: Storage
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
    
    // Store mock data in localStorage for the growth service
    localStorage.setItem('growthRecords', JSON.stringify(mockGrowthRecords));
    localStorage.setItem('weightRecords', JSON.stringify(mockWeightRecords));
    
    const mockUser: User = {
      uid: 'mock-user-123',
      email: email,
      firstName: 'Demo',
      lastName: 'User',
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
        name: 'Emma',
        dateOfBirth: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        gender: 'female',
        birthWeight: 3.2,
        birthHeight: 50
      }]
    };
    
    this.currentUserSubject.next(mockUser);
    this.router.navigate(['/tabs/dashboard']);
  }

  private generateMockGrowthData(): any[] {
    const records = [];
    const babyId = 'baby-123';
    const userId = 'mock-user-123';
    
    // Generate data for the past 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Vary the data slightly for each day
      const baseFeedings = 8 + Math.floor(Math.random() * 4); // 8-11 sessions
      const baseDuration = 18 + Math.floor(Math.random() * 8); // 18-25 minutes
      const basePumping = 2 + Math.floor(Math.random() * 3); // 2-4 sessions
      const baseOutput = 100 + Math.floor(Math.random() * 100); // 100-200ml
      
      const moodOptions = [
        { emoji: '😊', label: 'Great', value: 'great', color: '#10b981' },
        { emoji: '🙂', label: 'Good', value: 'good', color: '#059669' },
        { emoji: '😐', label: 'Okay', value: 'okay', color: '#6b7280' },
        { emoji: '😴', label: 'Tired', value: 'tired', color: '#f59e0b' }
      ];
      
      const randomMood = moodOptions[Math.floor(Math.random() * moodOptions.length)];
      
      records.push({
        id: `record-${i}`,
        babyId: babyId,
        recordedBy: userId,
        date: date.toISOString(),
        directFeedingSessions: baseFeedings,
        avgFeedingDuration: baseDuration,
        pumpingSessions: basePumping,
        totalPumpingOutput: baseOutput,
        formulaIntake: i < 3 ? 0 : Math.floor(Math.random() * 50), // Some formula for older days
        peeCount: 6 + Math.floor(Math.random() * 4), // 6-9 pees
        poopCount: 2 + Math.floor(Math.random() * 3), // 2-4 poops
        mood: randomMood,
        moodDescription: i === 0 ? 'Feeling good today, baby is feeding well!' : 
                        i === 2 ? 'A bit tired but managing okay' : '',
        notes: i === 1 ? 'Baby seemed extra hungry today, had longer feeding sessions' : 
               i === 4 ? 'Great day! Baby latched perfectly' : '',
        enteredViaVoice: Math.random() > 0.7, // 30% chance of voice entry
        createdAt: date.toISOString(),
        updatedAt: date.toISOString()
      });
    }
    
    return records;
  }
  
  private generateMockWeightData(): any[] {
    const records = [];
    const babyId = 'baby-123';
    const userId = 'mock-user-123';
    
    // Generate weekly weight records for the past 6 weeks
    let currentWeight = 3.2; // Starting birth weight
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7)); // Weekly intervals
      
      // Baby gains approximately 150-200g per week
      currentWeight += 0.15 + (Math.random() * 0.05); // 150-200g gain
      
      records.push({
        id: `weight-${i}`,
        babyId: babyId,
        recordedBy: userId,
        date: date.toISOString(),
        weight: Math.round(currentWeight * 100) / 100, // Round to 2 decimal places
        notes: i === 0 ? 'Great weight gain this week!' : 
               i === 2 ? 'Steady progress, doctor is happy' : 
               i === 4 ? 'Back to birth weight!' : '',
        createdAt: date.toISOString()
      });
    }
    
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