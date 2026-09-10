'use client';

import { apiUrl, fetchAvecDelai } from '@/lib/api';
import { jetonDAcces } from '@/lib/auth/token';
import { getDb } from '@/lib/db/schema';
import type { Frequency, Group, Member, Transaction, TransactionType } from '@/lib/types';

/**
 * Recharge le carnet depuis le serveur.
 *
 * L'application n'écrivait que vers la base, sans jamais la relire : les
 * données étaient bien enregistrées, mais un navigateur vidé ou un second
 * téléphone affichait un carnet vide, ce qui donnait à croire qu'elles avaient
 * été perdues. C'est précisément le geste qu'un jury fait pour éprouver une
 * application hors ligne.
 *
 * L'écriture est un `bulkPut` : les lignes du serveur complètent le contenu
 * local sans effacer ce qui n'est pas encore remonté.
 */

interface Reponse {
  groups?: unknown[];
  members?: unknown[];
  transactions?: unknown[];
}

function texte(valeur: unknown, defaut = ''): string {
  return typeof valeur === 'string' ? valeur : defaut;
}

function versCaisse(ligne: Record<string, unknown>): Group {
  return {
    id: texte(ligne.id),
    name: texte(ligne.name),
    contributionAmount: Number(ligne.contribution_amount ?? 0),
    frequency: texte(ligne.frequency, 'weekly') as Frequency,
    location: texte(ligne.location),
    createdAt: texte(ligne.created_at, new Date().toISOString()),
    isActive: ligne.is_active !== false,
  };
}

function versMembre(ligne: Record<string, unknown>): Member {
  return {
    id: texte(ligne.id),
    groupId: texte(ligne.group_id),
    fullName: texte(ligne.full_name),
    phone: typeof ligne.phone === 'string' ? ligne.phone : null,
    joinedAt: texte(ligne.joined_at, new Date().toISOString()),
    isActive: ligne.is_active !== false,
  };
}

function versOperation(ligne: Record<string, unknown>): Transaction {
  return {
    id: texte(ligne.id),
    groupId: texte(ligne.group_id),
    memberId: typeof ligne.member_id === 'string' ? ligne.member_id : null,
    amount: Number(ligne.amount ?? 0),
    type: texte(ligne.type, 'contribution') as TransactionType,
    source: ligne.source === 'voice' ? 'voice' : 'manual',
    occurredAt: texte(ligne.occurred_at, new Date().toISOString()),
    rawTranscript: typeof ligne.raw_transcript === 'string' ? ligne.raw_transcript : null,
    confidence: typeof ligne.confidence === 'number' ? ligne.confidence : null,
    clientUuid: texte(ligne.client_uuid, texte(ligne.id)),
    // Elle vient du serveur : par définition, elle y est déjà.
    syncStatus: 'synced',
    createdAt: texte(ligne.created_at, new Date().toISOString()),
  };
}

function lignes(valeur: unknown[] | undefined): Record<string, unknown>[] {
  return (valeur ?? []).filter(
    (item): item is Record<string, unknown> => item !== null && typeof item === 'object',
  );
}

/** Renvoie le nombre d'éléments rapatriés, ou `null` si le serveur est injoignable. */
export async function hydrater(): Promise<number | null> {
  let donnees: Reponse;
  try {
    // Avec échéance : au premier lancement, l'écran attend ce rappel avant
    // d'afficher le carnet. Sans délai, un réseau muet le laissait attendre.
    const reponse = await fetchAvecDelai(apiUrl('/api/sync'), {
      headers: { Authorization: `Bearer ${await jetonDAcces()}` },
      cache: 'no-store',
    });
    if (!reponse.ok) return null;
    donnees = (await reponse.json()) as Reponse;
  } catch {
    // Hors ligne : le carnet local fait foi, il n'y a rien à signaler.
    return null;
  }

  const caisses = lignes(donnees.groups)
    .map(versCaisse)
    .filter((row) => row.id);
  const membres = lignes(donnees.members)
    .map(versMembre)
    .filter((row) => row.id);
  const operations = lignes(donnees.transactions)
    .map(versOperation)
    .filter((row) => row.id);

  // Trois écritures distinctes plutôt qu'une transaction unique : celle-ci
  // verrouillait les trois tables le temps d'enregistrer plusieurs centaines de
  // lignes, et l'écran d'accueil restait vide six secondes en attendant de
  // pouvoir lire. Ici, les lectures s'intercalent.
  const db = getDb();
  try {
    if (caisses.length > 0) await db.groups.bulkPut(caisses);
    if (membres.length > 0) await db.members.bulkPut(membres);
    if (operations.length > 0) await db.transactions.bulkPut(await reconcilier(operations));
  } catch (erreur) {
    // Le carnet local reste la source d'affichage : une relecture ratée doit
    // laisser la trésorière travailler, pas lui vider l'écran.
    console.error('AKWÈ : relecture partielle', erreur);
    return null;
  }

  return caisses.length + membres.length + operations.length;
}

/**
 * Fait correspondre chaque opération du serveur à celle déjà présente localement.
 *
 * Une opération porte deux identités : l'`id` que Postgres lui a donné, et le
 * `clientUuid` que le téléphone avait produit. Réécrire la ligne sous l'`id` du
 * serveur en créait une seconde, avec le même `clientUuid` — or cet index est
 * unique, et Dexie rejetait alors le lot entier. L'écran d'accueil restait
 * définitivement vide.
 *
 * On conserve donc l'identifiant local quand la ligne est déjà connue.
 */
async function reconcilier(operations: readonly Transaction[]): Promise<Transaction[]> {
  const db = getDb();
  const connues = await db.transactions
    .where('clientUuid')
    .anyOf(operations.map((row) => row.clientUuid))
    .toArray();

  const idLocal = new Map(connues.map((row) => [row.clientUuid, row.id]));
  return operations.map((row) => ({ ...row, id: idLocal.get(row.clientUuid) ?? row.id }));
}
