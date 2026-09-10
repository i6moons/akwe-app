/**
 * Lecture et validation d'une entrée de la file d'attente hors ligne.
 *
 * Un seul endroit décide de ce qu'est une opération valide, quel que soit le
 * stockage derrière : Supabase et la mémoire de démonstration consomment les
 * mêmes lignes normalisées. Auparavant les deux chemins relisaient le payload
 * séparément et divergeaient — la mémoire ignorait le quartier, la méthode de
 * paiement et la phrase dictée, si bien que la démo ne prouvait pas ce que la
 * base ferait vraiment.
 *
 * Les valeurs sont contrôlées ici contre les mêmes ensembles que les
 * contraintes `check` du schéma : une valeur hors liste est rejetée avec une
 * phrase lisible, au lieu de partir en base et d'en revenir sous la forme d'un
 * message Postgres qui ne dit rien à la trésorière.
 */

import type { SyncBatchItem, TransactionSource, TransactionType } from '../../contracts/api';

/** `integer` PostgreSQL : au-delà, l'écriture échoue par débordement. */
const MAX_INT4 = 2_147_483_647;

export const TRANSACTION_TYPES: readonly TransactionType[] = [
  'contribution',
  'payout',
  'loan',
  'repayment',
  'fee',
];
const TRANSACTION_SOURCES: readonly TransactionSource[] = ['manual', 'voice', 'payment_webhook'];
const PAYMENT_METHODS = ['cash', 'momo', 'moov', 'celtiis', 'card'] as const;
const FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type Frequency = (typeof FREQUENCIES)[number];

export interface GroupRow {
  id: string;
  name: string;
  owner_id: string | null;
  contribution_amount: number;
  frequency: Frequency;
  location: string | null;
}

export interface MemberRow {
  id: string;
  group_id: string;
  full_name: string;
  phone: string | null;
}

export interface TransactionRow {
  /**
   * Pas d'`id` ici : la table le tire de `gen_random_uuid()` et l'unicité de
   * `client_uuid` suffit à l'idempotence. Les caisses et les membres, eux, n'ont
   * pas cette colonne et réutilisent donc le `client_uuid` comme identifiant.
   */
  client_uuid: string;
  group_id: string;
  member_id: string | null;
  amount: number;
  type: TransactionType;
  source: TransactionSource;
  method: PaymentMethod;
  raw_transcript: string | null;
  occurred_at: string;
}

export type NormalizedItem =
  | { entity: 'group'; client_uuid: string; row: GroupRow }
  | { entity: 'member'; client_uuid: string; row: MemberRow }
  | { entity: 'transaction'; client_uuid: string; row: TransactionRow };

export type Normalized = { ok: true; item: NormalizedItem } | { ok: false; reason: string };

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Montant : entier FCFA strictement positif. Jamais de flottant sur de l'argent. */
function intAmount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value <= 0 || value > MAX_INT4) return null;
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  const raw = str(value);
  return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

function isoDate(value: unknown): string | null {
  const raw = str(value);
  if (raw === null) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Le `client_uuid` reste lisible même quand le reste de l'entrée ne l'est pas. */
export function readClientUuid(raw: unknown): string {
  return str(asRecord(raw).client_uuid) ?? '';
}

function readGroup(client_uuid: string, payload: Record<string, unknown>): Normalized {
  const name = str(payload.name) ?? str(payload.full_name);
  const amount = intAmount(payload.contribution_amount ?? payload.contributionAmount);
  if (name === null) return { ok: false, reason: 'Groupe invalide : nom manquant' };
  if (amount === null) {
    return { ok: false, reason: 'Groupe invalide : cotisation entière positive requise' };
  }

  return {
    ok: true,
    item: {
      entity: 'group',
      client_uuid,
      row: {
        // L'identifiant de la caisse est la clé d'idempotence elle-même : sans
        // cela, rejouer la file ajoutait une caisse de plus à chaque envoi.
        id: str(payload.id) ?? client_uuid,
        name,
        owner_id: str(payload.owner_id) ?? str(payload.ownerId),
        contribution_amount: amount,
        frequency: oneOf(payload.frequency, FREQUENCIES) ?? 'weekly',
        location: str(payload.location),
      },
    },
  };
}

function readMember(client_uuid: string, payload: Record<string, unknown>): Normalized {
  const group_id = str(payload.group_id) ?? str(payload.groupId);
  const full_name = str(payload.full_name) ?? str(payload.fullName);
  if (group_id === null) return { ok: false, reason: 'Membre invalide : group_id manquant' };
  if (full_name === null) return { ok: false, reason: 'Membre invalide : nom manquant' };

  return {
    ok: true,
    item: {
      entity: 'member',
      client_uuid,
      row: {
        id: str(payload.id) ?? client_uuid,
        group_id,
        full_name,
        phone: str(payload.phone),
      },
    },
  };
}

function readTransaction(client_uuid: string, payload: Record<string, unknown>): Normalized {
  const group_id = str(payload.group_id) ?? str(payload.groupId);
  const amount = intAmount(payload.amount);
  if (group_id === null) return { ok: false, reason: 'Transaction invalide : group_id manquant' };
  if (amount === null) {
    return { ok: false, reason: 'Transaction invalide : entier FCFA positif requis' };
  }

  // Un `type` absent vaut cotisation, mais un type hors liste est refusé : la
  // dictée peut produire « unknown », et l'accepter reviendrait à enregistrer
  // une opération dont personne ne connaît le sens comptable.
  const rawType = payload.type;
  const type =
    rawType === undefined || rawType === null ? 'contribution' : oneOf(rawType, TRANSACTION_TYPES);
  if (type === null) {
    return { ok: false, reason: `Transaction invalide : type « ${String(rawType)} » inconnu` };
  }

  return {
    ok: true,
    item: {
      entity: 'transaction',
      client_uuid,
      row: {
        client_uuid,
        group_id,
        member_id: str(payload.member_id) ?? str(payload.memberId),
        amount,
        type,
        source: oneOf(payload.source, TRANSACTION_SOURCES) ?? 'manual',
        method: oneOf(payload.method, PAYMENT_METHODS) ?? 'cash',
        raw_transcript: str(payload.raw_transcript) ?? str(payload.rawTranscript),
        occurred_at:
          isoDate(payload.occurred_at) ?? isoDate(payload.occurredAt) ?? new Date().toISOString(),
      },
    },
  };
}

/** Relit une entrée brute du lot. N'écrit rien. */
export function normalizeItem(raw: unknown): Normalized {
  const item = asRecord(raw) as Partial<SyncBatchItem>;
  const client_uuid = str(item.client_uuid);
  if (client_uuid === null) return { ok: false, reason: 'client_uuid manquant' };

  const payload = asRecord(item.payload);
  if (item.entity === 'group') return readGroup(client_uuid, payload);
  if (item.entity === 'member') return readMember(client_uuid, payload);
  if (item.entity === 'transaction') return readTransaction(client_uuid, payload);

  return { ok: false, reason: `entité « ${String(item.entity)} » inconnue` };
}
