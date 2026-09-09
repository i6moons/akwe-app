import { getDb } from '@/lib/db/schema';
import { clientUuid } from '@/lib/utils';
import type { Group, Member, Transaction, TransactionType } from '@/lib/types';

/**
 * Jeu de démonstration.
 * Des noms béninois réels et huit semaines d'historique : une démo peuplée de
 * « test1 / membre2 » coûte des points devant un jury local.
 */

const GROUPS: readonly Omit<Group, 'createdAt'>[] = [
  {
    id: 'grp-ayaba',
    name: 'Tontine Ayaba',
    contributionAmount: 2000,
    frequency: 'weekly',
    location: 'Godomey',
    isActive: true,
  },
  {
    id: 'grp-fete',
    name: 'Tontine cotisation fête',
    contributionAmount: 3000,
    frequency: 'monthly',
    location: 'Cotonou',
    isActive: true,
  },
  {
    id: 'grp-voyage',
    name: 'Tontine voyage karth',
    contributionAmount: 9000,
    frequency: 'weekly',
    location: 'Godomey',
    isActive: true,
  },
];

const AYABA_MEMBERS = [
  'Adjovi Sébastien',
  'Akoba Djimon',
  'Kataline Swim',
  'Akim Lyon',
  'Adjoavi Hounkpatin',
  'Kossi Agbodjan',
  'Afiavi Dossou',
  'Bernadette Gbaguidi',
  'Rachidatou Alassane',
  'Mahougnon Sossou',
  'Chantal Ahouandjinou',
  'Yaovi Zinsou',
] as const;

const OTHER_MEMBERS = ['Adjovi Sébastien', 'Akoba Djimon', 'Kataline Swim', 'Akim Lyon'] as const;

const WEEKS_OF_HISTORY = 8;
const DAY_MS = 86_400_000;

function daysAgo(days: number, hour = 10): string {
  const date = new Date(Date.now() - days * DAY_MS);
  date.setHours(hour, 30, 0, 0);
  return date.toISOString();
}

function makeMembers(groupId: string, names: readonly string[]): Member[] {
  return names.map((fullName, index) => ({
    id: `${groupId}-m${index}`,
    groupId,
    fullName,
    phone: index % 3 === 0 ? `019000000${index}` : null,
    joinedAt: daysAgo(WEEKS_OF_HISTORY * 7 + 3),
    isActive: true,
  }));
}

function makeTransaction(
  groupId: string,
  memberId: string,
  amount: number,
  type: TransactionType,
  occurredAt: string,
  source: Transaction['source'],
): Transaction {
  return {
    id: clientUuid(),
    groupId,
    memberId,
    amount,
    type,
    source,
    occurredAt,
    rawTranscript: source === 'voice' ? null : null,
    confidence: null,
    clientUuid: clientUuid(),
    syncStatus: 'synced',
    createdAt: occurredAt,
  };
}

function makeHistory(group: Omit<Group, 'createdAt'>, members: readonly Member[]): Transaction[] {
  const rows: Transaction[] = [];

  for (let week = WEEKS_OF_HISTORY; week >= 1; week -= 1) {
    members.forEach((member, index) => {
      // Une absence occasionnelle rend l'historique crédible et fait varier le score.
      if ((week + index) % 11 === 0) return;
      const source = index % 4 === 0 ? 'voice' : 'manual';
      rows.push(
        makeTransaction(
          group.id,
          member.id,
          group.contributionAmount,
          'contribution',
          daysAgo(week * 7 - (index % 3), 8 + (index % 6)),
          source,
        ),
      );
    });
  }

  const borrower = members[1];
  if (borrower) {
    rows.push(makeTransaction(group.id, borrower.id, 20_000, 'loan', daysAgo(21, 9), 'manual'));
    rows.push(makeTransaction(group.id, borrower.id, 20_000, 'repayment', daysAgo(7, 9), 'manual'));
  }

  return rows;
}

/** Remplit la base locale si elle est vide. Sans effet si des données existent déjà. */
export async function seedDemoData(): Promise<void> {
  const db = getDb();
  if ((await db.groups.count()) > 0) return;

  const createdAt = daysAgo(WEEKS_OF_HISTORY * 7 + 5);
  const members: Member[] = [];
  const transactions: Transaction[] = [];

  for (const group of GROUPS) {
    const names = group.id === 'grp-ayaba' ? AYABA_MEMBERS : OTHER_MEMBERS;
    const groupMembers = makeMembers(group.id, names);
    members.push(...groupMembers);
    transactions.push(...makeHistory(group, groupMembers));
  }

  await db.transaction('rw', db.groups, db.members, db.transactions, async () => {
    await db.groups.bulkAdd(GROUPS.map((group) => ({ ...group, createdAt })));
    await db.members.bulkAdd(members);
    await db.transactions.bulkAdd(transactions);
  });
}
