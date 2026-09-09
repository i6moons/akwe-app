import { describe, expect, it } from 'vitest';
import { normalize, parseFrenchAmount } from '@/lib/voice/french-numbers';

describe('normalize', () => {
  it('retire accents et ponctuation', () => {
    expect(normalize("Adjovi a versé 2 000 F, aujourd'hui.")).toBe(
      'adjovi a verse 2 000 f aujourd hui',
    );
  });
});

describe('parseFrenchAmount', () => {
  it('comprend les nombres dits en toutes lettres', () => {
    expect(parseFrenchAmount('Kossi a versé deux mille francs')).toBe(2000);
    expect(parseFrenchAmount('cinq mille cinq cents')).toBe(5500);
    expect(parseFrenchAmount('dix mille francs pour la cotisation')).toBe(10_000);
  });

  it('comprend les écritures chiffrées et abrégées', () => {
    expect(parseFrenchAmount('2000')).toBe(2000);
    expect(parseFrenchAmount('10.000 francs')).toBe(10_000);
    expect(parseFrenchAmount('2k')).toBe(2000);
    expect(parseFrenchAmount('3 mille')).toBe(3000);
  });

  it('ne devine jamais un montant absent', () => {
    expect(parseFrenchAmount('Adjovi a payé sa part')).toBeNull();
    expect(parseFrenchAmount('')).toBeNull();
  });

  it('retourne un entier, jamais un flottant', () => {
    const value = parseFrenchAmount('deux mille cinq cents');
    expect(value).not.toBeNull();
    expect(Number.isInteger(value)).toBe(true);
  });
});
