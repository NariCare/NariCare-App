import { formatPercentile, whoCurve, whoPercentile, whoZ } from './who-lms.util';

describe('who-lms.util', () => {
  it('boys birth median weight is the 50th percentile', () => {
    expect(whoZ('weight', 'male', 0, 3.3464)!).toBeCloseTo(0, 6);
    expect(whoPercentile('weight', 'male', 0, 3.3464)).toBe(50);
  });

  it('boys birth +2 SD weight (4.4 kg) is about the 97.7th percentile', () => {
    const p = whoPercentile('weight', 'male', 0, 4.4)!;
    expect(Math.abs(p - 97.7)).toBeLessThan(0.3);
    const exactSd2 = 3.3464 * Math.pow(1 + 2 * 0.3487 * 0.14602, 1 / 0.3487); // 4.419, table rounds to 4.4
    expect(whoPercentile('weight', 'male', 0, exactSd2)).toBe(97.7);
  });

  it('girls 12 month median height (lhfa M=74.015) is 50th', () => {
    expect(whoPercentile('height', 'female', 12 * 30.4375, 74.015)).toBe(50);
  });

  it('rejects out of range input', () => {
    expect(whoZ('weight', 'male', -1, 3)).toBeNull();
    expect(whoZ('weight', 'male', 1857, 3)).toBeNull();
    expect(whoZ('weight', 'male', 10, 0)).toBeNull();
  });

  it('curve at 50th returns M and 97th sits above it', () => {
    const med = whoCurve('weight', 'male', 50, 12);
    expect(med[0].value).toBeCloseTo(3.3464, 3);
    expect(med.length).toBe(25);
    expect(whoCurve('weight', 'male', 97, 12)[0].value).toBeGreaterThan(med[0].value);
  });

  it('formats ordinals', () => {
    expect(formatPercentile(0.4)).toBe('<1st');
    expect(formatPercentile(50)).toBe('50th');
    expect(formatPercentile(1.2)).toBe('1st');
    expect(formatPercentile(22)).toBe('22nd');
    expect(formatPercentile(13)).toBe('13th');
    expect(formatPercentile(99.6)).toBe('>99th');
  });
});
