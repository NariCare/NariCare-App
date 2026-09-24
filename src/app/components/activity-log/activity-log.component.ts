import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { formatDate } from '@angular/common';
import { DateOnlyUtil } from '../../shared/utils/date-only.util';

export interface ActivityRow {
  icon: string;       // asset path
  iconAlt: string;    // entry type, read by screen readers
  at: Date;           // sort + day grouping
  time?: string;      // preformatted, e.g. "3:58 PM"
  label?: string;
  value?: string;
  barRatio?: number;  // 0..1, bar length relative to the longest/largest entry
  items?: ActivityItem[]; // one line per part of a multi-part log (e.g. direct + expressed + formula)
  onClick?: () => void;
}

export interface ActivityItem { icon: string; iconAlt: string; label: string; value?: string; barRatio?: number; time?: string; }

export interface ActivityLog { rows: ActivityRow[]; summary: string; }

/** Record day (date-only or UTC-midnight from the API) plus optional HH:MM, as a local Date. */
export function recordAt(date: any, time?: string | null): Date {
  let day: Date;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    day = DateOnlyUtil.parseLocalDate(date.slice(0, 10));
  } else {
    const d = new Date(date);
    day = d.getUTCHours() === 0 && d.getUTCMinutes() === 0
      ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
      : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  const m = /^(\d{1,2}):(\d{2})/.exec(time || '');
  if (m) day.setHours(+m[1], +m[2]);
  return day;
}

/** "58m ago" for timed rows; day-only rows get "on Sep 21" so a missing time never reads as midnight. */
export function timeAgo(at: Date, hasTime = true): string {
  if (!hasTime) return `on ${formatDate(at, 'MMM d', 'en-US')}`;
  const mins = Math.floor((Date.now() - at.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

const minutes = (n: number) => (n >= 60 ? `${Math.floor(n / 60)} hr${n % 60 ? ` ${n % 60} min` : ''}` : `${n} min`); // "8 min", "1 hr 5 min"
const sideLabel = (s: string) => (s === 'both' ? 'Both sides' : s ? `${s[0].toUpperCase()}${s.slice(1)} side` : undefined);

/** One block per feed log, one line per feed type inside it. Shared by growth + baby-detail. */
export function toFeedLog(records: any[]): ActivityLog {
  const list = records || [];
  const maxMin = Math.max(1, ...list.map(r => r.directFeedDetails?.duration || 0));
  const maxMl = Math.max(1, ...list.flatMap(r => [r.expressedMilkDetails?.quantity || 0, r.formulaDetails?.quantity || 0]));
  const rows: ActivityRow[] = [];
  let lastDirect: { at: Date; side: string } | undefined;
  for (const r of list) {
    const d = r.directFeedDetails, e = r.expressedMilkDetails?.quantity || 0, f = r.formulaDetails?.quantity || 0;
    const t12 = (t?: string) => (t ? DateOnlyUtil.to12Hour(t) : undefined);
    const items: ActivityItem[] = [];
    if (d) items.push({
      icon: 'assets/Fed directly.svg', iconAlt: 'Breastfeed', label: `Direct${d.breastSide ? `, ${sideLabel(d.breastSide)!.toLowerCase()}` : ''}`,
      value: d.duration ? minutes(d.duration) : undefined, barRatio: d.duration ? d.duration / maxMin : undefined, time: t12(d.startTime)
    });
    if (e) items.push({ icon: 'assets/Pump.svg', iconAlt: 'Expressed breast milk', label: 'Breast milk', value: `${e} mL`, barRatio: e / maxMl, time: t12(r.expressedMilkDetails?.startTime) });
    if (f) items.push({ icon: 'assets/Formula.svg', iconAlt: 'Formula', label: 'Formula', value: `${f} mL`, barRatio: f / maxMl, time: t12(r.formulaDetails?.startTime) });
    if (!items.length) continue;
    // Header shows the earliest start time in the log; the mapper sets r.time to that
    const t = r.time || [d?.startTime, r.expressedMilkDetails?.startTime, r.formulaDetails?.startTime].filter(Boolean).sort()[0];
    rows.push({
      icon: items[0].icon, iconAlt: items[0].iconAlt, at: recordAt(r.recordDate || r.date, t),
      time: t ? DateOnlyUtil.to12Hour(t) : undefined, items
    });
    if (d?.breastSide && (!lastDirect || rows[rows.length - 1].at > lastDirect.at)) lastDirect = { at: rows[rows.length - 1].at, side: d.breastSide };
  }
  rows.sort((a, b) => b.at.getTime() - a.at.getTime());
  if (!rows.length) return { rows, summary: '' };
  const side = lastDirect?.side;
  return { rows, summary: `Last feeding ${timeAgo(rows[0].at, !!rows[0].time)}${side ? ` · last side: ${side}` : ''}` };
}

@Component({
  selector: 'app-activity-log',
  templateUrl: './activity-log.component.html',
  styleUrls: ['./activity-log.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityLogComponent implements OnChanges {
  @Input() rows: ActivityRow[] = [];
  @Input() summary = '';
  @Input() collapsedCount = 5;
  @Input() showToggle = true; // off when the parent renders its own See all
  @Input() hasMore: boolean | null = false;
  @Input() loadingMore = false;
  @Input() compact = false; // one line per row (time, date, value) instead of the block card
  @Output() loadMore = new EventEmitter<void>();

  expanded = false;
  groups: { day: string; rows: ActivityRow[] }[] = [];

  ngOnChanges(): void { this.regroup(); }

  toggle(): void {
    this.expanded = !this.expanded;
    this.regroup();
  }

  older(): void {
    this.expanded = true;
    this.regroup();
    this.loadMore.emit();
  }

  get canCollapse(): boolean { return (this.rows?.length || 0) > this.collapsedCount; }

  private regroup(): void {
    const sorted = [...(this.rows || [])].sort((a, b) => b.at.getTime() - a.at.getTime());
    const visible = this.expanded ? sorted : sorted.slice(0, this.collapsedCount);
    const groups: { day: string; rows: ActivityRow[] }[] = [];
    for (const row of visible) {
      const day = this.dayLabel(row.at);
      const last = groups[groups.length - 1];
      if (last?.day === day) last.rows.push(row);
      else groups.push({ day, rows: [row] });
    }
    this.groups = groups;
  }

  private dayLabel(at: Date): string {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (DateOnlyUtil.isSameLocalDay(at, today)) return 'Today';
    if (DateOnlyUtil.isSameLocalDay(at, yesterday)) return 'Yesterday';
    return formatDate(at, at.getFullYear() === today.getFullYear() ? 'MMM d' : 'MMM d, y', 'en-US');
  }
}
