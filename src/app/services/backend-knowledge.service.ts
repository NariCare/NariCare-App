import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Article, ArticleCategory, SearchResult } from '../models/knowledge-base.model';

@Injectable({
  providedIn: 'root'
})
export class BackendKnowledgeService {
  private categoriesSubject = new BehaviorSubject<ArticleCategory[]>([]);
  private articlesSubject = new BehaviorSubject<Article[]>([]);
  private bookmarksSubject = new BehaviorSubject<string[]>([]);

  constructor(private apiService: ApiService) {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    // Load categories
    this.apiService.getKnowledgeCategories().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categoriesSubject.next(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });

    // Load user bookmarks
    this.loadUserBookmarks();
  }

  private loadUserBookmarks(): void {
    if (this.apiService.isAuthenticated()) {
      this.apiService.getUserBookmarks().subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const bookmarkIds = response.data.map((bookmark: any) => bookmark.article_id || bookmark.articleId);
            this.bookmarksSubject.next(bookmarkIds);
          }
        },
        error: (error) => {
          console.error('Error loading bookmarks:', error);
        }
      });
    }
  }

  // ============================================================================
  // CATEGORY METHODS
  // ============================================================================

  getCategories(): Observable<ArticleCategory[]> {
    return this.categoriesSubject.asObservable();
  }

  // ============================================================================
  // ARTICLE METHODS
  // ============================================================================

  getFeaturedArticles(limit: number = 5): Observable<Article[]> {
    return this.apiService.getArticles({ featured: true, limit }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.map(this.transformArticle);
        }
        return [];
      }),
      catchError((error) => {
        console.error('Error loading featured articles:', error);
        return of([]);
      })
    );
  }

  getRecentArticles(limit: number = 10): Observable<Article[]> {
    return this.apiService.getArticles({ limit }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.map(this.transformArticle);
        }
        return [];
      }),
      catchError((error) => {
        console.error('Error loading recent articles:', error);
        return of([]);
      })
    );
  }

  getArticlesByCategory(categoryId: string): Observable<Article[]> {
    return this.apiService.getArticles({ category: categoryId }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.map(this.transformArticle);
        }
        return [];
      }),
      catchError((error) => {
        console.error('Error loading articles by category:', error);
        return of([]);
      })
    );
  }

  getArticle(id: string): Observable<Article | undefined> {
    return this.apiService.getArticleById(id).pipe(
      map(response => {
        if (response.success && response.data) {
          return this.transformArticle(response.data);
        }
        return undefined;
      }),
      catchError((error) => {
        console.error('Error loading article:', error);
        return of(undefined);
      })
    );
  }

  // ============================================================================
  // SEARCH METHODS
  // ============================================================================

  searchArticles(searchTerm?: string, categoryId?: string, difficulty?: string): Observable<SearchResult> {
    if (!searchTerm && !categoryId && !difficulty) {
      return of({
        articles: [],
        totalCount: 0,
        facets: { categories: {}, tags: {}, difficulty: {} }
      });
    }

    const searchQuery = searchTerm || '';
    const options: any = {};
    
    if (categoryId) options.category = categoryId;
    if (difficulty) options.difficulty = difficulty;

    return this.apiService.searchArticles(searchQuery, options).pipe(
      map(response => {
        if (response.success && response.data) {
          return {
            articles: response.data.articles?.map(this.transformArticle) || [],
            totalCount: response.data.totalCount || 0,
            facets: response.data.facets || { categories: {}, tags: {}, difficulty: {} }
          };
        }
        return {
          articles: [],
          totalCount: 0,
          facets: { categories: {}, tags: {}, difficulty: {} }
        };
      }),
      catchError((error) => {
        console.error('Error searching articles:', error);
        return of({
          articles: [],
          totalCount: 0,
          facets: { categories: {}, tags: {}, difficulty: {} }
        });
      })
    );
  }

  searchArticlesByTag(tag: string): Observable<SearchResult> {
    return this.searchArticles(tag);
  }

  // ============================================================================
  // BOOKMARK METHODS
  // ============================================================================

  async bookmarkArticle(articleId: string, userId: string): Promise<void> {
    try {
      const response = await this.apiService.bookmarkArticle(articleId).toPromise();
      
      if (response?.success) {
        // Update local bookmarks
        const currentBookmarks = this.bookmarksSubject.value;
        if (!currentBookmarks.includes(articleId)) {
          this.bookmarksSubject.next([...currentBookmarks, articleId]);
        }
      } else {
        throw new Error(response?.message || 'Failed to bookmark article');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async removeBookmark(articleId: string, userId: string): Promise<void> {
    try {
      const response = await this.apiService.removeBookmark(articleId).toPromise();
      
      if (response?.success) {
        // Update local bookmarks
        const currentBookmarks = this.bookmarksSubject.value;
        this.bookmarksSubject.next(currentBookmarks.filter(id => id !== articleId));
      } else {
        throw new Error(response?.message || 'Failed to remove bookmark');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  getUserBookmarks(userId: string): Observable<string[]> {
    return this.bookmarksSubject.asObservable();
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  clearSearchFilters(): void {
    // This method exists for compatibility with the existing knowledge service
    // In the backend version, search state is managed by the component
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private transformArticle = (apiArticle: any): Article => {
    // Find category details from local cache
    const categories = this.categoriesSubject.value;
    const categoryData = categories.find(cat => cat.id === (apiArticle.category_id || apiArticle.category));
    
    return {
      id: apiArticle.id,
      title: apiArticle.title,
      content: this.parseArticleContent(apiArticle.content),
      summary: apiArticle.summary,
      category: categoryData || {
        id: apiArticle.category_id || apiArticle.category || 'general',
        name: apiArticle.category_name || 'General',
        description: '',
        icon: 'document',
        color: '#64748b'
      },
      tags: apiArticle.tags || [],
      author: apiArticle.author,
      publishedAt: new Date(apiArticle.published_at || apiArticle.publishedAt),
      updatedAt: new Date(apiArticle.updated_at || apiArticle.updatedAt),
      readTime: apiArticle.read_time || apiArticle.readTime || 5,
      difficulty: apiArticle.difficulty || 'beginner',
      isBookmarked: this.bookmarksSubject.value.includes(apiArticle.id),
      imageUrl: apiArticle.image_url || apiArticle.imageUrl,
      featured: apiArticle.featured || false
    };
  };

  private parseArticleContent(content: any): any {
    if (typeof content === 'string') {
      try {
        return JSON.parse(content);
      } catch (error) {
        // If parsing fails, create a simple text content structure
        return {
          sections: [
            {
              type: 'text',
              content: content
            }
          ]
        };
      }
    }
    
    return content || { sections: [] };
  }

  private getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }
    
    if (error?.error?.message) {
      return error.error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }
}