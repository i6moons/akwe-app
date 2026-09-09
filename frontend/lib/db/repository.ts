import { getDb } from '@/lib/db/schema';
import { enqueue } from '@/lib/sync/outbox';
import { clientUuid } from '@/lib/utils';
import { directionOf, type Group, type Member, type Transaction } from '@/lib/types';
import type { OperationDraft } from '@/lib/types';

/**
 * Toute écriture suit le même chemin : IndexedDB d'abord (l'écran réagit
 * immédiatement), puis la file d'attente de synchronisation. Aucun appel réseau
 * direct n'est fait ici.
 */

export async function createTransaction(draft: OperationDraft): Promise<Transaction> {
  if (draft.amount === null || draft.amount <= 0) {
    throw new Error('Montant invalide : un montant doit être un entier de FCFA supérieur à zéro.');
  }

  const transaction: Transaction = {
    id: clientUuid(),
    groupId: draft.groupId,
    memberId: draft.memberId,
    amount: Math.trunc(draft.amount),
    type: draft.type,
    source: draft.source,
    occurredAt: draft.occurredAt,
    rawTranscript: draft.rawTranscript,
    confidence: draft.confidence,
    clientUuid: clientUuid(),
    syncStatus: 'pending',
    createdAt: new Date().toISOString(),
  };

  await getDb().transactions.add(transaction);
  await enqueue('transaction', 'create', transaction.clientUuid, transaction);
  return transaction;
}

export async function createGroup(
  input: Omit<Group, 'id' | 'createdAt' | 'isActive'>,
): Promise<Group> {
  const group: Group = {
    ...input,
    id: clientUuid(),
    createdAt: new Date().toISOString(),
    isActive: true,
  };
  await getDb().groups.add(group);
  await enqueue('group', 'create', group.id, group);
  return group;
}

export async function createMember(
  input: Omit<Member, 'id' | 'isActive'> & { isActive?: boolean },
): Promise<Member> {
  const member: Member = { isActive: true, ...input, id: clientUuid() };
  await getDb().members.add(member);
  await enqueue('member', 'create', member.id, member);
  return member;
}

export async function updateMember(id: string, changes: Partial<Member>): Promise<void> {
  await getDb().members.update(id, changes);
  const member = await getDb().members.get(id);
  if (member) await enqueue('member', 'update', `${id}:${Date.now()}`, member);
}

export async function listGroups(): Promise<Group[]> {
  return getDb().groups.toArray();
}

export async function listMembers(groupId: string): Promise<Member[]> {
  return getDb().members.where('groupId').equals(groupId).toArray();
}

export async function listTransactions(groupId: string): Promise<Transaction[]> {
  const rows = await getDb().transactions.where('groupId').equals(groupId).toArray();
  return rows.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

/** Solde d'une caisse : somme des entrées moins somme des sorties, en entiers FCFA. */
export function balanceOf(transactions: readonly Transaction[]): number {
  return transactions.reduce(
    (total, item) => total + (directionOf(item.type) === 'in' ? item.amount : -item.amount),
    0,
  );
}

/** Variation du solde sur le mois en cours, affichée sous le solde total. */
export function monthlyDelta(transactions: readonly Transaction[], now = new Date()): number {
  const month = now.getMonth();
  const year = now.getFullYear();
  const inMonth = transactions.filter((item) => {
    const date = new Date(item.occurredAt);
    return date.getMonth() === month && date.getFullYear() === year;
  });
  return balanceOf(inMonth);
}

/** Total cotisé par un membre : ce que la banque regardera un jour. */
export function totalContributedBy(transactions: readonly Transaction[], memberId: string): number {
  return transactions
    .filter((item) => item.memberId === memberId && directionOf(item.type) === 'in')
    .reduce((total, item) => total + item.amount, 0);
}
