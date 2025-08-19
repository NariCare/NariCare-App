import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { Storage } from '@ionic/storage-angular';
import { ApiService, LoginResponse, RegisterResponse, TwoFactorResponse } from './api.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class BackendAuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private twoFactorRequiredSubject = new BehaviorSubject<boolean>(false);
  public twoFactorRequired$ = this.twoFactorRequiredSubject.asObservable();
  
  private pendingEmail: string = '';

  constructor(
    private apiService: ApiService,
    private router: Router,
    private storage: Storage
  ) {
    this.initializeAuth();
  }

  private async initializeAuth() {
    // Check if user is already authenticated
    if (this.apiService.isAuthenticated()) {
      try {
        const response = await this.apiService.getUserProfile().toPromise();
        if (response?.success && response.data) {
          this.currentUserSubject.next(this.transformUserData(response.data));
        }
      } catch (error) {
        console.warn('Failed to load user profile on init:', error);
        this.apiService.logout().subscribe();
      }
    }
  }

  async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber?: string;
    motherType?: 'pregnant' | 'new_mom';
    tier?: 'basic' | 'one-month' | 'three-month';
  }): Promise<void> {
    try {
      const response = await this.apiService.register(userData).toPromise();
      
      if (response?.success && response.data) {
        const user = this.transformUserData(response.data.user);
        this.currentUserSubject.next(user);
        
        // Navigate based on onboarding status
        if (user.isOnboardingCompleted) {
          this.router.navigate(['/tabs/dashboard']);
        } else {
          this.router.navigate(['/onboarding']);
        }
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
        
        // Navigate based on onboarding status
        if (user.isOnboardingCompleted) {
          this.router.navigate(['/tabs/dashboard']);
        } else {
          this.router.navigate(['/onboarding']);
        }
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
      
      if (response?.success && response.data) {
        const updatedUser = this.transformUserData(response.data);
        this.currentUserSubject.next(updatedUser);
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

  // Social sign-in methods (these would integrate with Firebase Auth or similar)
  async signInWithGoogle(): Promise<void> {
    // This would typically integrate with Google OAuth
    // For now, we'll throw an error to indicate it needs implementation
    throw new Error('Google sign-in requires OAuth integration. Please use email/password login.');
  }

  async signInWithFacebook(): Promise<void> {
    // This would typically integrate with Facebook OAuth
    // For now, we'll throw an error to indicate it needs implementation
    throw new Error('Facebook sign-in requires OAuth integration. Please use email/password login.');
  }

  // Helper method to transform API user data to frontend User model
  private transformUserData(apiUser: any): User {
    return {
      uid: apiUser.id || apiUser.uid,
      email: apiUser.email,
      firstName: apiUser.firstName || apiUser.first_name,
      lastName: apiUser.lastName || apiUser.last_name,
      phoneNumber: apiUser.phoneNumber || apiUser.phone_number,
      whatsappNumber: apiUser.whatsappNumber || apiUser.whatsapp_number,
      motherType: apiUser.motherType || apiUser.mother_type,
      dueDate: apiUser.dueDate ? new Date(apiUser.dueDate) : undefined,
      profileImage: apiUser.profileImage || apiUser.profile_image,
      role: apiUser.role || 'user',
      tier: {
        type: apiUser.tier?.type || apiUser.tier_type || 'basic',
        startDate: apiUser.tier?.startDate ? new Date(apiUser.tier.startDate) : new Date(),
        endDate: apiUser.tier?.endDate ? new Date(apiUser.tier.endDate) : undefined,
        consultationsRemaining: apiUser.tier?.consultationsRemaining || apiUser.consultations_remaining || 0,
        features: apiUser.tier?.features || this.getTierFeatures(apiUser.tier?.type || 'basic')
      },
      createdAt: new Date(apiUser.createdAt || apiUser.created_at),
      isOnboardingCompleted: apiUser.isOnboardingCompleted ?? apiUser.is_onboarding_completed ?? false,
      notificationPreferences: {
        articleUpdates: apiUser.notificationPreferences?.articleUpdates ?? apiUser.article_updates ?? true,
        callReminders: apiUser.notificationPreferences?.callReminders ?? apiUser.call_reminders ?? true,
        groupMessages: apiUser.notificationPreferences?.groupMessages ?? apiUser.group_messages ?? true,
        growthReminders: apiUser.notificationPreferences?.growthReminders ?? apiUser.growth_reminders ?? true,
        expertMessages: apiUser.notificationPreferences?.expertMessages ?? apiUser.expert_messages ?? true
      },
      babies: (apiUser.babies || []).map((baby: any) => ({
        id: baby.id,
        name: baby.name,
        dateOfBirth: new Date(baby.dateOfBirth || baby.date_of_birth),
        gender: baby.gender,
        birthWeight: baby.birthWeight || baby.birth_weight,
        birthHeight: baby.birthHeight || baby.birth_height,
        currentWeight: baby.currentWeight || baby.current_weight,
        currentHeight: baby.currentHeight || baby.current_height
      })),
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
    if (error?.message) {
      return error.message;
    }
    
    if (error?.error?.message) {
      return error.error.message;
    }
    
    // Handle common HTTP error codes
    switch (error?.status) {
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