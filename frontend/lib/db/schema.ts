import Dexie, { type EntityTable } from 'dexie';
import type { Group, Member, Transaction } from '@/lib/types';

/**
 * File d'attente de synchronisation.
 * `clientUuid` est la clé d'idempotence : le serveur fait un upsert dessus, ce qui
 * rend un rejeu de la file sans effet de bord.
 */
export interface OutboxEntry {
  id?: number;
  clientUuid: string;
  entity: 'transaction' | 'member' | 'group';
  operation: 'create' | 'update';
  payload: string;
  status: 'pending' | 'sending' | 'failed';
  attempts: number;
  lastError: string | null;
  /**
   * Vrai quand le serveur a nommément refusé l'opération, par opposition à un
   * échec de transport. Le premier ne se résoudra jamais tout seul et doit être
   * montré à la trésorière ; le second repartira au retour du réseau.
   *
   * Champ non indexé : Dexie l'accepte sans changement de version du schéma.
   */
  refusedByServer?: boolean;
  createdAt: string;
}

export class AkweDatabase extends Dexie {
  groups!: EntityTable<Group, 'id'>;
  members!: EntityTable<Member, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  outbox!: EntityTable<OutboxEntry, 'id'>;

  constructor() {
    super('akwe');
    this.version(1).stores({
      groups: 'id, name, isActive',
      members: 'id, groupId, fullName, isActive',
      transactions: 'id, groupId, memberId, occurredAt, syncStatus, &clientUuid',
      outbox: '++id, &clientUuid, status, createdAt',
    });
  }
}

/**
 * Instance unique. Dexie ne doit jamais être construit côté serveur : le rendu
 * initial des pages App Router s'exécute dans Node, où `indexedDB` n'existe pas.
 */
let instance: AkweDatabase | null = null;

export function getDb(): AkweDatabase {
  if (typeof window === 'undefined') {
    throw new Error("AKWÈ : IndexedDB n'est pas disponible côté serveur.");
  }
  instance ??= new AkweDatabase();
  return instance;
}

/** Réservé aux tests : repart d'une base vierge. */
export function resetDbForTests(): void {
  instance = null;
}
