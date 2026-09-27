import { growthWarnings as issues, toGrowthPoints, GrowthBaby, GrowthPoint } from './growth-plausibility.util';

const growthWarnings = (b: GrowthBaby, h: GrowthPoint[], e: GrowthPoint) => issues(b, h, e).map(i => i.text);

const d = (s: string) => new Date(`${s}T00:00:00`);
// Screenshot baby: born 1 Apr 2026, girl
const baby: GrowthBaby = { dateOfBirth: '2026-04-01', gender: 'female', birthWeight: 3.2, birthHeight: 49 };
const history = toGrowthPoints([
  { record_date: '2026-05-14', weight: '4.60', height: '55.00' },
  { record_date: '2026-07-14', weight: '6.00', height: '61.00' }
]);

describe('growth-plausibility.util', () => {
  it('ticket example: height 80 cm then 78 cm warns', () => {
    const older: GrowthBaby = { dateOfBirth: '2025-06-01', gender: 'male' };
    const w = growthWarnings(older, toGrowthPoints([{ record_date: '2026-08-01', height: 80 }]), { date: d('2026-09-01'), height: 78 });
    expect(w.length).toBe(1);
    expect(w[0]).toContain('Height cannot be lower');
  });

  it('warns on any height drop, including 1 cm', () => {
    expect(growthWarnings(baby, history, { date: d('2026-09-26'), height: 58 }).join()).toContain('Height cannot be lower');
    expect(growthWarnings(baby, history, { date: d('2026-09-26'), height: 60 }).join()).toContain('Height cannot be lower');
    expect(growthWarnings(baby, history, { date: d('2026-09-26'), height: 61 })).toEqual([]);
  });

  it('reported case: 74 -> 73 -> 72 cm warns against the tallest earlier record', () => {
    const tall: GrowthBaby = { dateOfBirth: '2025-06-01', gender: 'female' };
    const h = toGrowthPoints([{ record_date: '2026-09-20', height: 74 }, { record_date: '2026-09-25', height: 73 }]);
    const w = growthWarnings(tall, h, { date: d('2026-09-26'), height: 72 });
    expect(w.length).toBe(1);
    expect(w[0]).toContain('(74 cm on 20 Sept)');
  });

  it('warns when weight drops more than 5%', () => {
    expect(growthWarnings(baby, history, { date: d('2026-09-26'), weight: 5.5 }).join()).toContain('Weight looks lower');
  });

  it('screenshot values (34.5 cm, 3.8 kg at 6 months) are flagged', () => {
    const r = issues(baby, history, { date: d('2026-09-26'), weight: 3.8, height: 34.5 });
    expect(r.find(i => i.text.includes('34.5 cm does not look like a real'))?.blocking).toBeTrue();
    expect(r.some(i => i.text.includes('3.8 kg'))).toBeTrue();
  });

  it('reported case: 65 cm at 14 months after 74 cm names the earlier record, not the WHO range', () => {
    const minal: GrowthBaby = { dateOfBirth: '2025-07-15', gender: 'male' };
    const r = issues(minal, toGrowthPoints([{ record_date: '2026-07-26', height: 74 }]), { date: d('2026-09-26'), height: 65 });
    expect(r.length).toBe(1);
    expect(r[0].blocking).toBeTrue();
    expect(r[0].text).toContain('cannot be lower than an earlier record (74 cm');
  });

  it('far from usual but possible only warns', () => {
    const minal: GrowthBaby = { dateOfBirth: '2025-07-15', gender: 'male' };
    const r = issues(minal, [], { date: d('2026-09-26'), height: 65 });
    expect(r.length).toBe(1);
    expect(r[0].blocking).toBeFalse();
    expect(r[0].text).toContain('much lower than usual');
  });

  it('warns on 45 kg as outside WHO range, once', () => {
    const w = growthWarnings(baby, history, { date: d('2026-06-14'), weight: 45 });
    expect(w.length).toBe(1);
    expect(w[0]).toContain('does not look like a real');
  });

  it('normal gain saves silently', () => {
    expect(growthWarnings(baby, history, { date: d('2026-07-28'), weight: 6.3, height: 62 })).toEqual([]);
  });

  it('newborn weight loss under 10% is fine, over 10% warns', () => {
    const nb: GrowthBaby = { dateOfBirth: '2026-09-20', gender: 'male', birthWeight: 3.5 };
    expect(growthWarnings(nb, [], { date: d('2026-09-23'), weight: 3.25 })).toEqual([]);
    expect(growthWarnings(nb, [], { date: d('2026-09-23'), weight: 3.0 }).join()).toContain('10% below birth weight');
  });

  it('too-fast gain warns', () => {
    expect(growthWarnings(baby, history, { date: d('2026-07-24'), weight: 7.5 }).join()).toContain('faster than usual');
  });

  it('back-dated entry higher than a later record warns', () => {
    expect(growthWarnings(baby, history, { date: d('2026-06-14'), height: 63 }).join()).toContain('Height cannot be higher than a later record');
  });

  it('accepts Date and ISO datetime birth dates', () => {
    const entry = { date: d('2026-06-14'), weight: 45 };
    expect(growthWarnings({ ...baby, dateOfBirth: new Date(2026, 3, 1) }, history, entry).join()).toContain('does not look like a real');
    expect(growthWarnings({ ...baby, dateOfBirth: '2026-04-01T00:00:00.000Z' }, history, entry).join()).toContain('does not look like a real');
  });

  it('impossible values and height drops block; weight trend issues only warn', () => {
    const tall: GrowthBaby = { dateOfBirth: '2025-07-15', gender: 'female' };
    const blocked = issues(tall, [], { date: d('2026-09-26'), height: 55 });
    expect(blocked.length).toBe(1);
    expect(blocked[0].blocking).toBeTrue();
    expect(issues(baby, history, { date: d('2026-09-26'), height: 58 })[0].blocking).toBeTrue();
    expect(issues(baby, history, { date: d('2026-09-26'), weight: 5.5 }).every(i => !i.blocking)).toBeTrue();
  });
});
