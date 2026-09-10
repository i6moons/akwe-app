import { describe, expect, it } from 'vitest';
import { detectType, extractDraft, matchMember, pickBestTranscript } from '@/lib/voice/extract';
import type { Member } from '@/lib/types';

function member(id: string, fullName: string): Member {
  return {
    id,
    groupId: 'g1',
    fullName,
    phone: null,
    joinedAt: '2026-01-01T00:00:00Z',
    isActive: true,
  };
}

const MEMBERS = [
  member('m1', 'Adjovi Sébastien'),
  member('m2', 'Kossi Agbodjan'),
  member('m3', 'Bernadette Gbaguidi'),
];

describe('matchMember', () => {
  it('rapproche un nom entendu du membre le plus proche', () => {
    expect(matchMember('Adjovi a versé deux mille', MEMBERS)?.id).toBe('m1');
    expect(matchMember('Kossi a payé', MEMBERS)?.id).toBe('m2');
  });

  it('tolère les orthographes variables des noms béninois', () => {
    // Adjoavi / Adjovi et Kossy / Kossi sont la même personne à l'oral.
    expect(matchMember('Adjoavi a donné mille francs', MEMBERS)?.id).toBe('m1');
    expect(matchMember('Kossy a versé', MEMBERS)?.id).toBe('m2');
  });

  it('renvoie null plutôt que de choisir au hasard', () => {
    expect(matchMember('Quelqu un a versé', MEMBERS)).toBeNull();
  });

  it('ne prend pas un mot courant pour un prénom', () => {
    expect(matchMember('mille francs pour la cotisation', MEMBERS)).toBeNull();
  });

  it('recolle les syllabes cassées par Chrome (« à jovi » → Adjovi)', () => {
    expect(matchMember('a jovi a donné dix mille francs', MEMBERS)?.id).toBe('m1');
  });

  it('ne tranche pas quand deux membres portent le même prénom', () => {
    const proches = [...MEMBERS, member('m4', 'Adjovi Hounkpatin')];
    expect(matchMember('Adjovi a versé deux mille', proches)).toBeNull();
  });
});

describe('pickBestTranscript', () => {
  const names = MEMBERS.map((item) => item.fullName);

  it('choisit l’hypothèse Web Speech qui contient un vrai prénom', () => {
    expect(
      pickBestTranscript(['aussi a versé deux mille', 'Kossi a versé deux mille'], names),
    ).toBe('Kossi a versé deux mille');
  });

  it('garde la première hypothèse si aucune ne colle', () => {
    expect(pickBestTranscript(['bonjour', 'merci'], names)).toBe('bonjour');
  });
});

describe('detectType', () => {
  it('reconnaît les tournures courantes', () => {
    expect(detectType('Kossi a versé deux mille francs')).toBe('contribution');
    expect(detectType('Adjovi a remboursé son prêt')).toBe('repayment');
    expect(detectType('on a payé des frais de réunion')).toBe('fee');
  });

  it('renvoie null quand la phrase ne dit rien du type', () => {
    expect(detectType('deux mille francs')).toBeNull();
  });
});

describe('extractDraft', () => {
  const now = new Date('2026-04-12T10:00:00Z');

  it('structure une phrase complète avec une confiance haute', () => {
    const draft = extractDraft('Kossi a versé deux mille francs aujourd’hui', 'g1', MEMBERS, now);

    expect(draft.memberId).toBe('m2');
    expect(draft.amount).toBe(2000);
    expect(draft.type).toBe('contribution');
    expect(draft.source).toBe('voice');
    expect(draft.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('abaisse la confiance quand le montant manque', () => {
    const draft = extractDraft('Kossi a versé sa cotisation', 'g1', MEMBERS, now);

    expect(draft.amount).toBeNull();
    expect(draft.confidence).toBeLessThan(0.7);
  });

  it('comprend « hier » et « avant-hier »', () => {
    const hier = extractDraft('Kossi a versé deux mille francs hier', 'g1', MEMBERS, now);
    expect(new Date(hier.occurredAt).getDate()).toBe(11);

    const avantHier = extractDraft('Kossi a versé deux mille avant-hier', 'g1', MEMBERS, now);
    expect(new Date(avantHier.occurredAt).getDate()).toBe(10);
  });

  it('conserve la phrase dictée pour l’audit', () => {
    const phrase = 'Kossi a versé deux mille francs';
    expect(extractDraft(phrase, 'g1', MEMBERS, now).rawTranscript).toBe(phrase);
  });

  it('structure une dictée typique de Chrome, noms abîmés compris', () => {
    const draft = extractDraft(
      'a jovi a donné dix mille francs pour la cotisation',
      'g1',
      MEMBERS,
      now,
    );
    expect(draft.memberId).toBe('m1');
    expect(draft.amount).toBe(10_000);
    expect(draft.type).toBe('contribution');
  });
});
