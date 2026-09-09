import { describe, expect, it } from 'vitest';
import { demoResponse, isDemoTranscript, validateModelPayload } from '@/lib/voice/schema';

const members = [
  { id: 'grp-ayaba-m5', full_name: 'Kossi Agbodjan' },
  { id: 'grp-ayaba-m4', full_name: 'Adjoavi Hounkpatin' },
];

describe('voice schema', () => {
  it('reconnaît la phrase de démo', () => {
    expect(isDemoTranscript("Kossi a versé deux mille francs aujourd'hui")).toBe(true);
    const demo = demoResponse('2026-09-09', members);
    expect(demo.amount).toBe(2000);
    expect(demo.type).toBe('contribution');
    expect(demo.member_id).toBe('grp-ayaba-m5');
  });

  it('une phrase vide ou floue donne amount null et une clarification', () => {
    const parsed = validateModelPayload(
      { member_name: null, amount: null, type: 'unknown', confidence: 0.1 },
      members,
      '2026-09-09',
    );
    expect(parsed.amount).toBeNull();
    expect(parsed.clarification).toBeTruthy();
  });
});
