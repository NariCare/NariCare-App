import { formatDate } from '@angular/common';
import { DateOnlyUtil } from '../shared/utils/date-only.util';

// Contract for GET /tracker/daily-summary/:babyId (days newest first, dates are local YYYY-MM-DD).
export interface DailySummaryDay {
  date: string;
  hasData: boolean;
  feeding: { directSessions: number; averageDurationMinutes: number | null; formulaMl: number };
  pumping: { sessions: number; outputMl: number };
  diapers: { pee: number };
  additional: { poop: number; expressedMilkGivenMl: number };
}

export interface DailySummaryRange {
  babyId: string;
  from: string;
  to: string;
  days: DailySummaryDay[];
}

export interface DailySummaryResponse {
  success: boolean;
  data: DailySummaryRange;
}

/** State the entry card renders. */
export interface TodaySummaryState {
  loading: boolean;
  error: boolean;
  day: DailySummaryDay | null;
}

export const PUMPING_DEFINITION = 'Pumping sessions counted when both sides were pumped for 30+ minutes total.';

/** Average duration as "18 min" or "1 hr 5 min"; '-' when unknown. */
export function fmtAvg(min: number | null | undefined): string {
  if (min == null) return '-';
  const m = Math.round(min);
  return m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`; // matches "8 min" elsewhere
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export const CALENDAR_DAY_NOTE = 'These numbers are for each calendar day, from midnight to midnight.';

export type TimelineKind = 'direct' | 'expressed' | 'formula' | 'pump' | 'diaper';

export interface DayTimelineEvent {
  id: string;
  kind: TimelineKind;
  time: string | null;
  title: string;
  detail: string;
  value: string;
}

export interface DayTimeline { babyId: string; date: string; events: DayTimelineEvent[]; }
export interface DayTimelineResponse { success: boolean; data: DayTimeline; }

export function addDays(date: string, n: number): string {
  const d = DateOnlyUtil.parseLocalDate(date);
  return DateOnlyUtil.formatLocalDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

export function emptyDay(date: string): DailySummaryDay {
  return {
    date, hasData: false,
    feeding: { directSessions: 0, averageDurationMinutes: null, formulaMl: 0 },
    pumping: { sessions: 0, outputMl: 0 },
    diapers: { pee: 0 },
    additional: { poop: 0, expressedMilkGivenMl: 0 }
  };
}

export function fmtDay(date: string, f: string): string {
  return formatDate(DateOnlyUtil.parseLocalDate(date), f, 'en-US');
}

/** "3 direct feeds · 1 pump · 150 mL formula · 8 pee" for list rows. */
export function dayLine(d: DailySummaryDay): string {
  if (!d.hasData) return 'Nothing logged';
  return [
    plural(d.feeding.directSessions, 'direct feed'),
    plural(d.pumping.sessions, 'pump'),
    `${d.feeding.formulaMl} mL formula`,
    `${d.diapers.pee} pee`
  ].join(' · ');
}

/** Plain-text table for the share sheet; columns padded so rows line up in monospace apps. */
export function summaryShareText(days: DailySummaryDay[], babyName?: string, subtitle?: string): string {
  const today = DateOnlyUtil.formatLocalDate();
  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date));
  const widths = [11, 6, 6, 6, 8, 8, 4, 5];
  const line = (cols: string[]) => cols.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('').trimEnd();
  const rows = sorted.map(d => line([
    d.date === today ? 'Today' : fmtDay(d.date, 'EEE d MMM'),
    ...(d.hasData
      ? [String(d.feeding.directSessions), fmtAvg(d.feeding.averageDurationMinutes), String(d.pumping.sessions),
        `${d.pumping.outputMl}mL`, `${d.feeding.formulaMl}mL`, String(d.diapers.pee), String(d.additional.poop)]
      : ['-', '-', '-', '-', '-', '-', '-'])
  ]));
  const oldest = sorted[sorted.length - 1]?.date || today;
  const newest = sorted[0]?.date || today;
  const span = oldest === newest ? fmtDay(oldest, 'EEEE d MMM y') : `${fmtDay(oldest, 'd MMM y')} to ${fmtDay(newest, 'd MMM y')}`;
  return [
    `NariCare Daily Summary${babyName ? ` for ${babyName}` : ''}`,
    subtitle ? `${span} (${subtitle})` : span,
    '',
    line(['Date', 'Direct', 'Avg', 'Pump*', 'Pumped', 'Formula', 'Pee', 'Poop']),
    ...rows,
    '',
    `* ${PUMPING_DEFINITION}`,
    'Generated from NariCare.'
  ].join('\n');
}

/** CSV with ISO dates, oldest first; empty cells for days with nothing logged. */
export function summaryCsv(days: DailySummaryDay[]): string {
  const head = ['date', 'direct_feeds', 'avg_direct_feed_min', 'pumping_sessions', 'pumped_output_ml', 'formula_ml', 'wet_diapers', 'poop', 'expressed_milk_given_ml'];
  const rows = [...days].sort((a, b) => a.date.localeCompare(b.date)).map(d => [
    d.date,
    ...(d.hasData
      ? [d.feeding.directSessions, d.feeding.averageDurationMinutes == null ? '' : Math.round(d.feeding.averageDurationMinutes),
        d.pumping.sessions, d.pumping.outputMl, d.feeding.formulaMl, d.diapers.pee, d.additional.poop, d.additional.expressedMilkGivenMl]
      : head.slice(1).map(() => ''))
  ].join(','));
  return [head.join(','), ...rows].join('\r\n') + '\r\n';
}

/** Native share sheet with clipboard fallback; returns a toast message or null. */
export async function shareText(text: string, title = 'NariCare Daily Summary'): Promise<string | null> {
  const nav: any = navigator;
  try {
    if (nav.share) { await nav.share({ title, text }); return null; }
  } catch (e: any) {
    if (e?.name === 'AbortError') return null; // user closed the share sheet
  }
  try {
    await nav.clipboard.writeText(text);
    return 'Summary copied';
  } catch {
    return "Couldn't share summary";
  }
}

export type Tone = 'pink' | 'lavender' | 'yellow' | 'green' | 'brown';
export interface CareMetric { label: string; value: string; unit?: string; img?: string; icon?: string; tone: Tone; }
/** Tiles shared by the summary grid and Day Details. */
export function careMetrics(d: DailySummaryDay): CareMetric[] {
  return [
    { label: 'Direct feeds', value: String(d.feeding.directSessions), img: 'assets/Fed directly.svg', tone: 'pink' },
    { label: 'Pumping sessions', value: String(d.pumping.sessions), img: 'assets/Pump.svg', tone: 'lavender' },
    { label: 'Pumped output', value: String(d.pumping.outputMl), unit: 'mL', icon: 'water', tone: 'yellow' },
    { label: 'Formula intake', value: String(d.feeding.formulaMl), unit: 'mL', img: 'assets/Formula.svg', tone: 'green' },
    { label: 'Wet diapers', value: String(d.diapers.pee), img: 'assets/Diaper change.svg', tone: 'lavender' }
  ];
}

