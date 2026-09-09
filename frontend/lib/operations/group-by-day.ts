import { formatDateLong, formatDayLabel } from '@/lib/format';
import type { Transaction } from '@/lib/types';

export interface DayBucket {
  key: string;
  /** « Aujourd'hui », « Hier », « Avant-hier » ou la date courte. */
  label: string;
  /** Date complète affichée à droite du séparateur. */
  fullDate: string;
  transactions: Transaction[];
}

/**
 * Regroupe les opérations par journée, les plus récentes d'abord.
 * L'historique d'une tontine se lit par jour de collecte, pas en liste continue.
 */
export function groupByDay(
  transactions: readonly Transaction[],
  now: Date = new Date(),
): DayBucket[] {
  const buckets = new Map<string, DayBucket>();

  for (const transaction of transactions) {
    const date = new Date(transaction.occurredAt);
    const key = date.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.transactions.push(transaction);
    } else {
      buckets.set(key, {
        key,
        label: formatDayLabel(date, now),
        fullDate: formatDateLong(date),
        transactions: [transaction],
      });
    }
  }

  return [...buckets.values()]
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((bucket) => ({
      ...bucket,
      transactions: bucket.transactions.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    }));
}
