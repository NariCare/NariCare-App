import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminApiService } from '../../../admin-api.service';
import { AiPair } from '../../../admin.models';

@Component({
  selector: 'app-ai-tab',
  styleUrls: ['./tabs.scss'],
  template: `
    <div class="adm-stack">
      <div class="adm-card-head ai-head">
        <h2>AI Conversations <small>({{ total }})</small></h2>
        <p class="sub">Ask NariCare AI questions, newest first</p>
      </div>
      <div class="adm-error" *ngIf="error" role="alert"><span>Couldn't load AI conversations.</span><button type="button" class="adm-btn ghost sm" (click)="load(page)">Try again</button></div>
      <p class="adm-card adm-empty" *ngIf="loading" role="status">Loading...</p>
      <p class="adm-card adm-empty" *ngIf="!loading && !error && !items.length">No AI questions yet.</p>
      <app-ai-review-card *ngFor="let p of items; trackBy: trackBy" [pair]="p" [showMother]="false"></app-ai-review-card>
      <nav class="adm-pager" *ngIf="total > limit" aria-label="Pages">
        <span class="adm-muted">Page {{ page }} of {{ pages }}</span>
        <span class="ai-pages">
          <button type="button" class="adm-btn ghost sm" (click)="load(page - 1)" [disabled]="page <= 1 || loading">Previous</button>
          <button type="button" class="adm-btn ghost sm" (click)="load(page + 1)" [disabled]="page >= pages || loading">Next</button>
        </span>
      </nav>
    </div>
  `,
  styles: ['.ai-head { margin-bottom: 0; } .ai-pages { display: flex; gap: 8px; }']
})
export class AiTabComponent implements OnChanges, OnDestroy {
  @Input() userId!: string;
  items: AiPair[] = [];
  page = 1;
  limit = 20;
  total = 0;
  loading = true;
  error = false;
  private sub?: Subscription;
  private loadedId = '';

  constructor(private api: AdminApiService) {}

  get pages(): number { return Math.max(1, Math.ceil(this.total / this.limit)); }

  ngOnChanges(): void { if (this.userId && this.userId !== this.loadedId) this.load(1); }

  load(page: number): void {
    this.loadedId = this.userId;
    this.page = page;
    this.loading = true;
    this.error = false;
    this.sub?.unsubscribe();
    this.sub = this.api.aiConversations(this.userId, page, this.limit).pipe(catchError(() => of(null))).subscribe(r => {
      this.loading = false;
      if (!r) { this.error = true; return; }
      this.items = r.items;
      this.total = r.total;
    });
  }

  trackBy = (_: number, p: AiPair) => p.questionId;

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
