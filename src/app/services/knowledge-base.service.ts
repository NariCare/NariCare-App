import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Article, ArticleCategory, SearchResult, SearchFacets } from '../models/knowledge-base.model';

@Injectable({
  providedIn: 'root'
})
export class KnowledgeBaseService {
  private searchTermSubject = new BehaviorSubject<string>('');
  private selectedCategorySubject = new BehaviorSubject<string>('');
  private selectedDifficultySubject = new BehaviorSubject<string>('');
  
  private knowledgeData: any = null;

  constructor(private http: HttpClient) {
    this.loadKnowledgeData();
  }

  private async loadKnowledgeData() {
    try {
      this.knowledgeData = await this.http.get('/assets/data/knowledge-base.json').toPromise();
    } catch (error) {
      console.error('Failed to load knowledge base data:', error);
      this.knowledgeData = { categories: [], articles: [] };
    }
  }

  private ensureDataLoaded(): Observable<any> {
    if (this.knowledgeData) {
      return of(this.knowledgeData);
    }
    return this.http.get('/assets/data/knowledge-base.json').pipe(
      map(data => {
        this.knowledgeData = data;
        return data;
      }),
      catchError(error => {
        console.error('Failed to load knowledge base data:', error);
        return of({ categories: [], articles: [] });
      })
    );
  }

  getCategories(): Observable<ArticleCategory[]> {
    return this.ensureDataLoaded().pipe(
      map(data => data.categories || [])
    );
  }

  getFeaturedArticles(limit: number = 5): Observable<Article[]> {
    return this.ensureDataLoaded().pipe(
      map(data => {
        const articles = data.articles || [];
        return articles
          .filter((article: Article) => article.featured)
          .slice(0, limit)
          .map((article: any) => this.transformArticle(article));
      })
    );
  }

  getRecentArticles(limit: number = 10): Observable<Article[]> {
    return this.ensureDataLoaded().pipe(
      map(data => {
        const articles = data.articles || [];
        return articles
          .sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
          .slice(0, limit)
          .map((article: any) => this.transformArticle(article));
      })
    );
  }

  getArticlesByCategory(categoryId: string): Observable<Article[]> {
    return this.ensureDataLoaded().pipe(
      map(data => {
        const articles = data.articles || [];
        return articles
          .filter((article: any) => article.category === categoryId)
          .map((article: any) => this.transformArticle(article));
      })
    );
  }

  getArticle(id: string): Observable<Article | undefined> {
    return this.ensureDataLoaded().pipe(
      map(data => {
        const articles = data.articles || [];
        const article = articles.find((a: any) => a.id === id);
        return article ? this.transformArticle(article) : undefined;
      })
    );
  }

  searchArticles(searchTerm?: string, categoryId?: string, difficulty?: string): Observable<SearchResult> {
    if (searchTerm !== undefined) this.searchTermSubject.next(searchTerm);
    if (categoryId !== undefined) this.selectedCategorySubject.next(categoryId);
    if (difficulty !== undefined) this.selectedDifficultySubject.next(difficulty);

    return combineLatest([
      this.searchTermSubject,
      this.selectedCategorySubject,
      this.selectedDifficultySubject,
      this.ensureDataLoaded()
    ]).pipe(
      map(([term, category, diff, data]) => {
        let articles = data.articles || [];
        
        // Apply category filter
        if (category) {
          articles = articles.filter((article: any) => article.category === category);
        }
        
        // Apply difficulty filter
        if (diff) {
          articles = articles.filter((article: any) => article.difficulty === diff);
        }
        
        // Apply search term filter
        if (term) {
          const searchLower = term.toLowerCase();
          articles = articles.filter((article: any) => 
            article.title.toLowerCase().includes(searchLower) ||
            article.summary.toLowerCase().includes(searchLower) ||
            article.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
          );
        }

        // Transform articles
        const transformedArticles = articles.map((article: any) => this.transformArticle(article));
        
        // Generate facets
        const facets = this.generateFacets(data.articles || []);

        return {
          articles: transformedArticles,
          totalCount: transformedArticles.length,
          facets
        } as SearchResult;
      })
    );
  }

  private transformArticle(article: any): Article {
    // Find category details
    const categoryData = this.knowledgeData?.categories?.find((cat: any) => cat.id === article.category);
    
    return {
      ...article,
      publishedAt: new Date(article.publishedAt),
      updatedAt: new Date(article.updatedAt),
      category: categoryData || { 
        id: article.category, 
        name: article.category, 
        description: '', 
        icon: 'document', 
        color: '#64748b' 
      }
    };
  }

  private generateFacets(articles: any[]): SearchFacets {
    const categories: { [key: string]: number } = {};
    const tags: { [key: string]: number } = {};
    const difficulty: { [key: string]: number } = {};

    articles.forEach(article => {
      // Count categories
      const categoryData = this.knowledgeData?.categories?.find((cat: any) => cat.id === article.category);
      const categoryName = categoryData?.name || article.category;
      categories[categoryName] = (categories[categoryName] || 0) + 1;

      // Count tags
      article.tags.forEach((tag: string) => {
        tags[tag] = (tags[tag] || 0) + 1;
      });

      // Count difficulty levels
      difficulty[article.difficulty] = (difficulty[article.difficulty] || 0) + 1;
    });

    return { categories, tags, difficulty };
  }

  bookmarkArticle(articleId: string, userId: string): Promise<void> {
    // Mock implementation - in real app would save to backend
    console.log('Bookmarking article:', articleId, 'for user:', userId);
    return Promise.resolve();
  }

  removeBookmark(articleId: string, userId: string): Promise<void> {
    // Mock implementation - in real app would remove from backend
    console.log('Removing bookmark:', articleId, 'for user:', userId);
    return Promise.resolve();
  }

  getUserBookmarks(userId: string): Observable<string[]> {
    // Mock implementation - in real app would fetch from backend
    return of([]);
  }

  clearSearchFilters(): void {
    this.searchTermSubject.next('');
    this.selectedCategorySubject.next('');
    this.selectedDifficultySubject.next('');
  }
}