import { formatDate } from '@angular/common';
import { DateOnlyUtil } from '../../../shared/utils/date-only.util';

/** Shared helpers for the Feeds and Pumping See-all pages. */
export interface DayGroup<T> { key: string; label: string; rows: T[]; }

export const fmtMinutes = (n: number): string => (n >= 60 ? `${Math.floor(n / 60)} hr${n % 60 ? ` ${n % 60} min` : ''}` : `${n} min`); // "8 min", "1 hr 5 min"

export const sideLabel = (s: string | null | undefined): string =>
  s === 'both' ? 'Both sides' : s ? `${s[0].toUpperCase()}${s.slice(1)} side` : 'Session';

/** "Today · 23 Sep 2026", "Yesterday · 22 Sep 2026", "Mon · 21 Sep 2026". */
export function dayHeading(at: Date): string {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const name = DateOnlyUtil.isSameLocalDay(at, today) ? 'Today'
    : DateOnlyUtil.isSameLocalDay(at, yesterday) ? 'Yesterday'
    : formatDate(at, 'EEE', 'en-US');
  return `${name} · ${formatDate(at, 'd MMM y', 'en-US')}`;
}

/** Group rows (already sorted newest first) by local day. */
export function groupByDay<T extends { at: Date }>(rows: T[]): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const row of rows) {
    const key = DateOnlyUtil.formatLocalDate(row.at);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.rows.push(row);
    else groups.push({ key, label: dayHeading(row.at), rows: [row] });
  }
  return groups;
}

/** "3:58 PM" today, "Sep 21, 3:58 PM" otherwise. */
export function whenLabel(at: Date, hasTime: boolean): string {
  const time = hasTime ? formatDate(at, 'h:mm a', 'en-US') : '';
  if (DateOnlyUtil.isSameLocalDay(at, new Date())) return time || 'Today';
  const day = formatDate(at, 'MMM d', 'en-US');
  return time ? `${day}, ${time}` : day;
}
