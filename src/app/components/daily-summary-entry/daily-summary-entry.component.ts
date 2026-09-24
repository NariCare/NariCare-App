import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DailySummaryDay, plural } from '../../models/daily-summary.model';

@Component({
  selector: 'app-daily-summary-entry',
  templateUrl: './daily-summary-entry.component.html',
  styleUrls: ['./daily-summary-entry.component.scss']
})
export class DailySummaryEntryComponent {
  @Input() day: DailySummaryDay | null = null;
  @Input() loading = false;
  @Input() error = false;
  @Output() open = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  get line(): string {
    if (this.error) return "Couldn't load summary. Tap to retry.";
    const d = this.day;
    if (!d?.hasData) return 'Nothing logged yet today';
    return [plural(d.feeding.directSessions, 'direct feed'), plural(d.pumping.sessions, 'pump'), `${d.diapers.pee} pee`].join(' · ');
  }

  get aria(): string {
    return this.error ? "Daily Summary. Couldn't load summary. Tap to retry." : `Daily Summary, today so far: ${this.line}. Open Daily Summary`;
  }

  onTap(): void { this.error ? this.retry.emit() : this.open.emit(); }
}
