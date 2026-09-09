/**
 * Types métier AKWÈ.
 * Ils reprennent à l'identique le schéma Supabase de `SPEC.md` : toute divergence
 * casserait la synchronisation. Les montants sont des entiers de FCFA.
 */

export type TransactionType = 'contribution' | 'repayment' | 'payout' | 'loan' | 'fee';
export type TransactionSource = 'manual' | 'voice' | 'payment_webhook';
export type SyncStatus = 'pending' | 'synced' | 'failed';
export type Frequency = 'daily' | 'weekly' | 'monthly';

/** Sens de l'opération : une entrée augmente le solde de la caisse, une sortie le diminue. */
export type Direction = 'in' | 'out';

export interface OperationTypeMeta {
  readonly type: TransactionType;
  readonly label: string;
  readonly direction: Direction;
}

export const OPERATION_TYPES: readonly OperationTypeMeta[] = [
  { type: 'contribution', label: 'Cotisation', direction: 'in' },
  { type: 'repayment', label: 'Remboursement', direction: 'in' },
  { type: 'payout', label: 'Versement', direction: 'out' },
  { type: 'loan', label: 'Prêt', direction: 'out' },
  { type: 'fee', label: 'Frais', direction: 'out' },
] as const;

export function operationMeta(type: TransactionType): OperationTypeMeta {
  return OPERATION_TYPES.find((meta) => meta.type === type) ?? OPERATION_TYPES[0]!;
}

export function directionOf(type: TransactionType): Direction {
  return operationMeta(type).direction;
}

export const FREQUENCY_LABELS: Readonly<Record<Frequency, string>> = {
  daily: 'jour',
  weekly: 'semaine',
  monthly: 'mois',
};

export interface Group {
  id: string;
  name: string;
  /** Montant de la cotisation, entier FCFA. */
  contributionAmount: number;
  frequency: Frequency;
  location: string;
  createdAt: string;
  isActive: boolean;
}

export interface Member {
  id: string;
  groupId: string;
  fullName: string;
  phone: string | null;
  joinedAt: string;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  groupId: string;
  memberId: string | null;
  /** Entier FCFA, toujours positif : le sens est porté par `type`. */
  amount: number;
  type: TransactionType;
  source: TransactionSource;
  occurredAt: string;
  /** Phrase dictée conservée pour l'audit d'une saisie vocale. */
  rawTranscript: string | null;
  /** Confiance de l'IA entre 0 et 1. Sous 0.7, l'écran de confirmation alerte. */
  confidence: number | null;
  clientUuid: string;
  syncStatus: SyncStatus;
  createdAt: string;
}

/** Brouillon issu de la saisie vocale ou manuelle, avant confirmation par la trésorière. */
export interface OperationDraft {
  groupId: string;
  memberId: string | null;
  memberName: string | null;
  amount: number | null;
  type: TransactionType;
  occurredAt: string;
  source: TransactionSource;
  rawTranscript: string | null;
  confidence: number | null;
}

/** Score AKWÈ d'un membre, présentable à une institution de microfinance. */
export interface CreditScore {
  memberId: string;
  score: number;
  regularity: number;
  seniorityMonths: number;
  totalSaved: number;
  repaymentRate: number;
}
