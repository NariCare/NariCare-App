import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminApiService } from '../../../admin-api.service';
import { BabyDetail, EventItem, fmtWhen } from '../../../admin.models';
import { eventIcon } from './record-meta';

@Component({
  selector: 'app-events-tab',
  styleUrls: ['./tabs.scss'],
  template: `
    <section class="adm-card">
      <div class="adm-card-head">
        <h2>Event Logs</h2>
        <span class="adm-badge grey">From saved records</span>
        <p class="sub">Built from records that still exist. Deleted or edited entries do not appear.</p>
      </div>
      <p class="adm-empty" *ngIf="!items.length && loading" role="status">Loading...</p>
      <p class="adm-empty" *ngIf="!items.length && !loading && !error">Nothing saved yet.</p>
      <ul class="adm-list" *ngIf="items.length">
        <li *ngFor="let e of items">
          <span class="ic" [ngClass]="icon(e.type).tone"><ion-icon [name]="icon(e.type).icon" aria-hidden="true"></ion-icon></span>
          <div class="grow">
            <div>{{ e.title }}<span class="adm-muted" *ngIf="babyName(e.babyId) as n"> · {{ n }}</span></div>
            <div class="when">{{ fmtWhen(e.at, 'd MMM y, h:mm a') }}</div>
          </div>
          <span class="val adm-muted">{{ e.detail || '' }}</span>
        </li>
      </ul>
      <div class="adm-error" *ngIf="error" role="alert"><span>Couldn't load events.</span><button type="button" class="adm-btn ghost sm" (click)="more()">Try again</button></div>
      <div class="ev-more" *ngIf="next && !error">
        <button type="button" class="adm-btn ghost" (click)="more()" [disabled]="loading">{{ loading ? 'Loading...' : 'Load more' }}</button>
      </div>
    </section>
  `,
  styles: ['.ev-more { display: flex; justify-content: center; margin-top: 12px; }']
})
export class EventsTabComponent implements OnChanges, OnDestroy {
  @Input() userId!: string;
  @Input() babies: BabyDetail[] = [];
  readonly fmtWhen = fmtWhen;
  readonly icon = eventIcon;
  items: EventItem[] = [];
  next: string | null = null;
  loading = false;
  error = false;
  private sub?: Subscription;
  private loadedId = '';

  constructor(private api: AdminApiService) {}

  ngOnChanges(): void {
    if (!this.userId || this.userId === this.loadedId) return;
    this.loadedId = this.userId;
    this.items = [];
    this.next = null;
    this.fetch(null);
  }

  more(): void { this.fetch(this.next); }

  babyName(id: string | null): string { return (id && this.babies.length > 1 && this.babies.find(b => b.id === id)?.name) || ''; }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private fetch(before: string | null): void {
    this.loading = true;
    this.error = false;
    this.sub?.unsubscribe();
    this.sub = this.api.events(this.userId, before).pipe(catchError(() => of(null))).subscribe(r => {
      this.loading = false;
      if (!r) { this.error = true; return; }
      this.items = [...this.items, ...r.items];
      this.next = r.nextBefore;
    });
  }
}
