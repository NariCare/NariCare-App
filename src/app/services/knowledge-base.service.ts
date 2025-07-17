import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Article, ArticleCategory, SearchResult, SearchFacets } from '../models/knowledge-base.model';

@Injectable({
  providedIn: 'root'
})
export class KnowledgeBaseService {
  private searchTermSubject = new BehaviorSubject<string>('');
  private selectedCategorySubject = new BehaviorSubject<string>('');
  private selectedDifficultySubject = new BehaviorSubject<string>('');

  constructor(private firestore: AngularFirestore) {}

  getCategories(): Observable<ArticleCategory[]> {
    return this.firestore.collection<ArticleCategory>('article-categories', ref => 
      ref.orderBy('name')
    ).valueChanges({ idField: 'id' });
  }

  getFeaturedArticles(limit: number = 5): Observable<Article[]> {
    return this.firestore.collection<Article>('articles', ref => 
      ref.where('featured', '==', true)
         .orderBy('publishedAt', 'desc')
         .limit(limit)
    ).valueChanges({ idField: 'id' });
  }

  getRecentArticles(limit: number = 10): Observable<Article[]> {
    return this.firestore.collection<Article>('articles', ref => 
      ref.orderBy('publishedAt', 'desc').limit(limit)
    ).valueChanges({ idField: 'id' });
  }

  getArticlesByCategory(categoryId: string): Observable<Article[]> {
    return this.firestore.collection<Article>('articles', ref => 
      ref.where('category.id', '==', categoryId)
         .orderBy('publishedAt', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  getArticle(id: string): Observable<Article | undefined> {
    return this.firestore.doc<Article>(`articles/${id}`).valueChanges({ idField: 'id' });
  }

  searchArticles(searchTerm?: string, categoryId?: string, difficulty?: string): Observable<SearchResult> {
    if (searchTerm) this.searchTermSubject.next(searchTerm);
    if (categoryId) this.selectedCategorySubject.next(categoryId);
    if (difficulty) this.selectedDifficultySubject.next(difficulty);

    return combineLatest([
      this.searchTermSubject,
      this.selectedCategorySubject,
      this.selectedDifficultySubject
    ]).pipe(
      switchMap(([term, category, diff]) => {
        let query = this.firestore.collection<Article>('articles', ref => {
          let q = ref.orderBy('publishedAt', 'desc');
          
          if (category) {
            q = q.where('category.id', '==', category);
          }
          
          if (diff) {
            q = q.where('difficulty', '==', diff);
          }
          
          return q;
        });

        return query.valueChanges({ idField: 'id' });
      }),
      map(articles => {
        const searchTerm = this.searchTermSubject.value.toLowerCase();
        
        // Filter articles by search term if provided
        const filteredArticles = searchTerm ? 
          articles.filter(article => 
            article.title.toLowerCase().includes(searchTerm) ||
            article.content.toLowerCase().includes(searchTerm) ||
            article.tags.some(tag => tag.toLowerCase().includes(searchTerm))
          ) : articles;

        // Generate facets
        const facets = this.generateFacets(articles);

        return {
          articles: filteredArticles,
          totalCount: filteredArticles.length,
          facets
        } as SearchResult;
      })
    );
  }

  private generateFacets(articles: Article[]): SearchFacets {
    const categories: { [key: string]: number } = {};
    const tags: { [key: string]: number } = {};
    const difficulty: { [key: string]: number } = {};

    articles.forEach(article => {
      // Count categories
      const categoryName = article.category.name;
      categories[categoryName] = (categories[categoryName] || 0) + 1;

      // Count tags
      article.tags.forEach(tag => {
        tags[tag] = (tags[tag] || 0) + 1;
      });

      // Count difficulty levels
      difficulty[article.difficulty] = (difficulty[article.difficulty] || 0) + 1;
    });

    return { categories, tags, difficulty };
  }

  bookmarkArticle(articleId: string, userId: string): Promise<void> {
    return this.firestore.doc(`users/${userId}/bookmarks/${articleId}`).set({
      articleId,
      bookmarkedAt: new Date()
    });
  }

  removeBookmark(articleId: string, userId: string): Promise<void> {
    return this.firestore.doc(`users/${userId}/bookmarks/${articleId}`).delete();
  }

  getUserBookmarks(userId: string): Observable<string[]> {
    return this.firestore.collection(`users/${userId}/bookmarks`)
      .valueChanges({ idField: 'articleId' })
      .pipe(
        map(bookmarks => bookmarks.map(b => (b as any).articleId))
      );
  }

  clearSearchFilters(): void {
    this.searchTermSubject.next('');
    this.selectedCategorySubject.next('');
    this.selectedDifficultySubject.next('');
  }
}