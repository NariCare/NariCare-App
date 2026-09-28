import { growthWarnings as issues, toGrowthPoints, GrowthBaby } from './growth-plausibility.util';

const d = (s: string) => new Date(`${s}T00:00:00`);
const baby: GrowthBaby = { dateOfBirth: '2026-04-01', gender: 'female', birthWeight: 3.2, birthHeight: 49 };
const history = toGrowthPoints([
  { record_date: '2026-05-14', weight: '4.60', height: '55.00' },
  { record_date: '2026-07-14', weight: '6.00', height: '61.00' }
]);

describe('growth-plausibility.util', () => {
  it('ticket example: height 80 cm then 78 cm is blocked', () => {
    const older: GrowthBaby = { dateOfBirth: '2025-06-01' };
    const r = issues(older, toGrowthPoints([{ record_date: '2026-08-01', height: 80 }]), { date: d('2026-09-01'), height: 78 });
    expect(r.length).toBe(1);
    expect(r[0].blocking).toBeTrue();
    expect(r[0].text).toContain('cannot be lower than an earlier record (80 cm');
  });

  it('compares with the tallest earlier record, not just the last one', () => {
    const h = toGrowthPoints([{ record_date: '2026-08-01', height: 74 }, { record_date: '2026-09-01', height: 73 }]);
    expect(issues({ dateOfBirth: '2025-07-15' }, h, { date: d('2026-09-26'), height: 72 })[0].text).toContain('(74 cm on 1 Aug)');
  });

  it('height below birth height is blocked', () => {
    expect(issues(baby, [], { date: d('2026-04-10'), height: 48 })[0].text).toContain('at birth');
  });

  it('any height at or above earlier records saves silently', () => {
    const newborn: GrowthBaby = { dateOfBirth: '2026-09-15', gender: 'female' };
    const h = toGrowthPoints([{ record_date: '2026-09-24', weight: 5, height: 35 }]);
    expect(issues(newborn, h, { date: d('2026-09-28'), height: 37 })).toEqual([]);
    expect(issues(newborn, h, { date: d('2026-09-28'), height: 35 })).toEqual([]);
    expect(issues(baby, history, { date: d('2026-09-26'), height: 80 })).toEqual([]);
  });

  it('back-dated height higher than a later record is blocked', () => {
    const r = issues(baby, history, { date: d('2026-06-14'), height: 63 });
    expect(r[0].blocking).toBeTrue();
    expect(r[0].text).toContain('cannot be higher than a later record (61 cm');
  });

  it('weight is never checked, up or down', () => {
    expect(issues(baby, history, { date: d('2026-09-26'), weight: 3.8 })).toEqual([]);
    expect(issues(baby, history, { date: d('2026-09-26'), weight: 45 })).toEqual([]);
  });

  it('first ever entry has nothing to compare with', () => {
    expect(issues({ dateOfBirth: '2026-09-15' }, [], { date: d('2026-09-28'), height: 37 })).toEqual([]);
  });

  it('accepts Date and ISO datetime birth dates', () => {
    const entry = { date: d('2026-04-10'), height: 48 };
    expect(issues({ ...baby, dateOfBirth: new Date(2026, 3, 1) }, [], entry)[0].blocking).toBeTrue();
    expect(issues({ ...baby, dateOfBirth: '2026-04-01T00:00:00.000Z' }, [], entry)[0].blocking).toBeTrue();
  });
});
