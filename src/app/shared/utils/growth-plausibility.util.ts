import { AlertController } from '@ionic/angular';
import { DateOnlyUtil } from './date-only.util';

export interface GrowthPoint {
  date: Date;
  weight?: number | null;
  height?: number | null;
}

/** blocking = cannot be saved; otherwise a warning the mother can override. */
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

const num = (v: any): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
};
const cm = (v: number) => `${+v.toFixed(2)} cm`;
const day = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

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

/**
 * Checks a new entry only against the baby's own records. Weight can go up or down, so it is not checked.
 * Height never goes down: it cannot be lower than an earlier record (birth included) or higher than a later one.
 * Mirrors NariCare-Service utils/heightGuard.js
 */
export function growthWarnings(baby: GrowthBaby, history: GrowthPoint[], entry: GrowthPoint): GrowthIssue[] {
  const height = num(entry.height);
  if (height === null) return [];

  const dob = baby.dateOfBirth instanceof Date
    ? new Date(baby.dateOfBirth.getFullYear(), baby.dateOfBirth.getMonth(), baby.dateOfBirth.getDate())
    : DateOnlyUtil.parseLocalDate(String(baby.dateOfBirth ?? '').slice(0, 10));
  const birthHeight = num(baby.birthHeight);
  const birth: GrowthPoint | null = birthHeight !== null && !isNaN(dob.getTime()) ? { date: dob, height: birthHeight } : null;
  const withHeight = (birth ? [birth, ...history] : history).filter(p => num(p.height) !== null);

  const tallestEarlier = withHeight.filter(p => p.date <= entry.date).sort((a, b) => num(b.height)! - num(a.height)!)[0];
  if (tallestEarlier && height < num(tallestEarlier.height)!) {
    const when = tallestEarlier === birth ? 'at birth' : `on ${day(tallestEarlier.date)}`;
    return [{ text: `Height cannot be lower than an earlier record (${cm(num(tallestEarlier.height)!)} ${when}). You entered ${cm(height)}.`, blocking: true }];
  }
  const shortestLater = withHeight.filter(p => p.date > entry.date).sort((a, b) => num(a.height)! - num(b.height)!)[0];
  if (shortestLater && height > num(shortestLater.height)!) {
    return [{ text: `Height cannot be higher than a later record (${cm(num(shortestLater.height)!)} on ${day(shortestLater.date)}). You entered ${cm(height)}.`, blocking: true }];
  }
  return [];
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
