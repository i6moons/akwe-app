import { describe, expect, it } from 'vitest';
import { extractAmount } from '../src/voice/french-numbers';
import { readLlmPayload } from '../src/voice/llm';
import { parseVoiceLocal } from '../src/voice/parse';

describe('extractAmount', () => {
  it('ne mélange pas deux nombres qui ne se suivent pas', () => {
    // « deux » compte des membres, « trois mille » est le montant.
    expect(extractAmount('deux membres ont donné trois mille francs')).toBe(3000);
  });

  it('refuse un montant à décimales plutôt que de le décupler', () => {
    expect(extractAmount('Fatou a payé 2.5 francs')).toBeNull();
    expect(extractAmount('Fatou a payé 2,5 francs')).toBeNull();
  });

  it('lit le point comme séparateur de milliers', () => {
    expect(extractAmount('elle a versé 3.000 francs')).toBe(3000);
    expect(extractAmount('elle a versé 2 000 f')).toBe(2000);
  });

  it('lit un montant même précédé d’une date à décimales', () => {
    expect(extractAmount('reunion du 12.03, elle a verse 2000 francs')).toBe(2000);
  });

  it('garde les formes dictées usuelles', () => {
    expect(extractAmount('cinq mille')).toBe(5000);
    expect(extractAmount('quatre-vingt-dix mille francs')).toBe(90_000);
    expect(extractAmount('six cents francs')).toBe(600);
    expect(extractAmount('il a pris 5 k')).toBe(5000);
  });

  it('préfère se taire qu’inventer sur un nombre nu et petit', () => {
    expect(extractAmount('cinq')).toBeNull();
    expect(extractAmount('bonjour ça va')).toBeNull();
  });
});

describe('date dictée', () => {
  const phrase = (transcript: string) =>
    parseVoiceLocal({
      transcript,
      group_id: 'g1',
      member_names: ['Kossi Agbodjan'],
      today: '2026-09-10',
    }).occurred_at;

  it('comprend hier et avant-hier', () => {
    expect(phrase('Kossi a versé mille francs hier')).toBe('2026-09-09T12:00:00.000Z');
    expect(phrase('Kossi a versé mille francs avant-hier')).toBe('2026-09-08T12:00:00.000Z');
  });

  it('date à midi UTC pour que le jour tienne en heure béninoise', () => {
    expect(phrase("Kossi a versé mille francs aujourd'hui")).toBe('2026-09-10T12:00:00.000Z');
  });
});

describe('readLlmPayload', () => {
  it('ramène un type inventé à « unknown » au lieu de le laisser filer en base', () => {
    expect(readLlmPayload({ type: 'cadeau' }).type).toBe('unknown');
    expect(readLlmPayload({ type: 'repayment' }).type).toBe('repayment');
  });

  it('borne la confiance entre 0 et 1', () => {
    expect(readLlmPayload({ confidence: 12 }).confidence).toBe(1);
    expect(readLlmPayload({ confidence: -3 }).confidence).toBe(0);
    expect(readLlmPayload({ confidence: 'haute' }).confidence).toBe(0.5);
  });

  it('n’accepte qu’un montant entier positif', () => {
    expect(readLlmPayload({ amount: 12.5 }).amount).toBeNull();
    expect(readLlmPayload({ amount: -100 }).amount).toBeNull();
    expect(readLlmPayload({ amount: '2000' }).amount).toBeNull();
    expect(readLlmPayload({ amount: 2000 }).amount).toBe(2000);
  });

  it('rejette une date illisible', () => {
    expect(readLlmPayload({ occurred_at: 'hier soir' }).occurred_at).toBeNull();
    expect(readLlmPayload({ occurred_at: '2026-09-09' }).occurred_at).toBe(
      '2026-09-09T00:00:00.000Z',
    );
  });

  it('supporte une réponse vide sans lever d’exception', () => {
    expect(readLlmPayload(null)).toMatchObject({
      member_name: null,
      amount: null,
      type: 'unknown',
      occurred_at: null,
      clarification: null,
    });
  });
});
