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

  it('comprend soixante-dix et quatre-vingt, y compris avec traits d’union', () => {
    expect(parseFrenchAmount('soixante-dix mille francs')).toBe(70_000);
    expect(parseFrenchAmount('soixante et onze mille')).toBe(71_000);
    expect(parseFrenchAmount('quatre-vingt mille')).toBe(80_000);
    expect(parseFrenchAmount('quatre-vingt-dix mille')).toBe(90_000);
    expect(parseFrenchAmount('quatre-vingt-quinze mille')).toBe(95_000);
    expect(parseFrenchAmount('vingt-cinq mille francs')).toBe(25_000);
  });

  it('prend le montant en francs, pas un chiffre parasite', () => {
    expect(parseFrenchAmount('membre 3 a versé 2000 francs')).toBe(2000);
    expect(parseFrenchAmount('le 10 Adjovi a donné 10.000 F')).toBe(10_000);
  });

  it('ne devine jamais un montant absent', () => {
    expect(parseFrenchAmount('Adjovi a payé sa part')).toBeNull();
    expect(parseFrenchAmount('')).toBeNull();
    expect(parseFrenchAmount('un membre a versé sa part')).toBeNull();
  });

  it('retourne un entier, jamais un flottant', () => {
    const value = parseFrenchAmount('deux mille cinq cents');
    expect(value).not.toBeNull();
    expect(Number.isInteger(value)).toBe(true);
  });

  it('ne mélange pas deux nombres qui ne se suivent pas', () => {
    // « deux » compte des membres, « trois mille » est le montant.
    expect(parseFrenchAmount('deux membres ont donné trois mille francs')).toBe(3000);
    expect(parseFrenchAmount('les trois du groupe ont versé cinq mille')).toBe(5000);
  });

  it('refuse un montant à décimales plutôt que de le décupler', () => {
    // La ponctuation devenait une espace : « 2.5 » se lisait « 2 5 », donc 25.
    expect(parseFrenchAmount('Adjovi a payé 2.5 francs')).toBeNull();
    expect(parseFrenchAmount('Adjovi a payé 2,5 francs')).toBeNull();
  });

  it('lit le montant même précédé d’une date à décimales', () => {
    expect(parseFrenchAmount('reunion du 12.03, elle a versé 2000 francs')).toBe(2000);
  });

  it('refuse un montant que la colonne entière ne peut pas stocker', () => {
    expect(parseFrenchAmount('9 999 999 999 francs')).toBeNull();
    expect(parseFrenchAmount('deux millions de francs')).toBe(2_000_000);
  });
});
