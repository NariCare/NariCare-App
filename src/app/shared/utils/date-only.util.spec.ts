import { DateOnlyUtil } from './date-only.util';

describe('DateOnlyUtil', () => {
  describe('parseLocalDate', () => {
    it('parses YYYY-MM-DD as local midnight (no UTC shift)', () => {
      const d = DateOnlyUtil.parseLocalDate('2026-09-19');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(8); // September
      expect(d.getDate()).toBe(19);
      expect(d.getHours()).toBe(0);
    });

    it('passes a Date through unchanged', () => {
      const src = new Date(2026, 8, 19, 5, 30);
      expect(DateOnlyUtil.parseLocalDate(src)).toBe(src);
    });

    it('parses an ISO datetime string', () => {
      const d = DateOnlyUtil.parseLocalDate('2026-09-19T05:30:00.000Z');
      expect(isNaN(d.getTime())).toBeFalse();
    });
  });

  describe('isSameLocalDay', () => {
    it('matches a date-only string against a same-day local Date', () => {
      expect(DateOnlyUtil.isSameLocalDay('2026-09-19', new Date(2026, 8, 19, 23, 0))).toBeTrue();
    });

    it('rejects different days', () => {
      expect(DateOnlyUtil.isSameLocalDay('2026-09-19', new Date(2026, 8, 20))).toBeFalse();
    });

    it('returns false on invalid input', () => {
      expect(DateOnlyUtil.isSameLocalDay('not-a-date', new Date())).toBeFalse();
    });
  });

  describe('isInLocalWeek', () => {
    // Sun 2026-09-20 anchors a Sun..Sat week of 2026-09-20 .. 2026-09-26
    const refSunday = new Date(2026, 8, 20);

    it('includes the reference Sunday itself', () => {
      expect(DateOnlyUtil.isInLocalWeek('2026-09-20', refSunday)).toBeTrue();
    });

    it('includes the following Saturday', () => {
      expect(DateOnlyUtil.isInLocalWeek('2026-09-26', refSunday)).toBeTrue();
    });

    it('excludes the previous Saturday', () => {
      expect(DateOnlyUtil.isInLocalWeek('2026-09-19', refSunday)).toBeFalse();
    });
  });
});
