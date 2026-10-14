import { Component, OnDestroy, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BackendPumpingService, PumpingRecord } from '../../../services/backend-pumping.service';
import { RecordActionsService } from '../../../services/record-actions.service';
import { DateOnlyUtil } from '../../../shared/utils/date-only.util';
import { recordAt } from '../../../components/activity-log/activity-log.component';
import { DayGroup, fmtMinutes, groupByDay, sideLabel, whenLabel } from '../feeds-history/history.util';

type PumpFilter = 'all' | 'both' | 'left' | 'right';

interface PumpRow {
  key: string;
  side: string;
  at: Date;
  hasTime: boolean;
  time: string;
  label: string;
  ml: number;
  duration: string;
  aria: string;
  record: PumpingRecord;
}

interface PumpGroup extends DayGroup<PumpRow> { meta: string; }

@Component({
  selector: 'app-pumping-history',
  templateUrl: './pumping-history.page.html',
  styleUrls: ['../feeds-history/history-page.scss']
})
export class PumpingHistoryPage implements OnInit, OnDestroy {
  babyId = '';
  readonly today = DateOnlyUtil.formatLocalDate();
  readonly filters: { value: PumpFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'both', label: 'Both sides' },
    { value: 'left', label: 'Left only' },
    { value: 'right', label: 'Right only' }
  ];

  filter: PumpFilter = 'all';
  selectedDate: string | null = null; // local YYYY-MM-DD
  pendingDate: string = this.today;
  dateSheetOpen = false;

  loading = true;
  loadingMore = false;
  hasMore = false;
  groups: PumpGroup[] = [];
  stats = { count: 0, duration: '0m', output: '0 mL', last: '--', lastSub: 'No sessions yet' };

  private rows: PumpRow[] = [];
  private sub = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pumpingService: BackendPumpingService,
    private recordActions: RecordActionsService
  ) {}

  ngOnInit(): void {
    this.babyId = this.route.snapshot.paramMap.get('babyId') || '';
    if (!this.babyId) { this.router.navigate(['/tabs/growth']); return; }
    this.sub.add(this.pumpingService.history$(this.babyId).subscribe(records => {
      this.rows = this.toRows(records);
      this.loading = false;
      this.regroup();
    }));
    this.sub.add(this.pumpingService.historyHasMore$(this.babyId).subscribe(v => (this.hasMore = v)));
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get selectedDateLabel(): string {
    return this.selectedDate ? formatDate(DateOnlyUtil.parseLocalDate(this.selectedDate), 'd MMM y', 'en-US') : 'Select date';
  }

  /** Stats follow the picked date; default is today. */
  get statsDayLabel(): string {
    const day = this.selectedDate || this.today;
    return day === this.today ? 'Today' : formatDate(DateOnlyUtil.parseLocalDate(day), 'd MMM', 'en-US');
  }

  get isFiltered(): boolean { return this.filter !== 'all' || !!this.selectedDate; }

  setFilter(f: PumpFilter): void { this.filter = f; this.regroup(); }

  openDateSheet(): void { this.pendingDate = this.selectedDate || this.today; this.dateSheetOpen = true; }

  onDatePicked(ev: any): void {
    const v = ev?.detail?.value;
    if (typeof v === 'string') this.pendingDate = v.slice(0, 10);
  }

  async applyDate(): Promise<void> {
    this.dateSheetOpen = false;
    this.selectedDate = this.pendingDate;
    this.regroup();
    await this.loadThrough(this.selectedDate);
  }

  clearDate(): void { this.dateSheetOpen = false; this.selectedDate = null; this.regroup(); }

  clearFilters(): void { this.filter = 'all'; this.clearDate(); }

  async loadOlder(): Promise<void> {
    if (this.loadingMore || !this.hasMore) return;
    this.loadingMore = true;
    try { await this.pumpingService.loadMoreHistory(this.babyId); } finally { this.loadingMore = false; }
  }

  async onRowTap(row: PumpRow): Promise<void> {
    await this.recordActions.openPumpActions(row.record, this.babyId);
  }

  trackGroup(_: number, g: PumpGroup): string { return g.key; }
  trackRow(_: number, r: PumpRow): string { return r.key; }

  // Page back until the picked day is covered, so an old date is not falsely empty.
  private async loadThrough(day: string): Promise<void> {
    for (let i = 0; i < 20 && this.hasMore; i++) {
      const oldest = this.rows[this.rows.length - 1];
      if (oldest && DateOnlyUtil.formatLocalDate(oldest.at) < day) return;
      await this.loadOlder();
    }
  }

  private regroup(): void {
    const rows = this.rows.filter(r =>
      (this.filter === 'all' || r.side === this.filter) &&
      (!this.selectedDate || DateOnlyUtil.formatLocalDate(r.at) === this.selectedDate));
    this.groups = groupByDay(rows).map(g => {
      const ml = g.rows.reduce((s, r) => s + r.ml, 0);
      return { ...g, meta: `${g.rows.length} ${g.rows.length === 1 ? 'session' : 'sessions'} · ${ml} mL` };
    });
    this.stats = this.computeStats();
  }

  private toRows(records: PumpingRecord[]): PumpRow[] {
    return (records || []).map(r => {
      const hasTime = !!r.record_time;
      const at = recordAt(r.record_date, r.record_time);
      const time = hasTime ? DateOnlyUtil.to12Hour(r.record_time) : 'Time not set';
      const ml = Math.round(Number(r.total_output) || 0);
      const mins = Number(r.duration_minutes) || 0;
      const duration = mins ? fmtMinutes(mins) : '--';
      const label = sideLabel(r.pumping_side);
      return {
        key: r.id, side: r.pumping_side, at, hasTime, time, label, ml, duration, record: r,
        aria: `${label}, ${time}, ${ml} mL${mins ? `, ${duration}` : ''}. Open actions`
      };
    }).sort((a, b) => b.at.getTime() - a.at.getTime());
  }

  private computeStats(): PumpingHistoryPage['stats'] {
    // Stats reflect the active side filter and date (default today), same rows the list shows.
    const day = this.selectedDate || this.today;
    const sided = this.rows.filter(r => this.filter === 'all' || r.side === this.filter);
    const todays = sided.filter(r => DateOnlyUtil.formatLocalDate(r.at) === day);
    const minutes = todays.reduce((s, r) => s + (Number(r.record.duration_minutes) || 0), 0);
    const last = sided[0];
    return {
      count: todays.length,
      duration: fmtMinutes(minutes),
      output: `${todays.reduce((s, r) => s + r.ml, 0)} mL`,
      last: last ? last.label : '--',
      lastSub: last ? whenLabel(last.at, last.hasTime) : 'No sessions yet'
    };
  }
}
