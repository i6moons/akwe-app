import { describe, expect, it } from 'vitest';
import { parseVoiceLocal } from '../src/voice/parse';

describe('parseVoiceLocal — cas limites', () => {
  it('renvoie amount null et une clarification, pas une exception', () => {
    const parsed = parseVoiceLocal({
      transcript: 'bonjour ça va',
      group_id: 'g1',
      member_names: ['Kossi Agbodjan'],
      today: '2026-09-09',
    });
    expect(parsed.amount).toBeNull();
    expect(parsed.clarification).toMatch(/montant|francs|membre|répéter|compris/i);
  });

  it('comprend « Kossi a versé deux mille francs aujourd\'hui »', () => {
    const parsed = parseVoiceLocal({
      transcript: "Kossi a versé deux mille francs aujourd'hui",
      group_id: 'grp-ayaba',
      member_names: ['Kossi Agbodjan', 'Adjoavi Hounkpatin'],
      today: '2026-09-09',
    });
    expect(parsed.amount).toBe(2000);
    expect(parsed.type).toBe('contribution');
    expect(parsed.member_name).toBe('Kossi Agbodjan');
  });

  it('ne classe pas une phrase vide de mot-clé comme cotisation', () => {
    const parsed = parseVoiceLocal({
      transcript: 'bonjour ça va',
      group_id: 'g1',
      member_names: ['Kossi Agbodjan'],
      today: '2026-09-09',
    });
    expect(parsed.type).toBe('unknown');
  });

  it('comprend soixante-dix et quatre-vingt', () => {
    const parsed = parseVoiceLocal({
      transcript: 'Fatou a cotisé quatre-vingt-dix mille francs',
      group_id: 'g1',
      member_names: ['Fatou Diallo'],
      today: '2026-09-09',
    });
    expect(parsed.amount).toBe(90_000);
    expect(parsed.type).toBe('contribution');
  });
});
