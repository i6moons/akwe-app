import { describe, expect, it } from 'vitest';
import {
  demoResponse,
  isDemoTranscript,
  validateModelPayload,
  validateType,
} from '@/lib/voice/schema';

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

  it('accepte les cinq types de la base, pas seulement trois', () => {
    // « a remboursé » et « frais » devenaient `unknown` : la liste locale n'en
    // connaissait que trois, alors que la base et la dictée en acceptent cinq.
    expect(validateType('contribution')).toBe('contribution');
    expect(validateType('repayment')).toBe('repayment');
    expect(validateType('payout')).toBe('payout');
    expect(validateType('loan')).toBe('loan');
    expect(validateType('fee')).toBe('fee');
  });

  it('ramène tout libellé inventé à « unknown »', () => {
    expect(validateType('cadeau')).toBe('unknown');
    expect(validateType(42)).toBe('unknown');
    expect(validateType(null)).toBe('unknown');
  });
});
