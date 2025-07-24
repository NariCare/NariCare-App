import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { KnowledgeBaseService } from '../../services/knowledge-base.service';
import { Article, ArticleCategory } from '../../models/knowledge-base.model';

@Component({
  selector: 'app-knowledge',
  templateUrl: './knowledge.page.html',
  styleUrls: ['./knowledge.page.scss'],
})
export class KnowledgePage implements OnInit {
  categories$: Observable<ArticleCategory[]>;
  featuredArticles$: Observable<Article[]>;
  recentArticles$: Observable<Article[]>;
  searchTerm = '';

  constructor(
    private knowledgeService: KnowledgeBaseService,
    private router: Router
  ) {
    this.categories$ = this.knowledgeService.getCategories();
    this.featuredArticles$ = this.knowledgeService.getFeaturedArticles();
    this.recentArticles$ = this.knowledgeService.getRecentArticles();
  }

  ngOnInit() {}

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    if (this.searchTerm.length > 2) {
      this.knowledgeService.searchArticles(this.searchTerm);
    }
  }

  onCategorySelect(categoryId: string) {
    // Navigate to category view or filter articles
    this.knowledgeService.searchArticles('', categoryId);
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
}