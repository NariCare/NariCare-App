import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { KnowledgeBaseService } from '../../services/knowledge-base.service';
import { AuthService } from '../../services/auth.service';
import { Article, ArticleCategory } from '../../models/knowledge-base.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-knowledge',
  templateUrl: './knowledge.page.html',
  styleUrls: ['./knowledge.page.scss'],
})
export class KnowledgePage implements OnInit {
  categorizedArticles$: Observable<{ category: ArticleCategory, articles: Article[] }[]>;
  searchTerm = '';
  user: User | null = null;
  bookmarkedArticles: string[] = [];

  constructor(
    private knowledgeService: KnowledgeBaseService,
    private authService: AuthService,
    private router: Router
  ) {
    this.categorizedArticles$ = this.knowledgeService.getArticlesGroupedByCategory(5);
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        this.loadBookmarks();
      }
    });
  }

  private loadBookmarks() {
    if (this.user) {
      this.knowledgeService.getUserBookmarks(this.user.uid).subscribe(bookmarks => {
        this.bookmarkedArticles = bookmarks;
      });
    }
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    if (this.searchTerm.length > 2) {
      this.router.navigate(['/tabs/knowledge/search'], { 
        queryParams: { q: this.searchTerm } 
      });
    } else if (this.searchTerm.length === 0) {
      // Clear search when input is empty
      this.router.navigate(['/tabs/knowledge']);
    }
  }

  onSearchFocus() {
    // Navigate to search page when user focuses on search bar
    this.router.navigate(['/tabs/knowledge/search']);
  }

  onCategorySelect(categoryId: string) {
    this.router.navigate(['/tabs/knowledge/category', categoryId]);
  }

  onSeeAllCategory(categoryId: string) {
    this.router.navigate(['/tabs/knowledge/category', categoryId]);
  }

  onArticleSelect(article: Article) {
    this.router.navigate(['/tabs/knowledge/article', article.id]);
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'danger';
      default: return 'medium';
    }
  }

  formatReadTime(minutes: number): string {
    return `${minutes} min read`;
  }

  async toggleBookmark(articleId: string, event: Event) {
    event.stopPropagation();
    if (!this.user) return;

    try {
      const isCurrentlyBookmarked = this.bookmarkedArticles.includes(articleId);
      if (isCurrentlyBookmarked) {
        await this.knowledgeService.removeBookmark(articleId, this.user.uid);
        this.bookmarkedArticles = this.bookmarkedArticles.filter(id => id !== articleId);
      } else {
        await this.knowledgeService.bookmarkArticle(articleId, this.user.uid);
        this.bookmarkedArticles.push(articleId);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  }

  isBookmarked(articleId: string): boolean {
    return this.bookmarkedArticles.includes(articleId);
  }

  getRandomGradient(articleId: string): string {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)',
      'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
      'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)'
    ];
    
    // Use article ID to generate consistent random index
    let hash = 0;
    for (let i = 0; i < articleId.length; i++) {
      const char = articleId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  }
}