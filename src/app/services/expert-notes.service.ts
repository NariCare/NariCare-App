import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import {
  ExpertNote,
  ExpertLink,
  NotesResponse,
  LinksResponse,
  QuickAccessResponse,
  ContextualSuggestionsRequest,
  ContextualSuggestionsResponse,
  CreateNoteRequest,
  CreateLinkRequest,
  UpdateNoteRequest,
  UpdateLinkRequest,
  NotesSearchParams,
  LinksSearchParams,
  ApiErrorResponse,
  NOTE_CATEGORIES,
  LINK_CATEGORIES,
  CategoryInfo
} from '../models/expert-notes.model';
import { BackendAuthService } from './backend-auth.service';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExpertNotesService {
  private readonly API_BASE = `${environment.apiUrl}/expert-notes`;
  
  // Subject to track recently used items for quick access
  private recentlyUsedSubject = new BehaviorSubject<Array<{item: ExpertNote | ExpertLink, type: 'note' | 'link', usedAt: Date}>>([]);
  public recentlyUsed$ = this.recentlyUsedSubject.asObservable();

  // Cache for popular tags and categories
  private categoriesCache: { notes: CategoryInfo[], links: CategoryInfo[] } | null = null;
  private popularTagsCache: { notes?: string[], links?: string[] } | null = null;

  constructor(
    private http: HttpClient,
    private authService: BackendAuthService,
    private apiService: ApiService
  ) {}

  // ==================== NOTES METHODS ====================

  /**
   * Get notes with optional filtering and pagination
   */
  getNotes(params: NotesSearchParams = {}): Observable<NotesResponse> {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      const value = params[key as keyof NotesSearchParams];
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<NotesResponse>(`${this.API_BASE}/notes`, { 
      params: httpParams,
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create a new note
   */
  createNote(noteData: CreateNoteRequest): Observable<ExpertNote> {
    return this.http.post<{success: boolean, data: ExpertNote}>(`${this.API_BASE}/notes`, noteData, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Update an existing note
   */
  updateNote(id: string, updateData: UpdateNoteRequest): Observable<ExpertNote> {
    return this.http.put<{success: boolean, data: ExpertNote}>(`${this.API_BASE}/notes/${id}`, updateData, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Delete a note
   */
  deleteNote(id: string): Observable<void> {
    return this.http.delete<{success: boolean}>(`${this.API_BASE}/notes/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(() => void 0),
      catchError(this.handleError)
    );
  }

  /**
   * Track note usage and get content for copying/referencing
   */
  useNote(id: string): Observable<ExpertNote> {
    return this.http.post<{success: boolean, data: ExpertNote}>(`${this.API_BASE}/notes/${id}/use`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response.data),
      tap(note => this.trackRecentlyUsed(note, 'note')),
      catchError(this.handleError)
    );
  }

  // ==================== LINKS METHODS ====================

  /**
   * Get links with optional filtering and pagination
   */
  getLinks(params: LinksSearchParams = {}): Observable<LinksResponse> {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      const value = params[key as keyof LinksSearchParams];
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<LinksResponse>(`${this.API_BASE}/links`, { 
      params: httpParams,
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create a new link
   */
  createLink(linkData: CreateLinkRequest): Observable<ExpertLink> {
    return this.http.post<{success: boolean, data: ExpertLink}>(`${this.API_BASE}/links`, linkData, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Update an existing link
   */
  updateLink(id: string, updateData: UpdateLinkRequest): Observable<ExpertLink> {
    return this.http.put<{success: boolean, data: ExpertLink}>(`${this.API_BASE}/links/${id}`, updateData, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Delete a link
   */
  deleteLink(id: string): Observable<void> {
    return this.http.delete<{success: boolean}>(`${this.API_BASE}/links/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(() => void 0),
      catchError(this.handleError)
    );
  }

  /**
   * Track link usage and get link details
   */
  accessLink(id: string): Observable<ExpertLink> {
    return this.http.post<{success: boolean, data: ExpertLink}>(`${this.API_BASE}/links/${id}/access`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response.data),
      tap(link => this.trackRecentlyUsed(link, 'link')),
      catchError(this.handleError)
    );
  }

  /**
   * Increment link usage count (for when link is used but not actually opened)
   */
  incrementLinkUsage(id: string): Observable<void> {
    return this.http.post<{success: boolean}>(`${this.API_BASE}/links/${id}/increment-usage`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(() => void 0),
      catchError(this.handleError)
    );
  }

  // ==================== CONSULTATION HELPER METHODS ====================

  /**
   * Get quick access items (favorites + most used)
   */
  getQuickAccess(category?: string, type: 'notes' | 'links' | 'both' = 'both'): Observable<QuickAccessResponse> {
    let httpParams = new HttpParams();
    if (category) httpParams = httpParams.set('category', category);
    if (type) httpParams = httpParams.set('type', type);

    return this.http.get<QuickAccessResponse>(`${this.API_BASE}/quick-access`, {
      params: httpParams,
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get contextual suggestions based on consultation context
   */
  getContextualSuggestions(context: ContextualSuggestionsRequest): Observable<ContextualSuggestionsResponse> {
    return this.http.post<ContextualSuggestionsResponse>(`${this.API_BASE}/suggestions`, context, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Search across both notes and links
   */
  search(query: string, category?: string, type: 'notes' | 'links' | 'both' = 'both', limit: number = 10): Observable<{notes: ExpertNote[], links: ExpertLink[]}> {
    let httpParams = new HttpParams()
      .set('q', query)
      .set('limit', limit.toString());
      
    if (category) httpParams = httpParams.set('category', category);
    if (type) httpParams = httpParams.set('type', type);

    return this.http.get<{success: boolean, data: {notes: ExpertNote[], links: ExpertLink[]}}>(`${this.API_BASE}/search`, {
      params: httpParams,
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get available categories for notes or links
   */
  getCategories(type: 'notes' | 'links' | 'both' = 'both'): Observable<{notes: CategoryInfo[], links: CategoryInfo[]}> {
    // Return cached data if available
    if (this.categoriesCache) {
      const result: any = {};
      if (type === 'notes' || type === 'both') result.notes = NOTE_CATEGORIES;
      if (type === 'links' || type === 'both') result.links = LINK_CATEGORIES;
      return new Observable(observer => {
        observer.next(result);
        observer.complete();
      });
    }

    return this.http.get<{success: boolean, data: {notes: CategoryInfo[], links: CategoryInfo[]}}>(`${this.API_BASE}/categories`, {
      params: new HttpParams().set('type', type),
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        // Cache the result
        this.categoriesCache = response.data;
        return response.data;
      }),
      catchError(() => {
        // Return hardcoded categories as fallback
        const fallback: any = {};
        if (type === 'notes' || type === 'both') fallback.notes = NOTE_CATEGORIES;
        if (type === 'links' || type === 'both') fallback.links = LINK_CATEGORIES;
        return [fallback];
      })
    );
  }

  /**
   * Get popular tags for notes or links
   */
  getPopularTags(type: 'notes' | 'links' | 'both' = 'both'): Observable<{notes?: string[], links?: string[]}> {
    // Return cached data if available
    if (this.popularTagsCache) {
      return new Observable(observer => {
        observer.next(this.popularTagsCache!);
        observer.complete();
      });
    }

    return this.http.get<{success: boolean, data: {notes?: string[], links?: string[]}}>(`${this.API_BASE}/tags`, {
      params: new HttpParams().set('type', type),
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        // Cache the result
        this.popularTagsCache = response.data;
        return response.data;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Copy note content to clipboard
   */
  async copyNoteContent(note: ExpertNote): Promise<boolean> {
    try {
      // Track usage
      await this.useNote(note.id).toPromise();
      
      // Copy to clipboard
      const content = `${note.title}\n\n${note.content}`;
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      console.error('Error copying note content:', error);
      return false;
    }
  }

  /**
   * Open link in new tab and track access
   */
  async openLink(link: ExpertLink): Promise<void> {
    try {
      // Track usage
      await this.accessLink(link.id).toPromise();
      
      // Open link
      window.open(link.url, '_blank');
    } catch (error) {
      console.error('Error opening link:', error);
      // Still open the link even if tracking fails
      window.open(link.url, '_blank');
    }
  }

  /**
   * Get category info by key
   */
  getCategoryInfo(key: string, type: 'note' | 'link'): CategoryInfo | undefined {
    const categories = type === 'note' ? NOTE_CATEGORIES : LINK_CATEGORIES;
    return categories.find(cat => cat.key === key);
  }

  /**
   * Format content for sharing in chat/consultation
   */
  formatForSharing(item: ExpertNote | ExpertLink, type: 'note' | 'link'): string {
    if (type === 'note') {
      const note = item as ExpertNote;
      return `📝 **${note.title}**\n\n${note.content}\n\n*Source: Expert Notes*`;
    } else {
      const link = item as ExpertLink;
      let formatted = `🔗 **${link.title}**\n${link.url}`;
      if (link.description) {
        formatted += `\n\n${link.description}`;
      }
      formatted += '\n\n*Source: Expert Links*';
      return formatted;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private getAuthHeaders(): { [header: string]: string } {
    const token = this.apiService.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = 'Authentication required. Please log in again.';
          // Could trigger logout here
          break;
        case 403:
          errorMessage = 'You don\'t have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'The requested resource was not found.';
          break;
        case 422:
          errorMessage = error.error?.error || 'Please check your input and try again.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = error.error?.error || `Error: ${error.message}`;
      }
    }
    
    console.error('ExpertNotesService error:', error);
    return throwError(errorMessage);
  };

  private trackRecentlyUsed(item: ExpertNote | ExpertLink, type: 'note' | 'link'): void {
    const currentItems = this.recentlyUsedSubject.value;
    
    // Remove if already exists
    const filteredItems = currentItems.filter(recentItem => recentItem.item.id !== item.id);
    
    // Add to front
    const updatedItems = [
      { item, type, usedAt: new Date() },
      ...filteredItems
    ].slice(0, 10); // Keep only last 10 items
    
    this.recentlyUsedSubject.next(updatedItems);
  }
}