import { SelfCareService, SelfCareTip } from './self-care.service';

describe('SelfCareService.pickTip', () => {
  const svc = new SelfCareService({ get: () => ({ pipe: () => ({}) }) } as any);

  const tips: SelfCareTip[] = [
    { id: '1', category: 'c', title: 'both-morning', text: 't', timeOfDay: 'Morning', audience: 'both' },
    { id: '2', category: 'c', title: 'preg-morning', text: 't', timeOfDay: 'Morning', audience: 'pregnant' },
    { id: '3', category: 'c', title: 'mom-morning', text: 't', timeOfDay: 'Morning', audience: 'new_mom' },
    { id: '4', category: 'c', title: 'mom-evening', text: 't', timeOfDay: 'Evening', audience: 'new_mom' },
  ];

  it('gives a pregnant mother only pregnant + both tips', () => {
    for (let i = 0; i < 20; i++) {
      const t = svc.pickTip(tips, 'Morning', true)!;
      expect(['both', 'pregnant']).toContain(t.audience);
    }
  });

  it('gives a new mom only new_mom + both tips', () => {
    for (let i = 0; i < 20; i++) {
      const t = svc.pickTip(tips, 'Morning', false)!;
      expect(['both', 'new_mom']).toContain(t.audience);
    }
  });

  it('falls back to any tip in the block if no stage match', () => {
    // Evening has only a new_mom tip; a pregnant mother should still get it (fallback).
    const t = svc.pickTip(tips, 'Evening', true);
    expect(t?.title).toBe('mom-evening');
  });

  it('returns null when the block has no tips', () => {
    expect(svc.pickTip(tips, 'Midnight', false)).toBeNull();
  });
});
