import { describe, expect, it } from 'vitest';
import { computeScore } from '@/lib/score';
import type { Group, Member, Transaction } from '@/lib/types';

const NOW = new Date('2026-04-12T10:00:00Z');
const DAY = 86_400_000;

const group: Group = {
  id: 'g1',
  name: 'Tontine Ayaba',
  contributionAmount: 2000,
  frequency: 'weekly',
  location: 'Godomey',
  createdAt: '2025-10-12T00:00:00Z',
  isActive: true,
};

const member: Member = {
  id: 'm1',
  groupId: 'g1',
  fullName: 'Kossi Agbodjan',
  phone: null,
  // Six mois d'ancienneté à la date de référence.
  joinedAt: new Date(NOW.getTime() - 182 * DAY).toISOString(),
  isActive: true,
};

function contribution(weeksAgo: number): Transaction {
  return {
    id: `t${weeksAgo}`,
    groupId: 'g1',
    memberId: 'm1',
    amount: 2000,
    type: 'contribution',
    source: 'manual',
    occurredAt: new Date(NOW.getTime() - weeksAgo * 7 * DAY).toISOString(),
    rawTranscript: null,
    confidence: null,
    clientUuid: `c${weeksAgo}`,
    syncStatus: 'synced',
    createdAt: NOW.toISOString(),
  };
}

describe('computeScore', () => {
  it('récompense une cotisation sans faute', () => {
    const transactions = Array.from({ length: 26 }, (_, index) => contribution(index));
    const score = computeScore(member, group, transactions, NOW);

    expect(score.regularity).toBe(100);
    expect(score.seniorityMonths).toBe(6);
    expect(score.totalSaved).toBe(52_000);
    // 40×1 + 25×(6/24) + 20×1 + 15×(52000/104000) = 73,75 → 74
    expect(score.score).toBe(74);
    expect(score.breakdown).toEqual({
      regularity: 40,
      seniority: 6,
      repayment: 20,
      volume: 8,
    });
  });

  it('pénalise les absences de cotisation', () => {
    const assidue = computeScore(
      member,
      group,
      Array.from({ length: 26 }, (_, index) => contribution(index)),
      NOW,
    );
    const irreguliere = computeScore(
      member,
      group,
      Array.from({ length: 8 }, (_, index) => contribution(index)),
      NOW,
    );

    expect(irreguliere.score).toBeLessThan(assidue.score);
    expect(irreguliere.regularity).toBeLessThan(50);
  });

  it('reste borné entre 0 et 100', () => {
    const vide = computeScore(member, group, [], NOW);
    expect(vide.score).toBeGreaterThanOrEqual(0);

    const enorme = Array.from({ length: 200 }, (_, index) => contribution(index));
    expect(computeScore(member, group, enorme, NOW).score).toBeLessThanOrEqual(100);
  });

  it('considère un prêt intégralement remboursé comme un remboursement parfait', () => {
    const loan: Transaction = { ...contribution(3), id: 'l1', type: 'loan', amount: 20_000 };
    const repayment: Transaction = {
      ...contribution(1),
      id: 'r1',
      type: 'repayment',
      amount: 20_000,
    };

    const score = computeScore(member, group, [loan, repayment], NOW);
    expect(score.repaymentRate).toBe(100);
  });

  it('produit un score entier : aucun flottant ne sort de la fonction', () => {
    const score = computeScore(member, group, [contribution(1)], NOW);
    expect(Number.isInteger(score.score)).toBe(true);
    expect(Number.isInteger(score.totalSaved)).toBe(true);
  });
});
