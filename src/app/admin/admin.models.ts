import { formatDate } from '@angular/common';
import { DateOnlyUtil } from '../shared/utils/date-only.util';

// Typed per .claude/context/admin-api-contract.md (round 1).
export type Segment = 'with_baby' | 'pregnant';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'corrected';
export type AiCategory = 'feeding' | 'pumping' | 'nutrition' | 'diapers' | 'sleep' | 'growth' | 'postpartum' | 'mental_wellbeing' | 'general' | 'other';

export const AI_CATEGORIES: AiCategory[] = ['feeding', 'pumping', 'nutrition', 'diapers', 'sleep', 'growth', 'postpartum', 'mental_wellbeing', 'general', 'other'];
export const REVIEW_STATUSES: ReviewStatus[] = ['pending', 'approved', 'rejected', 'corrected'];

// Round 1b: automatic AI answer check
export type ReviewTab = 'flagged' | ReviewStatus;
export type AiFlag = 'medication' | 'medical_red_flag' | 'mental_health' | 'crisis' | 'seeking_help' | 'concerning' | 'off_topic' | 'unsafe_answer';
export type AiRisk = 'low' | 'medium' | 'high';
export const AI_FLAGS: { key: AiFlag; label: string }[] = [
  { key: 'medication', label: 'Medication' }, { key: 'medical_red_flag', label: 'Medical red flag' },
  { key: 'mental_health', label: 'Mental health' }, { key: 'crisis', label: 'Crisis' }, { key: 'seeking_help', label: 'Seeking help' },
  { key: 'concerning', label: 'Concerning' }, { key: 'off_topic', label: 'Off topic' }, { key: 'unsafe_answer', label: 'Unsafe answer' }
];
/** Below this the AI self-check score is highlighted. */
export const CHECK_PASS_SCORE = 70;
export interface AiCheck { flags: string[]; risk: AiRisk; score: number; reason: string; checkedAt: string; }

export function flagLabel(f: string): string {
  return AI_FLAGS.find(x => x.key === f)?.label || f.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

export interface ApiEnvelope<T> { success: boolean; data: T; message?: string; }
export interface DateRange { from: string; to: string; }
export interface DateCount { date: string; count: number; }

export interface DashboardData {
  range: DateRange;
  totals: { mothers: number; withBaby: number; pregnant: number; newSignups: number; activeMothers7d: number; deleted: number };
  signupsPerDay: DateCount[];
  recordsPerDay: { date: string; feeds: number; pumps: number; diapers: number; growth: number; mood: number }[];
  ai: {
    questionsPerDay: DateCount[]; totalQuestions: number;
    pending: number; approved: number; rejected: number; corrected: number;
    byCategory: { category: string; count: number }[];
    flagged?: number; byFlag?: { flag: string; count: number }[];
  };
  needsAttention: { userId: string; name: string; segment: Segment; lastActivityAt: string | null; daysSince: number | null }[];
}

export interface BabyLite { id: string; name: string; gender: string; dateOfBirth: string; }

export interface MotherListItem {
  userId: string; firstName: string; lastName: string; email: string; phone: string | null;
  profileImageUrl: string | null; joinedAt: string; status: 'active' | 'deleted';
  lastActivityAt: string | null;
  babies?: BabyLite[];
  today?: { directFeeds: number; pumps: number; wetDiapers: number; formulaMl: number };
  dueDate?: string | null; weeksPregnant?: number | null;
  aiQuestions: number;
}

export interface Paged<T> { items: T[]; page: number; limit: number; total: number; }

export interface MotherListQuery {
  segment: Segment; search?: string; page?: number; limit?: number;
  sort?: 'recent' | 'name' | 'joined'; includeDeleted?: boolean;
}

export interface BabyDetail extends BabyLite {
  birthWeight: number | null; currentWeight: number | null; currentHeight: number | null; isActive: boolean;
}

export interface MotherDetail {
  profile: {
    userId: string; firstName: string; lastName: string; email: string; phone: string | null; whatsapp: string | null;
    profileImageUrl: string | null; joinedAt: string; status: 'active' | 'deleted'; motherType: string | null;
    dueDate: string | null; weeksPregnant: number | null; timezone: string | null;
  };
  babies: BabyDetail[];
  pregnancy: Record<string, any> | null;
  onboarding: { section: string; data: any }[];
  account: {
    joinedAt: string; loginType: 'email' | 'google' | 'facebook'; timezone: string | null;
    tier: { type: string; startDate: string | null; endDate: string | null } | null;
    status: string; deletedAt: string | null; onboardingCompleted: boolean; lastActivityAt: string | null;
  };
  counts: { feeds: number; pumps: number; diapers: number; growth: number; mood: number; aiQuestions: number };
}

export interface GrowthRecord { id: string; date: string; weightKg: number | null; heightCm: number | null; notes: string | null; }
export interface FeedItem { id: string; date: string; time: string | null; type: 'direct' | 'expressed' | 'formula'; side: string | null; durationMin: number | null; ml: number | null; notes: string | null; }
export interface DiaperItem { id: string; date: string; time: string | null; changeType: string; wetness: string | null; notes: string | null; }
export interface PumpItem { id: string; date: string; time: string | null; side: string | null; ml: number | null; durationMin: number | null; notes: string | null; }
export interface MoodItem {
  id: string; date: string; time: string | null; struggles: string[]; positives: string[]; concerning: string[]; notes: string | null;
  gratefulFor?: string | null; proudOfToday?: string | null; tomorrowGoal?: string | null; crisisAlert?: boolean | null;
}

export type EventType = 'feed' | 'pump' | 'diaper' | 'growth' | 'mood' | 'ai_question' | 'baby_added' | 'signup';
export interface EventItem { at: string; type: EventType; title: string; detail: string; babyId: string | null; }
export interface EventPage { items: EventItem[]; nextBefore: string | null; }

export interface AiReview { status: ReviewStatus; correctedAnswer: string | null; notes: string | null; reviewerName: string | null; validatedAt: string | null; }
export interface AiPair {
  questionId: string; answerId: string | null; conversationId: string; askedAt: string;
  question: string; answer: string | null; model: string | null; category: string | null; babyAgeWeeks: number | null;
  review: AiReview | null;
  check?: AiCheck | null;
  mother?: { userId?: string; firstName: string; lastName?: string; email?: string };
}
export interface AiReviewPage extends Paged<AiPair> { counts: Partial<Record<ReviewTab, number>>; }
export interface AiReviewUpdate { status: Exclude<ReviewStatus, 'pending'>; category?: string; correctedAnswer?: string; notes?: string; }

/** Contract rule: not reviewed and (any flag, score under 70, or medium/high risk). */
export function isFlagged(p: AiPair): boolean {
  const c = p.check;
  const reviewed = !!p.review && p.review.status !== 'pending';
  return !reviewed && !!c && (c.flags.length > 0 || c.score < CHECK_PASS_SCORE || c.risk !== 'low');
}

export function categoryLabel(c: string | null | undefined): string {
  if (!c || c === 'uncategorized') return 'Uncategorized';
  const s = c.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Longest range the dashboard endpoint accepts. */
export const DASHBOARD_MAX_DAYS = 366;

export function fullName(p: { firstName?: string; lastName?: string } | null | undefined): string {
  return [p?.firstName, p?.lastName].filter(Boolean).join(' ') || '-';
}

export function initials(p: { firstName?: string; lastName?: string } | null | undefined): string {
  return ((p?.firstName?.[0] || '') + (p?.lastName?.[0] || '')).toUpperCase() || '?';
}

/** "5 months 12 days" from a YYYY-MM-DD date of birth. */
export function babyAge(dob: string | null | undefined, ref = new Date()): string {
  if (!dob) return '-';
  const d = DateOnlyUtil.parseLocalDate(dob);
  let months = (ref.getFullYear() - d.getFullYear()) * 12 + ref.getMonth() - d.getMonth();
  let days = ref.getDate() - d.getDate();
  if (days < 0) { months--; days += new Date(ref.getFullYear(), ref.getMonth(), 0).getDate(); }
  if (months < 0) return '-';
  const part = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  if (months === 0) return part(days, 'day');
  if (months >= 24) return part(Math.floor(months / 12), 'year');
  return days ? `${part(months, 'month')} ${part(days, 'day')}` : part(months, 'month');
}

/** Local display for a YYYY-MM-DD or ISO value; '-' when missing. */
export function fmtWhen(v: string | null | undefined, f = 'd MMM y'): string {
  if (!v) return '-';
  const d = DateOnlyUtil.parseLocalDate(v);
  return isNaN(d.getTime()) ? '-' : formatDate(d, f, 'en-US');
}

/** Default dashboard range: the last 30 local days including today. */
export function last30(): DateRange {
  const now = new Date();
  return {
    from: DateOnlyUtil.formatLocalDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)),
    to: DateOnlyUtil.formatLocalDate(now)
  };
}

// Round 1c: Lactation Consultants (role expert)
export interface LcItem {
  userId: string; expertId: string; firstName: string; lastName: string | null; email: string; phone: string | null;
  credentials: string | null; status: 'active' | 'inactive'; createdAt: string; lastLoginAt: string | null; reviewsDone: number;
}
export interface LcCreate { firstName: string; lastName?: string; email: string; password: string; phone?: string; credentials?: string; }
export const LC_MIN_PASSWORD = 8;

/** 14-char password with upper, lower, digit and symbol, no look-alike characters. */
export function strongPassword(len = 14): string {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%&*?'];
  const all = sets.join('');
  const rnd = (n: number) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
  const chars = sets.map(s => s[rnd(s.length)]);
  while (chars.length < len) chars.push(all[rnd(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = rnd(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}

export function downloadCsv(csv: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
