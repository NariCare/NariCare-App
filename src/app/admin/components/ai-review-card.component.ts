import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { AdminApiService } from '../admin-api.service';
import { AI_CATEGORIES, AiPair, AiReviewUpdate, CHECK_PASS_SCORE, categoryLabel, flagLabel, fmtWhen, isFlagged } from '../admin.models';

let uid = 0;

@Component({
  selector: 'app-ai-review-card',
  templateUrl: './ai-review-card.component.html',
  styleUrls: ['./ai-review-card.component.scss']
})
export class AiReviewCardComponent implements OnChanges {
  @Input() pair!: AiPair;
  @Input() showMother = true;
  @Output() reviewed = new EventEmitter<{ before: string; wasFlagged: boolean; pair: AiPair }>();

  readonly id = `airc-${++uid}`;
  readonly categories = AI_CATEGORIES;
  readonly categoryLabel = categoryLabel;
  readonly flagLabel = flagLabel;
  readonly passScore = CHECK_PASS_SCORE;
  category = '';
  correcting = false;
  corrected = '';
  notes = '';
  saving = false;
  error = '';

  constructor(private api: AdminApiService) {}

  get status(): string { return this.pair.review?.status || 'pending'; }
  get askedAt(): string { return fmtWhen(this.pair.askedAt, 'd MMM y, h:mm a'); }
  get checkFlagged(): boolean { const c = this.pair.check; return !!c && (c.flags.length > 0 || c.score < CHECK_PASS_SCORE || c.risk !== 'low'); }
  get isCrisis(): boolean { return !!this.pair.check?.flags.includes('crisis'); }
  get riskLabel(): string { const r = this.pair.check?.risk || 'low'; return r.charAt(0).toUpperCase() + r.slice(1) + ' risk'; }

  get validatedAt(): string { return fmtWhen(this.pair.review?.validatedAt, 'd MMM y, h:mm a'); }

  ngOnChanges(): void {
    this.category = this.pair.category || '';
    this.corrected = this.pair.review?.correctedAnswer || this.pair.answer || '';
    this.notes = this.pair.review?.notes || '';
  }

  startCorrect(): void { this.correcting = true; this.error = ''; }

  cancel(): void { this.correcting = false; this.ngOnChanges(); }

  submit(status: AiReviewUpdate['status']): void {
    if (!this.pair.answerId || this.saving) return;
    if (status === 'corrected' && !this.corrected.trim()) { this.error = 'Write the corrected answer before saving.'; return; }
    const body: AiReviewUpdate = { status };
    if (this.category) body.category = this.category;
    if (status === 'corrected') body.correctedAnswer = this.corrected.trim();
    if (this.notes.trim()) body.notes = this.notes.trim();
    const before = this.status;
    const wasFlagged = isFlagged(this.pair);
    this.saving = true;
    this.error = '';
    this.api.review(this.pair.answerId, body).subscribe({
      next: pair => {
        this.saving = false;
        this.correcting = false;
        this.pair = { ...this.pair, ...pair };
        this.ngOnChanges();
        this.reviewed.emit({ before, wasFlagged, pair: this.pair });
      },
      error: () => { this.saving = false; this.error = "Couldn't save the review. Try again."; }
    });
  }
}
