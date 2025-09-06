import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { Storage } from '@ionic/storage-angular';
import { ApiService, LoginResponse, RegisterResponse, TwoFactorResponse } from './api.service';
import { User } from '../models/user.model';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { FacebookLogin } from '@capacitor-community/facebook-login';
import { Platform } from '@ionic/angular';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BackendAuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private twoFactorRequiredSubject = new BehaviorSubject<boolean>(false);
  public twoFactorRequired$ = this.twoFactorRequiredSubject.asObservable();
  
  private pendingEmail: string = '';
  private initializationComplete = new BehaviorSubject<boolean>(false);
  public initialized$ = this.initializationComplete.asObservable();

  constructor(
    private apiService: ApiService,
    private router: Router,
    private storage: Storage,
    private afAuth: AngularFireAuth,
    private platform: Platform
  ) {
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      // Check if user is already authenticated synchronously first
      const token = localStorage.getItem('naricare_token');
      if (token && this.apiService.isAuthenticated()) {
        try {
          const response = await this.apiService.getUserProfile().toPromise();
          if (response?.success && response.data) {
            const user = this.transformUserData(response.data);
            this.currentUserSubject.next(user);
            
            // Don't auto-navigate here, let app.component handle it
            console.log('User loaded on initialization:', user.email);
          }
        } catch (error) {
          console.warn('Failed to load user profile on init:', error);
          this.apiService.logout().subscribe();
          this.currentUserSubject.next(null);
        }
      }
    } finally {
      // Always mark initialization as complete
      this.initializationComplete.next(true);
    }
  }

  private async waitForFirebaseAuth(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Wait up to 10 seconds for Firebase Auth to be ready
      const timeout = setTimeout(() => {
        reject(new Error('Firebase Auth initialization timeout'));
      }, 10000);

      // Check if AngularFireAuth is ready
      if (this.afAuth) {
        // Subscribe to auth state to ensure it's initialized
        const subscription = this.afAuth.authState.subscribe({
          next: () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
            resolve();
          },
          error: (error) => {
            clearTimeout(timeout);
            subscription.unsubscribe();
            console.warn('Firebase Auth initialization error:', error);
            resolve(); // Still resolve to continue with the flow
          }
        });
      } else {
        clearTimeout(timeout);
        reject(new Error('AngularFireAuth service not available'));
      }
    });
  }

  async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber?: string;
    whatsappNumber?: string;
    motherType?: 'pregnant' | 'new_mom';
    dueDate?: string;
    birthDate?: string;
    babyGender?: 'male' | 'female' | 'other';
    tier?: 'basic' | 'one-month' | 'three-month';
  }): Promise<void> {
    try {
      const response = await this.apiService.register(userData).toPromise();
      
      if (response?.success && response.data) {
        // API returns user data directly in response.data, not response.data.user
        const user = this.transformUserData(response.data);
        this.currentUserSubject.next(user);
        
        // Navigate to dashboard (onboarding temporarily disabled)
        this.router.navigate(['/tabs/dashboard']);
      } else {
        throw new Error(response?.message || 'Registration failed');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const response = await this.apiService.login(email, password).toPromise();
      
      if (response?.success && response.data) {
        if (response.data.requiresTwoFactor) {
          // 2FA required
          this.pendingEmail = email;
          this.twoFactorRequiredSubject.next(true);
          return;
        }
        
        // Normal login success
        const user = this.transformUserData(response.data.user);
        this.currentUserSubject.next(user);
        this.twoFactorRequiredSubject.next(false);
        
        // Navigate to dashboard (onboarding temporarily disabled)
        this.router.navigate(['/tabs/dashboard']);
      } else {
        throw new Error(response?.message || 'Login failed');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async verify2FA(otp: string): Promise<void> {
    try {
      const response = await this.apiService.verify2FA(this.pendingEmail, otp).toPromise();
      
      if (response?.success && response.data?.token) {
        // Get user profile after successful 2FA
        const profileResponse = await this.apiService.getUserProfile().toPromise();
        
        if (profileResponse?.success && profileResponse.data) {
          const user = this.transformUserData(profileResponse.data);
          this.currentUserSubject.next(user);
          this.twoFactorRequiredSubject.next(false);
          this.pendingEmail = '';
          
          // Navigate based on onboarding status
          if (user.isOnboardingCompleted) {
            this.router.navigate(['/tabs/dashboard']);
          } else {
            this.router.navigate(['/onboarding']);
          }
        }
      } else {
        throw new Error(response?.message || '2FA verification failed');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async resendOTP(): Promise<void> {
    try {
      const response = await this.apiService.resendOTP(this.pendingEmail).toPromise();
      
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to resend OTP');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async enable2FA(): Promise<void> {
    try {
      const response = await this.apiService.enable2FA().toPromise();
      
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to enable 2FA');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async disable2FA(otp: string): Promise<void> {
    try {
      const response = await this.apiService.disable2FA(otp).toPromise();
      
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to disable 2FA');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async logout(): Promise<void> {
    try {
      await this.apiService.logout().toPromise();
    } catch (error) {
      console.warn('Logout API call failed, but clearing local state:', error);
    } finally {
      // Always clear local state
      await this.clearAllUserData();
      this.currentUserSubject.next(null);
      this.twoFactorRequiredSubject.next(false);
      this.pendingEmail = '';
      this.router.navigate(['/auth/login']);
    }
  }

  private async clearAllUserData(): Promise<void> {
    try {
      // Initialize storage if not already done
      await this.storage.create();
      
      // Clear all Ionic Storage data
      await this.storage.clear();
      
      // Note: localStorage is cleared by ApiService.clearAllUserData()
      console.log('All user data cleared from local storage');
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): Observable<boolean> {
    return this.currentUser$.pipe(map(user => !!user));
  }

  async updateUserProfile(updates: Partial<User>): Promise<void> {
    try {
      const response = await this.apiService.updateUserProfile(updates).toPromise();
      
      if (response?.success) {
        if (response.data) {
          const updatedUser = this.transformUserData(response.data);
          this.currentUserSubject.next(updatedUser);
        }
        // Success with or without data - both are valid
      } else {
        throw new Error(response?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async updateNotificationPreferences(preferences: any): Promise<void> {
    try {
      const response = await this.apiService.updateNotificationPreferences(preferences).toPromise();
      
      if (response?.success) {
        // Update current user with new preferences
        const currentUser = this.getCurrentUser();
        if (currentUser) {
          currentUser.notificationPreferences = { ...currentUser.notificationPreferences, ...preferences };
          this.currentUserSubject.next(currentUser);
        }
      } else {
        throw new Error(response?.message || 'Failed to update notification preferences');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  // Social sign-in methods
  async signInWithGoogle(): Promise<void> {
    try {
      if (this.platform.is('capacitor')) {
        // For mobile app - use Capacitor Google Auth plugin
        // TODO: Implement Capacitor Google Auth when available
        throw new Error('Mobile Google sign-in not yet implemented. Please use web version.');
      } else {
        // Wait for Firebase Auth to be ready
        await this.waitForFirebaseAuth();

        // Check if AngularFireAuth is available
        if (!this.afAuth) {
          throw new Error('Firebase Auth is not available. Please check your Firebase configuration.');
        }

        // For web - use Firebase Auth directly through AngularFireAuth
        if (!firebase.auth || !firebase.auth.GoogleAuthProvider) {
          throw new Error('Firebase Google Auth provider not available');
        }

        const provider = new firebase.auth.GoogleAuthProvider();
        
        // Validate provider was created successfully
        if (!provider) {
          throw new Error('Failed to create Google Auth provider');
        }
        
        // Configure provider with basic settings
        provider.addScope('profile');
        provider.addScope('email');
        
        // Set additional provider parameters to ensure compatibility
        provider.setCustomParameters({
          'prompt': 'select_account'
        });
        
        console.log('Starting Google sign-in with provider:', provider);
        console.log('Firebase Auth instance:', this.afAuth);
        
        // Try using Firebase Auth directly instead of AngularFireAuth
        console.log('Attempting direct Firebase Auth call...');
        
        // Initialize Firebase app if not already initialized
        if (!firebase.apps.length) {
          console.log('Firebase app not initialized, initializing now...');
          try {
            firebase.initializeApp(environment.firebase);
            console.log('Firebase app initialized successfully');
          } catch (error) {
            console.error('Failed to initialize Firebase app:', error);
            throw new Error('Failed to initialize Firebase app');
          }
        }
        
        // Get the underlying Firebase Auth instance
        const auth = firebase.auth();
        
        console.log('Direct Firebase Auth instance:', auth);
        console.log('Firebase apps:', firebase.apps);
        console.log('Provider for direct call:', provider);
        
        // Verify auth instance is ready
        if (!auth) {
          throw new Error('Firebase Auth instance not available');
        }
        
        let result;
        try {
          result = await auth.signInWithPopup(provider);
        } catch (directAuthError) {
          console.log('Direct Firebase Auth failed, trying AngularFireAuth:', directAuthError);
          
          // Fallback to AngularFireAuth if direct auth fails
          if (this.afAuth && typeof this.afAuth.signInWithPopup === 'function') {
            console.log('Using AngularFireAuth as fallback...');
            result = await this.afAuth.signInWithPopup(provider);
          } else {
            throw directAuthError;
          }
        }
        
        console.log('Google sign-in result:', result);
        
        if (result && result.user) {
          await this.handleSocialAuthResult(result, 'google');
        } else {
          throw new Error('Google authentication failed - no user returned');
        }
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      
      // Provide more specific error messages for Firebase errors
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by browser. Please allow popups and try again.');
      } else if (error.code === 'auth/argument-error') {
        throw new Error('Firebase configuration error. Please contact support.');
      } else if (error.code && error.code.startsWith('auth/')) {
        throw new Error(`Authentication error: ${error.message}`);
      }
      
      throw new Error(this.getErrorMessage(error));
    }
  }

  async signInWithFacebook(): Promise<void> {
    try {
      console.log('Facebook sign-in started');
      console.log('Platform is capacitor:', this.platform.is('capacitor'));
      
      if (this.platform.is('capacitor')) {
        // For mobile app - use Capacitor Facebook Login plugin
        const FACEBOOK_PERMISSIONS = ['email', 'public_profile'];
        
        console.log('Starting Facebook login with Capacitor plugin...');
        
        const result = await FacebookLogin.login({ permissions: FACEBOOK_PERMISSIONS });
        
        console.log('Facebook login result:', result);
        
        if (result.accessToken) {
          // Get user profile from Facebook
          const response = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${result.accessToken.token}`);
          const profile = await response.json();
          
          console.log('Facebook profile data:', profile);
          
          await this.handleFacebookResult({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            picture: profile.picture?.data?.url,
            accessToken: result.accessToken.token
          });
        } else {
          throw new Error('Facebook authentication was cancelled');
        }
      } else {
        // For web - skip Firebase Auth completely and use direct approach
        console.log('Facebook web login - bypassing Firebase Auth...');
        
        // For now, show a user-friendly message for web users
        throw new Error('Facebook sign-in is currently available on mobile only. Please use Google sign-in or download our mobile app.');
      }
    } catch (error: any) {
      console.error('Facebook sign-in error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Provide more specific error messages for Facebook
      if (error.code === 'auth/argument-error') {
        throw new Error('Facebook authentication error. Please try Google sign-in instead.');
      } else if (error.message?.includes('cancelled')) {
        throw new Error('Facebook sign-in was cancelled.');
      }
      
      throw new Error(this.getErrorMessage(error));
    }
  }

  private async facebookWebLogin(): Promise<void> {
    // Facebook SDK for web would be implemented here
    // For now, we're focusing on mobile implementation
    throw new Error('Facebook web login not implemented. Please use the mobile app.');
  }

  private async handleSocialAuthResult(result: firebase.auth.UserCredential, provider: 'google' | 'facebook'): Promise<void> {
    try {
      // Get Firebase ID token
      const idToken = await result.user!.getIdToken();
      
      // For Google via Firebase, we only have idToken, not accessToken
      // But backend API expects both fields, so we'll send idToken as both
      const socialAuthData = {
        provider,
        accessToken: idToken, // For Google, this is actually the idToken
        idToken: idToken      // Preferred for security
      };
      
      console.log('Sending social auth data to backend:', socialAuthData);
      
      await this.authenticateWithBackend(socialAuthData);
    } catch (error: any) {
      console.error('Social auth backend error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }
  
  private async handleFacebookResult(facebookProfile: any): Promise<void> {
    try {
      // For Facebook, we have the actual accessToken
      const socialAuthData = {
        provider: 'facebook',
        accessToken: facebookProfile.accessToken,
        idToken: facebookProfile.accessToken // For Facebook, accessToken serves as both
      };
      
      console.log('Sending Facebook auth data to backend:', socialAuthData);
      
      await this.authenticateWithBackend(socialAuthData);
    } catch (error: any) {
      console.error('Facebook auth backend error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  private async authenticateWithBackend(socialAuthData: any): Promise<void> {
    try {
      // Call backend API endpoint for social authentication
      const response = await this.apiService.socialAuth(socialAuthData).toPromise();
      
      if (response?.success && response.data) {
        const user = this.transformUserData(response.data.user);
        this.currentUserSubject.next(user);
        
        // Navigate to dashboard (onboarding temporarily disabled)
        this.router.navigate(['/tabs/dashboard']);
      } else {
        throw new Error(response?.message || 'Social authentication failed');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  // Helper method to transform API user data to frontend User model
  private transformUserData(apiUser: any): User {
    return {
      uid: apiUser.userId || apiUser.id || apiUser.uid || '',
      email: apiUser.email || '',
      firstName: apiUser.firstName || apiUser.first_name || '',
      lastName: apiUser.lastName || apiUser.last_name || '',
      phoneNumber: apiUser.phoneNumber || apiUser.phone_number || '',
      whatsappNumber: apiUser.whatsappNumber || apiUser.whatsapp_number || '',
      motherType: apiUser.motherType || apiUser.mother_type,
      dueDate: apiUser.dueDate || apiUser.due_date ? new Date(apiUser.dueDate || apiUser.due_date) : undefined,
      profileImage: apiUser.profileImage || apiUser.profile_image,
      role: apiUser.role || 'user',
      tier: {
        type: apiUser.tier?.type || apiUser.tier_type || 'basic',
        startDate: apiUser.tier?.startDate ? new Date(apiUser.tier.startDate) : new Date(),
        endDate: apiUser.tier?.endDate ? new Date(apiUser.tier.endDate) : undefined,
        consultationsRemaining: apiUser.tier?.consultationsRemaining || apiUser.consultations_remaining || 0,
        features: apiUser.tier?.features || this.getTierFeatures(apiUser.tier?.type || apiUser.tier_type || 'basic')
      },
      createdAt: new Date(apiUser.createdAt || apiUser.created_at || Date.now()),
      isOnboardingCompleted: apiUser.isOnboardingCompleted ?? apiUser.is_onboarding_completed ?? false,
      notificationPreferences: {
        articleUpdates: apiUser.notificationPreferences?.articleUpdates ?? apiUser.article_updates ?? true,
        callReminders: apiUser.notificationPreferences?.callReminders ?? apiUser.call_reminders ?? true,
        groupMessages: apiUser.notificationPreferences?.groupMessages ?? apiUser.group_messages ?? true,
        growthReminders: apiUser.notificationPreferences?.growthReminders ?? apiUser.growth_reminders ?? true,
        expertMessages: apiUser.notificationPreferences?.expertMessages ?? apiUser.expert_messages ?? true
      },
      babies: Array.isArray(apiUser.babies) ? 
        apiUser.babies.filter(baby => baby && baby.id).map((baby: any) => ({
          id: baby.id,
          name: baby.name || '',
          dateOfBirth: new Date(baby.dateOfBirth || baby.date_of_birth || Date.now()),
          gender: baby.gender || 'other',
          birthWeight: baby.birthWeight || baby.birth_weight || 0,
          birthHeight: baby.birthHeight || baby.birth_height || 0,
          currentWeight: baby.currentWeight || baby.current_weight || 0,
          currentHeight: baby.currentHeight || baby.current_height || 0
        })) : [],
      socialProvider: apiUser.socialProvider || apiUser.social_provider
    };
  }

  private getTierFeatures(tierType: string): string[] {
    switch (tierType) {
      case 'one-month':
        return ['knowledge-base', 'group-chat', 'expert-consultation', 'growth-tracking', 'ai-chatbot'];
      case 'three-month':
        return ['knowledge-base', 'group-chat', 'expert-consultation', 'growth-tracking', 'ai-chatbot', 'priority-support', 'timeline'];
      default:
        return ['knowledge-base', 'group-chat'];
    }
  }

  private getErrorMessage(error: any): string {
    // First, try to extract the actual API error message
    if (error?.message) {
      return error.message;
    }
    
    if (error?.error) {
      // Check for API response structure - prioritize 'error' field first since that's what your API uses
      if (error.error.error) {
        // API error format: { success: false, error: "Error message" }
        return error.error.error;
      } else if (error.error.message) {
        // Alternative API error format: { success: false, message: "Error message" }
        return error.error.message;
      } else if (typeof error.error === 'string') {
        // Direct string error
        return error.error;
      } else if (error.error.errors && Array.isArray(error.error.errors)) {
        // Validation errors array: { errors: [{ message: "Field error" }] }
        const firstError = error.error.errors[0];
        return firstError.message || firstError.msg || 'Validation error occurred';
      }
    }
    
    // Handle common HTTP error codes as fallback - only use generic messages if no specific error was found
    switch (error?.status) {
      case 0:
        return 'Network error. Please check your internet connection.';
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication failed. Please check your credentials.';
      case 403:
        return 'Access denied. You don\'t have permission for this action.';
      case 404:
        return 'Resource not found.';
      case 409:
        return 'Conflict. This resource already exists.';
      case 422:
        return 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  // Method to get pending email for 2FA
  getPendingEmail(): string {
    return this.pendingEmail;
  }

  // Method to check if 2FA is required
  isTwoFactorRequired(): boolean {
    return this.twoFactorRequiredSubject.value;
  }
}