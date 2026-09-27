import { AlertController } from '@ionic/angular';
import { DateOnlyUtil } from './date-only.util';
import { GrowthKind, whoZ } from './who-lms.util';

export interface GrowthPoint {
  date: Date;
  weight?: number | null;
  height?: number | null;
}

/** blocking = impossible value (cannot be saved); otherwise a warning the mother can override. */
export interface GrowthIssue {
  text: string;
  blocking: boolean;
}

export interface GrowthBaby {
  dateOfBirth: Date | string;
  gender?: string;
  birthWeight?: number | null;
  birthHeight?: number | null;
}

const DAY_MS = 86400000;
const HEIGHT_EPS_CM = 0.05;        // rounding only; babies do not get shorter
const WEIGHT_DROP_RATIO = 0.95;    // >5% below the previous weight
const NEWBORN_DAYS = 14;           // physiological weight loss window
const NEWBORN_MIN_RATIO = 0.9;     // >10% below birth weight
const RATE_MIN_DAYS = 7;
const MAX_GAIN_PER_DAY = { weight: 0.1, height: 0.3 };    // kg/day, cm/day over >= 7 days
const MAX_SHORT_GAIN = { weight: 0.7, height: 2 };        // kg, cm within < 7 days
const WHO_Z_WARN = 4;
// WHO Anthro 'biologically implausible' flags: HAZ < -6 or > +6, WAZ < -6 or > +5
const WHO_BIV = { weight: { low: -6, high: 5 }, height: { low: -6, high: 6 } };

const UNIT = { weight: 'kg', height: 'cm' };

const num = (v: any): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
};
const fmt = (kind: GrowthKind, v: number) => `${+v.toFixed(2)} ${UNIT[kind]}`;
const day = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const days = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY_MS);

/** Normalises backend weight_records rows (snake_case or camelCase) into points. */
export function toGrowthPoints(records: any[] | null | undefined): GrowthPoint[] {
  return (records || [])
    .map(r => ({
      date: DateOnlyUtil.parseLocalDate(String(r.record_date ?? r.recordDate ?? r.date ?? '').slice(0, 10)),
      weight: num(r.weight),
      height: num(r.height)
    }))
    .filter(p => !isNaN(p.date.getTime()));
}

/** Plain-language issues when a new growth entry is impossible or breaks the expected trend. */
export function growthWarnings(baby: GrowthBaby, history: GrowthPoint[], entry: GrowthPoint): GrowthIssue[] {
  const dob = baby.dateOfBirth instanceof Date
    ? new Date(baby.dateOfBirth.getFullYear(), baby.dateOfBirth.getMonth(), baby.dateOfBirth.getDate())
    : DateOnlyUtil.parseLocalDate(String(baby.dateOfBirth ?? '').slice(0, 10));
  const hasDob = !isNaN(dob.getTime());
  const birth: GrowthPoint | null = hasDob ? { date: dob, weight: num(baby.birthWeight), height: num(baby.birthHeight) } : null;
  const points = birth ? [birth, ...history] : history;
  const ageDays = hasDob ? days(dob, entry.date) : NaN;
  const sex = baby.gender === 'male' || baby.gender === 'female' ? baby.gender : null;
  const warnings: GrowthIssue[] = [];
  const warn = (text: string) => warnings.push({ text, blocking: false });
  const block = (text: string) => warnings.push({ text, blocking: true });

  (['weight', 'height'] as GrowthKind[]).forEach(kind => {
    const value = num(entry[kind]);
    if (value === null) return;

    const withKind = points.filter(p => num(p[kind]) !== null);
    const prev = withKind.filter(p => p.date <= entry.date).sort((a, b) => b.date.getTime() - a.date.getTime())[0];
    const next = withKind.filter(p => p.date > entry.date).sort((a, b) => a.date.getTime() - b.date.getTime())[0];
    const prevVal = prev ? num(prev[kind])! : null;
    const nextVal = next ? num(next[kind])! : null;
    const before = prev === birth ? 'at birth' : prev ? `on ${day(prev.date)}` : '';

    // WHO implausible range: almost always a typo or wrong unit
    const z = sex && hasDob ? whoZ(kind, sex, ageDays, value) : null;
    if (z !== null && (z < WHO_BIV[kind].low || z > WHO_BIV[kind].high)) {
      block(`${fmt(kind, value)} does not look like a real ${kind} for a baby this age. Please check the number and the unit.`);
      return;
    }
    const countBefore = warnings.length;

    // Height never goes down: compare with the tallest earlier record (74 -> 73 -> 72 is caught). Mirrors NariCare-Service utils/heightGuard.js
    const tallest = kind === 'height'
      ? withKind.filter(p => p.date <= entry.date).sort((a, b) => num(b.height)! - num(a.height)!)[0]
      : undefined;
    if (tallest && value < num(tallest.height)! - HEIGHT_EPS_CM) {
      const when = tallest === birth ? 'at birth' : `on ${day(tallest.date)}`;
      block(`Height cannot be lower than an earlier record (${fmt(kind, num(tallest.height)!)} ${when}). You entered ${fmt(kind, value)}.`);
    }
    if (kind === 'weight') {
      const newborn = ageDays >= 0 && ageDays <= NEWBORN_DAYS;
      const birthVal = birth ? num(birth.weight) : null;
      if (newborn && birthVal !== null && value < birthVal * NEWBORN_MIN_RATIO) {
        warn(`Weight is more than 10% below birth weight (${fmt(kind, birthVal)}). Please check the entry, and talk to your doctor or lactation consultant if it is correct.`);
      } else if (!newborn && prevVal !== null && value < prevVal * WEIGHT_DROP_RATIO) {
        warn(`Weight looks lower than before. Last recorded ${fmt(kind, prevVal)} ${before}, you entered ${fmt(kind, value)}.`);
      }
    }

    // Higher than a later record (back-dated entry); height against the shortest later record
    const later = kind === 'height'
      ? withKind.filter(p => p.date > entry.date).sort((a, b) => num(a.height)! - num(b.height)!)[0]
      : next;
    const laterVal = later ? num(later[kind])! : null;
    const laterLimit = kind === 'height' ? laterVal! + HEIGHT_EPS_CM : laterVal! / WEIGHT_DROP_RATIO;
    if (laterVal !== null && value > laterLimit) {
      if (kind === 'height') {
        block(`Height cannot be higher than a later record (${fmt(kind, laterVal)} on ${day(later!.date)}). You entered ${fmt(kind, value)}.`);
      } else {
        warn(`Weight is higher than a later record (${fmt(kind, laterVal)} on ${day(later!.date)}).`);
      }
    }

    // Growing faster than is realistic
    if (prev && prevVal !== null && value > prevVal) {
      const gap = days(prev.date, entry.date);
      const gain = value - prevVal;
      const tooFast = gap >= RATE_MIN_DAYS ? gain / gap > MAX_GAIN_PER_DAY[kind] : gain > MAX_SHORT_GAIN[kind];
      if (tooFast) {
        warn(`${kind === 'weight' ? 'Weight' : 'Height'} went up by ${fmt(kind, gain)} since ${prev === birth ? 'birth' : day(prev.date)}, which is faster than usual. Please check the entry.`);
      }
    }

    // Far from usual but possible: warn only if nothing more specific was said
    if (z !== null && Math.abs(z) > WHO_Z_WARN && warnings.length === countBefore) {
      warn(`${fmt(kind, value)} is much ${z < 0 ? 'lower' : 'higher'} than usual for a baby this age. Please check the entry, and talk to your doctor or lactation consultant if it is correct.`);
    }
  });

  return warnings;
}

/** Impossible values: explain and send back to edit. Otherwise warn; resolves true when the mother saves anyway. */
export async function confirmGrowthEntry(alertController: AlertController, issues: GrowthIssue[]): Promise<boolean> {
  if (!issues.length) return true;
  const blocking = issues.filter(i => i.blocking);
  const alert = await alertController.create(blocking.length
    ? {
        header: 'This value looks wrong',
        message: blocking.map(i => i.text).join('\n\n'),
        cssClass: 'growth-check-alert',
        buttons: [{ text: 'Edit', role: 'cancel' }]
      }
    : {
        header: 'Please check this entry',
        message: issues.map(i => i.text).join('\n\n'),
        cssClass: 'growth-check-alert',
        buttons: [
          { text: 'Edit', role: 'cancel' },
          { text: 'Save anyway', role: 'confirm' }
        ]
      });
  await alert.present();
  const { role } = await alert.onDidDismiss();
  return !blocking.length && role === 'confirm';
}
