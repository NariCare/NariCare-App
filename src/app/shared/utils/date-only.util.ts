/**
 * Date helpers for records whose date arrives as a date-only string (YYYY-MM-DD).
 * `new Date("2026-09-19")` parses as UTC midnight, which shifts the day for
 * positive-offset timezones (e.g. GMT+5:30). These helpers keep everything local.
 */
export class DateOnlyUtil {
  /**
   * Parse a value into a local Date.
   * A `YYYY-MM-DD` string is built with local components (no UTC shift).
   * Anything else (ISO datetime, Date) is passed through to `new Date`.
   */
  static parseLocalDate(value: string | Date | null | undefined): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
      if (m) {
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      }
    }
    return new Date(value as any);
  }

  /** Format a date as a local `YYYY-MM-DD` string (no UTC shift). Defaults to now. */
  static formatLocalDate(date: Date = new Date()): string {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Format a date as a local `HH:MM:SS` string. Defaults to now. */
  static formatLocalTime(date: Date = new Date()): string {
    const h = `${date.getHours()}`.padStart(2, '0');
    const min = `${date.getMinutes()}`.padStart(2, '0');
    const s = `${date.getSeconds()}`.padStart(2, '0');
    return `${h}:${min}:${s}`;
  }

  /** True if both dates fall on the same local calendar day. */
  static isSameLocalDay(a: string | Date | null | undefined, b: string | Date | null | undefined): boolean {
    const da = this.parseLocalDate(a);
    const db = this.parseLocalDate(b);
    if (isNaN(da.getTime()) || isNaN(db.getTime())) return false;
    return da.getFullYear() === db.getFullYear()
      && da.getMonth() === db.getMonth()
      && da.getDate() === db.getDate();
  }

  /**
   * True if `date` is in the same Sunday-start local week as `ref` (defaults to now).
   */
  static isInLocalWeek(date: string | Date | null | undefined, ref: Date = new Date()): boolean {
    const d = this.parseLocalDate(date);
    if (isNaN(d.getTime())) return false;

    const weekStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // back to Sunday
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return d >= weekStart && d <= weekEnd;
  }
}
