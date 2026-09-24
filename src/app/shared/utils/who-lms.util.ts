import { WHO_LMS, WhoLmsRow } from '../../models/who-lms-data.model';

export type GrowthKind = 'weight' | 'height';
export type Sex = 'male' | 'female';

const DAYS_PER_MONTH = 30.4375;
const MAX_AGE_DAYS = 1856; // 60 months + margin

function table(kind: GrowthKind, sex: Sex): readonly WhoLmsRow[] {
  return WHO_LMS[`${kind === 'weight' ? 'wfa' : 'lhfa'}_${sex}`];
}

/** LMS linearly interpolated at a fractional month, clamped to 0..60. */
function lmsAt(kind: GrowthKind, sex: Sex, month: number): WhoLmsRow {
  const rows = table(kind, sex);
  const m = Math.min(Math.max(month, 0), rows.length - 1);
  const i = Math.min(Math.floor(m), rows.length - 2);
  const t = m - i;
  const a = rows[i], b = rows[i + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Standard normal CDF (Abramowitz-Stegun 26.2.17, abs error < 7.5e-8). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

/** Inverse standard normal (Acklam rational approximation, rel error < 1.2e-9). */
export function normalInv(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) return -normalInv(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export function whoZ(kind: GrowthKind, sex: Sex, ageDays: number, value: number): number | null {
  if (!Number.isFinite(ageDays) || !Number.isFinite(value) || ageDays < 0 || ageDays > MAX_AGE_DAYS || value <= 0) return null;
  if (sex !== 'male' && sex !== 'female') return null;
  const [L, M, S] = lmsAt(kind, sex, ageDays / DAYS_PER_MONTH);
  return L === 0 ? Math.log(value / M) / S : (Math.pow(value / M, L) - 1) / (L * S);
}

export function whoPercentile(kind: GrowthKind, sex: Sex, ageDays: number, value: number): number | null {
  const z = whoZ(kind, sex, ageDays, value);
  if (z === null) return null;
  const p = Math.round(normalCdf(z) * 1000) / 10;
  return Math.min(99.9, Math.max(0.1, p));
}

export function whoCurve(kind: GrowthKind, sex: Sex, percentile: number, maxMonth: number, stepMonths = 0.5): { month: number; value: number }[] {
  const z = normalInv(percentile / 100);
  const end = Math.min(Math.max(maxMonth, 0), 60);
  const out: { month: number; value: number }[] = [];
  for (let m = 0; m <= end + 1e-9; m += stepMonths) {
    const [L, M, S] = lmsAt(kind, sex, m);
    const v = L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);
    out.push({ month: Math.round(m * 1000) / 1000, value: Math.round(v * 1000) / 1000 });
  }
  return out;
}

export function formatPercentile(p: number): string {
  if (p < 1) return '<1st';
  if (p > 99) return '>99th';
  const n = Math.round(p);
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th';
  return `${n}${suffix}`;
}
