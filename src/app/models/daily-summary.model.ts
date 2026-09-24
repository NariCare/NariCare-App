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
