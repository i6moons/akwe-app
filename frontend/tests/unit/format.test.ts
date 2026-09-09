import { describe, expect, it } from 'vitest';
import {
  formatDayLabel,
  formatMoney,
  formatMoneyLong,
  formatPhone,
  formatSigned,
  parseAmount,
} from '@/lib/format';

describe('formatage monétaire', () => {
  it('formate un entier en FCFA avec des espaces', () => {
    expect(formatMoney(865_000)).toMatch(/865.000 F$/);
    expect(formatMoneyLong(2000)).toMatch(/2.000 FCFA$/);
  });

  it('tronque toute valeur à virgule : l’argent est un entier', () => {
    expect(formatMoney(2000.99)).toBe(formatMoney(2000));
  });

  it('préfixe le montant selon le sens de l’opération', () => {
    expect(formatSigned(2000, 'in')).toMatch(/^\+ /);
    expect(formatSigned(2000, 'out')).toMatch(/^- /);
  });
});

describe('parseAmount', () => {
  it('accepte les écritures courantes des utilisatrices', () => {
    expect(parseAmount('2000')).toBe(2000);
    expect(parseAmount('2 000')).toBe(2000);
    expect(parseAmount('10.000')).toBe(10_000);
    expect(parseAmount('2000 f')).toBe(2000);
  });

  it('refuse ce qui n’est pas un montant exploitable', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('0')).toBeNull();
  });
});

describe('formatPhone', () => {
  it('groupe les chiffres par deux et retire l’indicatif', () => {
    expect(formatPhone('0190000001')).toBe('01 90 00 00 01');
    expect(formatPhone('+229 01 90 00 00 01')).toBe('01 90 00 00 01');
  });
});

describe('formatDayLabel', () => {
  const now = new Date('2026-04-12T12:00:00Z');

  it('nomme les trois derniers jours en toutes lettres', () => {
    expect(formatDayLabel(new Date('2026-04-12T08:00:00Z'), now)).toBe("Aujourd'hui");
    expect(formatDayLabel(new Date('2026-04-11T08:00:00Z'), now)).toBe('Hier');
    expect(formatDayLabel(new Date('2026-04-10T08:00:00Z'), now)).toBe('Avant-hier');
  });

  it('affiche la date au-delà', () => {
    expect(formatDayLabel(new Date('2026-04-01T08:00:00Z'), now)).toMatch(/avril/);
  });
});
