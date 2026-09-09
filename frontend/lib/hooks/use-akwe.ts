'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/db/schema';
import { balanceOf, listMembers, listTransactions } from '@/lib/db/repository';
import type { Group, Member, Transaction } from '@/lib/types';

/**
 * Lectures réactives sur IndexedDB.
 * `undefined` signifie « chargement en cours », un tableau vide signifie « aucune
 * donnée » : les écrans distinguent les deux états, comme l'impose le .cursorrules.
 */

export function useGroups(): Group[] | undefined {
  return useLiveQuery(() => getDb().groups.toArray(), []);
}

export function useGroup(groupId: string): Group | undefined | null {
  return useLiveQuery(async () => (await getDb().groups.get(groupId)) ?? null, [groupId]);
}

export function useMembers(groupId: string): Member[] | undefined {
  return useLiveQuery(() => listMembers(groupId), [groupId]);
}

export function useMember(memberId: string): Member | undefined | null {
  return useLiveQuery(async () => (await getDb().members.get(memberId)) ?? null, [memberId]);
}

export function useTransactions(groupId: string): Transaction[] | undefined {
  return useLiveQuery(() => listTransactions(groupId), [groupId]);
}

export interface GroupSummary {
  balance: number;
  memberCount: number;
  transactionCount: number;
}

export function useGroupSummary(groupId: string): GroupSummary | undefined {
  return useLiveQuery(async () => {
    const [transactions, members] = await Promise.all([
      listTransactions(groupId),
      listMembers(groupId),
    ]);
    return {
      balance: balanceOf(transactions),
      memberCount: members.filter((member) => member.isActive).length,
      transactionCount: transactions.length,
    };
  }, [groupId]);
}

/** Toutes les opérations, toutes caisses confondues, les plus récentes d'abord. */
export function useAllTransactions(): Transaction[] | undefined {
  return useLiveQuery(() => getDb().transactions.orderBy('occurredAt').reverse().toArray(), []);
}

/** Table « identifiant → nom » de tous les membres, pour afficher les noms. */
export function useMemberNames(): Map<string, string> | undefined {
  return useLiveQuery(async () => {
    const members = await getDb().members.toArray();
    return new Map(members.map((member) => [member.id, member.fullName]));
  }, []);
}

/** Opération la plus récente, toutes caisses confondues. `null` = aucune. */
export function useLatestTransaction(): Transaction | undefined | null {
  return useLiveQuery(async () => {
    const rows = await getDb().transactions.orderBy('occurredAt').reverse().limit(1).toArray();
    return rows[0] ?? null;
  }, []);
}

export interface GroupRowData {
  group: Group;
  memberCount: number;
  balance: number;
}

/** Caisses enrichies de leur solde et de leur effectif, pour les listes. */
export function useGroupRows(): GroupRowData[] | undefined {
  return useLiveQuery(async () => {
    const db = getDb();
    const [groups, members, transactions] = await Promise.all([
      db.groups.toArray(),
      db.members.toArray(),
      db.transactions.toArray(),
    ]);

    return groups.map((group) => ({
      group,
      memberCount: members.filter((member) => member.groupId === group.id && member.isActive)
        .length,
      balance: balanceOf(transactions.filter((item) => item.groupId === group.id)),
    }));
  }, []);
}

/** Agrégats de l'écran d'accueil, toutes caisses confondues. */
export function useHomeSummary() {
  return useLiveQuery(async () => {
    const db = getDb();
    const [groups, members, transactions, pending] = await Promise.all([
      db.groups.toArray(),
      db.members.toArray(),
      db.transactions.toArray(),
      db.outbox.where('status').anyOf('pending', 'failed').count(),
    ]);

    const now = new Date();
    const thisMonth = transactions.filter((item) => {
      const date = new Date(item.occurredAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    return {
      totalSavings: balanceOf(transactions),
      monthDelta: balanceOf(thisMonth),
      activeGroups: groups.filter((group) => group.isActive).length,
      memberCount: members.filter((member) => member.isActive).length,
      monthOperations: thisMonth.length,
      pendingOperations: pending,
    };
  }, []);
}
