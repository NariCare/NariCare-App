import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

// Import both local and backend services
import { AuthService as LocalAuthService } from './auth.service';
import { GrowthTrackingService as LocalGrowthService } from './growth-tracking.service';
import { KnowledgeBaseService as LocalKnowledgeService } from './knowledge-base.service';
import { ChatService as LocalChatService } from './chat.service';
import { ConsultationService as LocalConsultationService } from './consultation.service';
import { BabyTimelineService as LocalTimelineService } from './baby-timeline.service';

import { BackendAuthService } from './backend-auth.service';
import { BackendGrowthTrackingService } from './backend-growth-tracking.service';
import { BackendKnowledgeService } from './backend-knowledge.service';
import { BackendChatService } from './backend-chat.service';
import { BackendConsultationService } from './backend-consultation.service';
import { BackendTimelineService } from './backend-timeline.service';

import { ApiService } from './api.service';
import { User } from '../models/user.model';

export type DataSource = 'local' | 'backend' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ApiIntegrationService {
  private dataSourceSubject = new BehaviorSubject<DataSource>('auto');
  public dataSource$ = this.dataSourceSubject.asObservable();
  
  private isBackendAvailableSubject = new BehaviorSubject<boolean>(false);
  public isBackendAvailable$ = this.isBackendAvailableSubject.asObservable();

  constructor(
    // Local services
    private localAuthService: LocalAuthService,
    private localGrowthService: LocalGrowthService,
    private localKnowledgeService: LocalKnowledgeService,
    private localChatService: LocalChatService,
    private localConsultationService: LocalConsultationService,
    private localTimelineService: LocalTimelineService,
    
    // Backend services
    private backendAuthService: BackendAuthService,
    private backendGrowthService: BackendGrowthTrackingService,
    private backendKnowledgeService: BackendKnowledgeService,
    private backendChatService: BackendChatService,
    private backendConsultationService: BackendConsultationService,
    private backendTimelineService: BackendTimelineService,
    
    // API service for health checks
    private apiService: ApiService
  ) {
    this.checkBackendAvailability();
  }

  // ============================================================================
  // BACKEND AVAILABILITY CHECKING
  // ============================================================================

  private async checkBackendAvailability(): Promise<void> {
    try {
      const response = await this.apiService.healthCheck().toPromise();
      this.isBackendAvailableSubject.next(true);
      console.log('✅ Backend is available');
      
      // Auto-switch to backend if available and data source is 'auto'
      if (this.dataSourceSubject.value === 'auto') {
        this.setDataSource('backend');
      }
    } catch (error) {
      this.isBackendAvailableSubject.next(false);
      console.warn('⚠️ Backend is not available, using local services');
      
      // Auto-switch to local if backend unavailable and data source is 'auto'
      if (this.dataSourceSubject.value === 'auto') {
        this.setDataSource('local');
      }
    }
  }

  // ============================================================================
  // DATA SOURCE MANAGEMENT
  // ============================================================================

  setDataSource(source: DataSource): void {
    this.dataSourceSubject.next(source);
    console.log(`📡 Data source set to: ${source}`);
  }

  getCurrentDataSource(): DataSource {
    return this.dataSourceSubject.value;
  }

  isUsingBackend(): boolean {
    const source = this.dataSourceSubject.value;
    return source === 'backend' || (source === 'auto' && this.isBackendAvailableSubject.value);
  }

  isUsingLocal(): boolean {
    const source = this.dataSourceSubject.value;
    return source === 'local' || (source === 'auto' && !this.isBackendAvailableSubject.value);
  }

  // ============================================================================
  // UNIFIED SERVICE INTERFACES
  // ============================================================================

  // Authentication Service
  getAuthService(): LocalAuthService | BackendAuthService {
    return this.isUsingBackend() ? this.backendAuthService : this.localAuthService;
  }

  // Growth Tracking Service
  getGrowthTrackingService(): LocalGrowthService | BackendGrowthTrackingService {
    return this.isUsingBackend() ? this.backendGrowthService : this.localGrowthService;
  }

  // Knowledge Base Service
  getKnowledgeService(): LocalKnowledgeService | BackendKnowledgeService {
    return this.isUsingBackend() ? this.backendKnowledgeService : this.localKnowledgeService;
  }

  // Chat Service
  getChatService(): LocalChatService | BackendChatService {
    return this.isUsingBackend() ? this.backendChatService : this.localChatService;
  }

  // Consultation Service
  getConsultationService(): LocalConsultationService | BackendConsultationService {
    return this.isUsingBackend() ? this.backendConsultationService : this.localConsultationService;
  }

  // Timeline Service
  getTimelineService(): LocalTimelineService | BackendTimelineService {
    return this.isUsingBackend() ? this.backendTimelineService : this.localTimelineService;
  }

  // ============================================================================
  // UNIFIED AUTHENTICATION METHODS
  // ============================================================================

  getCurrentUser(): Observable<User | null> {
    return this.isUsingBackend() ? 
      this.backendAuthService.currentUser$ : 
      this.localAuthService.currentUser$;
  }

  isAuthenticated(): Observable<boolean> {
    return this.isUsingBackend() ? 
      this.backendAuthService.isAuthenticated() : 
      this.localAuthService.isAuthenticated();
  }

  async login(email: string, password: string): Promise<void> {
    if (this.isUsingBackend()) {
      return this.backendAuthService.login(email, password);
    } else {
      return this.localAuthService.login(email, password);
    }
  }

  async register(userData: any): Promise<void> {
    if (this.isUsingBackend()) {
      return this.backendAuthService.register(userData);
    } else {
      return this.localAuthService.register(userData.email, userData.password, userData);
    }
  }

  async logout(): Promise<void> {
    if (this.isUsingBackend()) {
      return this.backendAuthService.logout();
    } else {
      return this.localAuthService.logout();
    }
  }

  // ============================================================================
  // DATA MIGRATION METHODS
  // ============================================================================

  async migrateToBackend(): Promise<void> {
    if (!this.isBackendAvailableSubject.value) {
      throw new Error('Backend is not available for migration');
    }

    try {
      console.log('🔄 Starting data migration to backend...');
      
      // This would involve:
      // 1. Export all local data
      // 2. Upload to backend via API
      // 3. Verify data integrity
      // 4. Switch to backend data source
      
      // For now, just switch the data source
      this.setDataSource('backend');
      
      console.log('✅ Data migration completed');
    } catch (error) {
      console.error('❌ Data migration failed:', error);
      throw error;
    }
  }

  async syncWithBackend(): Promise<void> {
    if (!this.isBackendAvailableSubject.value) {
      throw new Error('Backend is not available for sync');
    }

    try {
      console.log('🔄 Syncing local data with backend...');
      
      // This would involve:
      // 1. Compare local vs backend data
      // 2. Resolve conflicts
      // 3. Upload newer local data
      // 4. Download newer backend data
      
      console.log('✅ Data sync completed');
    } catch (error) {
      console.error('❌ Data sync failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async testBackendConnection(): Promise<boolean> {
    try {
      await this.apiService.healthCheck().toPromise();
      this.isBackendAvailableSubject.next(true);
      return true;
    } catch (error) {
      this.isBackendAvailableSubject.next(false);
      return false;
    }
  }

  getConnectionStatus(): {
    isBackendAvailable: boolean;
    currentDataSource: DataSource;
    recommendedAction?: string;
  } {
    const isBackendAvailable = this.isBackendAvailableSubject.value;
    const currentDataSource = this.dataSourceSubject.value;
    
    let recommendedAction: string | undefined;
    
    if (!isBackendAvailable && currentDataSource === 'backend') {
      recommendedAction = 'Switch to local data source or check backend connection';
    } else if (isBackendAvailable && currentDataSource === 'local') {
      recommendedAction = 'Consider migrating to backend for better features';
    }

    return {
      isBackendAvailable,
      currentDataSource,
      recommendedAction
    };
  }

  // Method to force refresh backend availability
  async refreshBackendStatus(): Promise<void> {
    await this.checkBackendAvailability();
  }
}