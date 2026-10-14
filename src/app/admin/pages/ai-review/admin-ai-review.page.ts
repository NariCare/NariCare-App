import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AdminApiService } from '../../admin-api.service';
import { AI_CATEGORIES, AI_FLAGS, AiPair, REVIEW_STATUSES, ReviewTab, categoryLabel } from '../../admin.models';

@Component({
  selector: 'app-admin-ai-review',
  templateUrl: './admin-ai-review.page.html',
  styleUrls: ['./admin-ai-review.page.scss']
})
export class AdminAiReviewPage implements OnInit, OnDestroy {
  readonly tabs: ReviewTab[] = ['flagged', ...REVIEW_STATUSES];
  readonly flags = AI_FLAGS;
  readonly categories = AI_CATEGORIES;
  readonly categoryLabel = categoryLabel;
  status: ReviewTab = 'flagged';
  category = '';
  flag = '';
  page = 1;
  total = 0;
  limit = 20;
  counts: Partial<Record<ReviewTab, number>> | null = null;
  items: AiPair[] = [];
  loading = true;
  error = false;
  private load$ = new Subject<void>();
  private sub?: Subscription;

  constructor(private api: AdminApiService) {}

  get pages(): number { return Math.max(1, Math.ceil(this.total / this.limit)); }

  ngOnInit(): void {
    this.sub = this.load$.pipe(
      switchMap(() => {
        this.loading = true;
        this.error = false;
        return this.api.aiReviews(this.status, this.category || null, this.flag || null, this.page, this.limit).pipe(catchError(() => of(null)));
      })
    ).subscribe(r => {
      this.loading = false;
      if (!r) { this.error = true; return; }
      this.items = r.items;
      this.total = r.total;
      this.counts = r.counts;
      this.limit = r.limit || this.limit;
    });
    this.load$.next();
  }

  setStatus(s: ReviewTab): void { this.status = s; this.page = 1; this.items = []; this.load$.next(); }
  setCategory(): void { this.page = 1; this.items = []; this.load$.next(); }
  toggleFlag(f: string): void { this.flag = this.flag === f ? '' : f; this.setCategory(); }
  go(p: number): void { this.page = p; this.load$.next(); }
  retry(): void { this.load$.next(); }

  // Keep the card in place so the reviewer sees the result; only the tab counts move
  onReviewed(e: { before: string; wasFlagged: boolean; pair: AiPair }): void {
    const after = e.pair.review?.status;
    if (!this.counts || !after || after === e.before) return;
    const c: Record<string, number> = { ...this.counts } as any;
    const bump = (k: string, n: number) => { if (c[k] != null) c[k] = Math.max(0, c[k] + n); };
    bump(e.before, -1);
    bump(after, 1);
    if (e.wasFlagged) bump('flagged', -1); // reviewed answers leave the flagged queue
    this.counts = c;
  }

  trackBy = (_: number, p: AiPair) => p.questionId;

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
