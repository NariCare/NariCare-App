import { Component, OnInit } from '@angular/core';
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

  constructor(private knowledgeService: KnowledgeBaseService) {
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
    // Navigate to article detail
    console.log('Selected article:', article);
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