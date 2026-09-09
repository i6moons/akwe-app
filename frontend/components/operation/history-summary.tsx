import { balanceOf } from '@/lib/db/repository';
import { formatMoneyLong } from '@/lib/format';
import { directionOf, FREQUENCY_LABELS, type Group, type Transaction } from '@/lib/types';
import { Skeleton } from '@/components/ui/states';

/** Bandeau vert en tête de l'historique : solde, entrées et dépenses du mois. */
export function HistorySummary({
  group,
  transactions,
}: {
  group: Group;
  transactions?: readonly Transaction[];
}) {
  if (!transactions) return <Skeleton className="h-32 w-full" />;

  const now = new Date();
  const thisMonth = transactions.filter((item) => {
    const date = new Date(item.occurredAt);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const income = thisMonth
    .filter((item) => directionOf(item.type) === 'in')
    .reduce((total, item) => total + item.amount, 0);
  const expenses = thisMonth
    .filter((item) => directionOf(item.type) === 'out')
    .reduce((total, item) => total + item.amount, 0);

  return (
    <section className="bg-brand-900 rounded-card flex flex-wrap gap-4 p-4">
      <div className="min-w-40 flex-1">
        <p className="font-display text-lg font-bold text-white">{group.name}</p>
        <p className="text-xs text-white/70">
          {group.location} · cotisation par {FREQUENCY_LABELS[group.frequency]}
        </p>
        <p className="pt-3 text-sm text-white/80">Solde de la caisse</p>
        <p className="text-accent-500 text-2xl font-bold tracking-tight">
          {formatMoneyLong(balanceOf(transactions))}
        </p>
      </div>

      <dl className="bg-brand-700 min-w-36 rounded-xl p-3 text-sm">
        <dt className="text-white/70">Ce mois-ci</dt>
        <dd className="text-accent-500 font-semibold">+ {formatMoneyLong(income)}</dd>
        <dt className="pt-2 text-white/70">Dépenses</dt>
        <dd className="text-danger-500 font-semibold">- {formatMoneyLong(expenses)}</dd>
      </dl>
    </section>
  );
}
