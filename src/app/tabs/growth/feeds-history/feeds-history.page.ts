import { Component, OnDestroy, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BackendGrowthService } from '../../../services/backend-growth.service';
import { RecordActionsService } from '../../../services/record-actions.service';
import { DateOnlyUtil } from '../../../shared/utils/date-only.util';
import { recordAt } from '../../../components/activity-log/activity-log.component';
import { DayGroup, fmtMinutes, groupByDay, sideLabel, whenLabel } from './history.util';

type FeedKind = 'direct' | 'expressed' | 'formula';
type FeedFilter = 'all' | FeedKind;

interface FeedRow {
  key: string;
  kind: FeedKind;
  icon: string;
  at: Date;
  hasTime: boolean;
  time: string;
  label: string;
  valueIcon: string;
  value: string;
  aria: string;
  record: any;
}

@Component({
  selector: 'app-feeds-history',
  templateUrl: './feeds-history.page.html',
  styleUrls: ['./history-page.scss']
})
export class FeedsHistoryPage implements OnInit, OnDestroy {
  babyId = '';
  readonly today = DateOnlyUtil.formatLocalDate();
  readonly filters: { value: FeedFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'direct', label: 'Direct' },
    { value: 'expressed', label: 'Breast milk' },
    { value: 'formula', label: 'Formula' }
  ];

  filter: FeedFilter = 'all';
  selectedDate: string | null = null; // local YYYY-MM-DD
  pendingDate: string = this.today;
  dateSheetOpen = false;

  loading = true;
  loadingMore = false;
  hasMore = false;
  groups: DayGroup<FeedRow>[] = [];
  stats = { count: 0, duration: '0m', intake: '0 mL', last: '--', lastSub: 'No feeds yet' };

  private rows: FeedRow[] = [];
  private sub = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private growthService: BackendGrowthService,
    private recordActions: RecordActionsService
  ) {}

  ngOnInit(): void {
    this.babyId = this.route.snapshot.paramMap.get('babyId') || '';
    if (!this.babyId) { this.router.navigate(['/tabs/growth']); return; }
    this.sub.add(this.growthService.getFeedRecords(this.babyId).subscribe(records => {
      this.rows = this.toRows(records);
      this.loading = false;
      this.regroup();
    }));
    this.sub.add(this.growthService.hasMore$('feed', this.babyId).subscribe(v => (this.hasMore = v)));
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

  /** Header count in logs, matching Total Feeds (a log can show up to 3 rows). */
  dayMeta(g: DayGroup<FeedRow>): string {
    const n = new Set(g.rows.map(r => r.record.id)).size;
    return `${n} ${n === 1 ? 'feed' : 'feeds'}`;
  }

  get isFiltered(): boolean { return this.filter !== 'all' || !!this.selectedDate; }

  setFilter(f: FeedFilter): void { this.filter = f; this.regroup(); }

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
    try { await this.growthService.loadMore('feed', this.babyId); } finally { this.loadingMore = false; }
  }

  async onRowTap(row: FeedRow): Promise<void> {
    await this.recordActions.openFeedActions(row.record, this.babyId, row.kind);
  }

  trackGroup(_: number, g: DayGroup<FeedRow>): string { return g.key; }
  trackRow(_: number, r: FeedRow): string { return r.key; }

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
      (this.filter === 'all' || r.kind === this.filter) &&
      (!this.selectedDate || DateOnlyUtil.formatLocalDate(r.at) === this.selectedDate));
    this.groups = groupByDay(rows);
    this.stats = this.computeStats();
  }

  // One row per feed type line in a log, each with its own start time.
  private toRows(records: any[]): FeedRow[] {
    const rows: FeedRow[] = [];
    for (const r of records || []) {
      const day = r.recordDate || r.date;
      const d = r.directFeedDetails, e = r.expressedMilkDetails, f = r.formulaDetails;
      const add = (kind: FeedKind, start: string | undefined, icon: string, label: string, valueIcon: string, value: string) => {
        const at = recordAt(day, start || r.time);
        const hasTime = !!(start || r.time);
        const time = hasTime ? DateOnlyUtil.to12Hour(start || r.time) : 'Time not set';
        rows.push({ key: `${r.id}:${kind}`, kind, icon, at, hasTime, time, label, valueIcon, value, record: r,
          aria: `${label}, ${time}, ${value}. Open actions` });
      };
      if (d) {
        const side = d.breastSide === 'both' ? 'both sides' : d.breastSide ? `${d.breastSide} side` : '';
        add('direct', d.startTime, 'assets/Fed directly.svg', side ? `Direct, ${side}` : 'Direct', 'time-outline', d.duration ? fmtMinutes(d.duration) : '--');
      }
      if (e?.quantity) add('expressed', e.startTime, 'assets/Pump.svg', 'Breast milk', 'water-outline', `${e.quantity} mL`);
      if (f?.quantity) add('formula', f.startTime, 'assets/Formula.svg', 'Formula', 'water-outline', `${f.quantity} mL`);
    }
    return rows.sort((a, b) => b.at.getTime() - a.at.getTime());
  }

  // Stats reflect the active type filter and date (default today), same rows the list shows.
  private computeStats(): FeedsHistoryPage['stats'] {
    const day = this.selectedDate || this.today;
    const typed = this.rows.filter(r => this.filter === 'all' || r.kind === this.filter);
    const onDay = typed.filter(r => DateOnlyUtil.formatLocalDate(r.at) === day);
    const minutes = onDay.filter(r => r.kind === 'direct').reduce((s, r) => s + (Number(r.record.directFeedDetails?.duration) || 0), 0);
    const ml = onDay.reduce((s, r) => s + (r.kind === 'expressed' ? Number(r.record.expressedMilkDetails?.quantity) || 0
      : r.kind === 'formula' ? Number(r.record.formulaDetails?.quantity) || 0 : 0), 0);
    const last = typed[0];
    const side = last?.kind === 'direct' ? last.record.directFeedDetails?.breastSide : undefined;
    return {
      count: new Set(onDay.map(r => r.record.id)).size,
      duration: fmtMinutes(minutes),
      intake: `${ml} mL`,
      last: !last ? '--' : side ? sideLabel(side) : last.label,
      lastSub: last ? whenLabel(last.at, last.hasTime) : 'No feeds yet'
    };
  }
}
