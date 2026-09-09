'use client';

import { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { HistoryFilters, type HistoryFilter } from '@/components/operation/history-filters';
import { OperationRow } from '@/components/operation/operation-row';
import { HistorySummary } from '@/components/operation/history-summary';
import { Card } from '@/components/ui/card';
import { EmptyState, SkeletonList } from '@/components/ui/states';
import { useGroup, useMembers, useTransactions } from '@/lib/hooks/use-akwe';
import { groupByDay } from '@/lib/operations/group-by-day';
import { operationMeta } from '@/lib/types';
import { MissingParam } from '@/components/layout/screen-states';
import { useCaisseId } from '@/lib/hooks/use-params';

/** Nombre d'opérations rendues d'un coup. */
const PAGE_SIZE = 40;

/** Lit l'identifiant dans l'adresse, puis passe la main à l'écran. */
export function HistoriqueScreen() {
  const id = useCaisseId();
  if (!id) return <MissingParam />;
  return <Historique id={id} />;
}

/** Maquette « iPhone 17 - 9 » — historique complet d'une caisse. */
function Historique({ id }: { id: string }) {
  const group = useGroup(id);
  const members = useMembers(id);
  const transactions = useTransactions(id);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const names = useMemo(
    () => new Map((members ?? []).map((member) => [member.id, member.fullName])),
    [members],
  );

  const filtered = useMemo(() => {
    if (!transactions) return undefined;
    const needle = query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      if (filter !== 'all' && transaction.type !== filter) return false;
      if (!needle) return true;
      const name = transaction.memberId ? (names.get(transaction.memberId) ?? '') : '';
      return (
        name.toLowerCase().includes(needle) ||
        operationMeta(transaction.type).label.toLowerCase().includes(needle)
      );
    });
  }, [transactions, filter, query, names]);

  // Une caisse d'un an dépasse le millier d'opérations. On n'en rend qu'une
  // tranche : sur un Android d'entrée de gamme, tout afficher fige l'écran.
  const buckets = useMemo(
    () => (filtered ? groupByDay(filtered.slice(0, limit)) : undefined),
    [filtered, limit],
  );
  const remaining = filtered ? Math.max(0, filtered.length - limit) : 0;

  return (
    <main className="safe-bottom min-h-dvh pb-8">
      <AppHeader
        title="Historique des opérations"
        subtitle="Liste des opérations effectuées dans la caisse"
      />

      <div className="space-y-4 px-4 pt-4">
        {group ? <HistorySummary group={group} transactions={transactions} /> : null}

        <Card className="space-y-4">
          <HistoryFilters value={filter} onChange={setFilter} />

          <label htmlFor="recherche-operation" className="sr-only">
            Rechercher une opération
          </label>
          <div className="border-line flex items-center gap-3 rounded-full border px-4">
            <Search className="text-brand-700/60 size-5 shrink-0" aria-hidden />
            <input
              id="recherche-operation"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une opération…"
              className="text-field text-brand-800 placeholder:text-brand-700/50 min-h-touch w-full bg-transparent outline-none"
            />
          </div>
        </Card>

        {buckets === undefined ? (
          <SkeletonList rows={4} />
        ) : buckets.length === 0 ? (
          <EmptyState
            icon={<History className="size-9" />}
            title="Aucune opération"
            description="Enregistrez une cotisation pour voir l'historique se remplir."
          />
        ) : (
          buckets.map((bucket) => (
            <section key={bucket.key} className="space-y-2">
              <header className="flex items-center justify-between px-1">
                <h2 className="font-display font-bold text-white">{bucket.label}</h2>
                <span className="text-xs text-white/60">{bucket.fullDate}</span>
              </header>
              <ul className="space-y-2">
                {bucket.transactions.map((transaction) => (
                  <li key={transaction.id}>
                    <OperationRow
                      transaction={transaction}
                      memberName={
                        transaction.memberId ? names.get(transaction.memberId) : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {remaining > 0 ? (
          <button
            type="button"
            onClick={() => setLimit((current) => current + PAGE_SIZE)}
            className="border-accent-500 text-accent-500 min-h-touch w-full rounded-xl border font-semibold"
          >
            Voir plus ({remaining} restante{remaining > 1 ? 's' : ''})
          </button>
        ) : null}
      </div>
    </main>
  );
}
