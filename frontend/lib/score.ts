import type { CreditScore, Frequency, Group, Member, Transaction } from '@/lib/types';

/**
 * Score AKWÈ (SPEC) — fonction PURE : données en entrée, résultat en sortie.
 *
 * score = arrondi(
 *   40 × régularité
 * + 25 × min(ancienneté_mois / 24, 1)
 * + 20 × taux_de_remboursement
 * + 15 × min(total_épargné / (cotisation × 52), 1)
 * )
 *
 * Décision métier : si le membre n'a jamais emprunté, le taux de
 * remboursement vaut 1. L'absence de dette n'est pas une faute — pénaliser
 * les caisses sans prêt fausserait le score présenté aux IMF.
 */

const PERIOD_DAYS: Readonly<Record<Frequency, number>> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

export interface ScoreBreakdown {
  /** Points (entiers) issus de la régularité, max 40. */
  regularity: number;
  /** Points issus de l'ancienneté, max 25. */
  seniority: number;
  /** Points issus du remboursement, max 20. */
  repayment: number;
  /** Points issus du volume épargné, max 15. */
  volume: number;
}

export interface ScoreResult extends CreditScore {
  breakdown: ScoreBreakdown;
}

export interface ScoreInput {
  frequency: Frequency;
  /** Cotisation de la caisse, entier FCFA. */
  contributionAmount: number;
  joinedAt: string;
  transactions: readonly Pick<Transaction, 'type' | 'amount' | 'memberId'>[];
  now?: Date;
  memberId?: string;
}

export function computeScore(input: ScoreInput): ScoreResult;
export function computeScore(
  member: Member,
  group: Group,
  transactions: readonly Transaction[],
  now?: Date,
): ScoreResult;
export function computeScore(
  memberOrInput: Member | ScoreInput,
  group?: Group,
  transactions?: readonly Transaction[],
  now?: Date,
): ScoreResult {
  const input = isScoreInput(memberOrInput)
    ? memberOrInput
    : {
        frequency: group!.frequency,
        contributionAmount: group!.contributionAmount,
        joinedAt: memberOrInput.joinedAt,
        transactions: transactions ?? [],
        now,
        memberId: memberOrInput.id,
      };

  return scoreFromInput(input);
}

function isScoreInput(value: Member | ScoreInput): value is ScoreInput {
  return 'frequency' in value && 'contributionAmount' in value && 'transactions' in value;
}

function scoreFromInput(input: ScoreInput): ScoreResult {
  const now = input.now ?? new Date();
  const memberId = input.memberId ?? '';
  const own = input.memberId
    ? input.transactions.filter((item) => item.memberId === input.memberId)
    : input.transactions;

  const seniorityMonths = monthsBetween(new Date(input.joinedAt), now);

  if (own.length === 0) {
    return {
      memberId,
      score: 0,
      regularity: 0,
      seniorityMonths,
      totalSaved: 0,
      repaymentRate: 100,
      breakdown: { regularity: 0, seniority: 0, repayment: 0, volume: 0 },
    };
  }

  const contributions = own.filter((item) => item.type === 'contribution');
  const totalSaved = contributions.reduce((sum, item) => sum + item.amount, 0);

  const expected = expectedDue(input.joinedAt, input.frequency, now);
  const regularityRatio = clamp01(expected === 0 ? 0 : contributions.length / expected);

  const borrowed = own
    .filter((item) => item.type === 'loan')
    .reduce((sum, item) => sum + item.amount, 0);
  const repaid = own
    .filter((item) => item.type === 'repayment')
    .reduce((sum, item) => sum + item.amount, 0);
  const repaymentRatio = borrowed === 0 ? 1 : clamp01(repaid / borrowed);

  const contribution = Math.max(0, Math.trunc(input.contributionAmount));
  const volumeTarget = contribution * 52;
  const volumeRatio = volumeTarget === 0 ? 0 : clamp01(totalSaved / volumeTarget);
  const seniorityRatio = clamp01(seniorityMonths / 24);

  const breakdown: ScoreBreakdown = {
    regularity: Math.round(40 * regularityRatio),
    seniority: Math.round(25 * seniorityRatio),
    repayment: Math.round(20 * repaymentRatio),
    volume: Math.round(15 * volumeRatio),
  };

  const score = clampScore(
    breakdown.regularity + breakdown.seniority + breakdown.repayment + breakdown.volume,
  );

  return {
    memberId,
    score,
    regularity: Math.round(regularityRatio * 100),
    seniorityMonths,
    totalSaved,
    repaymentRate: Math.round(repaymentRatio * 100),
    breakdown,
  };
}

function expectedDue(joinedAt: string, frequency: Frequency, now: Date): number {
  const days = Math.floor((now.getTime() - new Date(joinedAt).getTime()) / 86_400_000);
  if (days <= 0) return 0;
  return Math.max(1, Math.floor(days / PERIOD_DAYS[frequency]));
}

function monthsBetween(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(0, to.getDate() >= from.getDate() ? months : months - 1);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
