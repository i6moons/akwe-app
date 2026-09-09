import {
  directionOf,
  type CreditScore,
  type Group,
  type Member,
  type Transaction,
} from '@/lib/types';

/**
 * Score AKWÈ — la brique qui transforme une épargne informelle en historique
 * présentable à une institution de microfinance.
 *
 * Quatre composantes, pondérées et bornées à 100 :
 *   régularité 50 · ancienneté 20 · remboursement 20 · volume épargné 10
 *
 * Tout est calculé en entiers de FCFA. Les ratios restent internes à cette
 * fonction et ne sortent jamais sous forme de montant.
 */

const WEIGHTS = { regularity: 50, seniority: 20, repayment: 20, volume: 10 } as const;
const MAX_SENIORITY_MONTHS = 12;
const VOLUME_TARGET_FCFA = 100_000;
const PERIOD_DAYS = { daily: 1, weekly: 7, monthly: 30 } as const;

export function computeScore(
  member: Member,
  group: Group,
  transactions: readonly Transaction[],
  now: Date = new Date(),
): CreditScore {
  const own = transactions.filter((item) => item.memberId === member.id);

  const contributions = own.filter((item) => item.type === 'contribution');
  const totalSaved = own
    .filter((item) => directionOf(item.type) === 'in')
    .reduce((total, item) => total + item.amount, 0);

  const seniorityMonths = monthsBetween(new Date(member.joinedAt), now);
  const expected = expectedContributions(member.joinedAt, group.frequency, now);
  const regularity = expected === 0 ? 1 : clamp01(contributions.length / expected);

  const loans = own.filter((item) => item.type === 'loan');
  const repayments = own.filter((item) => item.type === 'repayment');
  const borrowed = loans.reduce((total, item) => total + item.amount, 0);
  const repaid = repayments.reduce((total, item) => total + item.amount, 0);
  const repaymentRate = borrowed === 0 ? 1 : clamp01(repaid / borrowed);

  const score =
    WEIGHTS.regularity * regularity +
    WEIGHTS.seniority * clamp01(seniorityMonths / MAX_SENIORITY_MONTHS) +
    WEIGHTS.repayment * repaymentRate +
    WEIGHTS.volume * clamp01(totalSaved / VOLUME_TARGET_FCFA);

  return {
    memberId: member.id,
    score: Math.max(0, Math.min(100, Math.round(score))),
    regularity: Math.round(regularity * 100),
    seniorityMonths,
    totalSaved,
    repaymentRate: Math.round(repaymentRate * 100),
  };
}

/** Nombre de cotisations attendues depuis l'entrée du membre dans la caisse. */
function expectedContributions(joinedAt: string, frequency: Group['frequency'], now: Date): number {
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
