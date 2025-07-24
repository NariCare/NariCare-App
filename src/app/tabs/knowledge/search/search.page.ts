import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { KnowledgeBaseService } from '../../../services/knowledge-base.service';
import { Article, SearchResult } from '../../../models/knowledge-base.model';

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
})
export class SearchPage implements OnInit {
  searchResults$: Observable<SearchResult>;
  searchTerm = '';
  selectedTag = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private knowledgeService: KnowledgeBaseService
  ) {
    this.searchResults$ = this.knowledgeService.searchArticles();
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tag']) {
        this.selectedTag = params['tag'];
        this.searchByTag(this.selectedTag);
      } else if (params['q']) {
        this.searchTerm = params['q'];
        this.performSearch(this.searchTerm);
      }
    });
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    if (this.searchTerm.length > 2) {
      this.performSearch(this.searchTerm);
    } else if (this.searchTerm.length === 0) {
      this.searchResults$ = this.knowledgeService.searchArticles('');
    }
  }

  private performSearch(term: string) {
    this.selectedTag = '';
    this.searchResults$ = this.knowledgeService.searchArticles(term);
    this.updateUrl({ q: term });
  }

  private searchByTag(tag: string) {
    this.searchTerm = '';
    this.searchResults$ = this.knowledgeService.searchArticlesByTag(tag);
    this.updateUrl({ tag: tag });
  }

  private updateUrl(params: any) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge'
    });
  }

  onArticleSelect(article: Article) {
    this.router.navigate(['/tabs/knowledge/article', article.id]);
  }

  clearSearch() {
    this.searchTerm = '';
    this.selectedTag = '';
    this.searchResults$ = this.knowledgeService.searchArticles('');
    this.router.navigate(['/tabs/knowledge/search']);
  }

  goBack() {
    this.router.navigate(['/tabs/knowledge']);
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