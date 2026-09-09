'use client';

import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { HistoryFilters, type HistoryFilter } from '@/components/operation/history-filters';
import { OperationRow } from '@/components/operation/operation-row';
import { SyncIndicator } from '@/components/layout/offline-notice';
import { Card } from '@/components/ui/card';
import { Reveal } from '@/components/ui/motion';
import { EmptyState, SkeletonList } from '@/components/ui/states';
import { useAllTransactions, useMemberNames } from '@/lib/hooks/use-akwe';
import { groupByDay } from '@/lib/operations/group-by-day';

/** Historique global, toutes caisses confondues (accessible depuis le menu). */
export default function ToutesOperationsPage() {
  const transactions = useAllTransactions();
  const names = useMemberNames();
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const buckets = useMemo(() => {
    if (!transactions) return undefined;
    const filtered =
      filter === 'all'
        ? transactions
        : transactions.filter((transaction) => transaction.type === filter);
    return groupByDay(filtered);
  }, [transactions, filter]);

  return (
    <main className="safe-bottom min-h-dvh pb-8">
      <AppHeader
        title="Toutes les opérations"
        subtitle="Historique de l'ensemble de vos caisses"
        back={false}
      />

      <div className="space-y-4 px-4 pt-4">
        <SyncIndicator />

        <Card>
          <HistoryFilters value={filter} onChange={setFilter} />
        </Card>

        {buckets === undefined ? (
          <SkeletonList rows={4} />
        ) : buckets.length === 0 ? (
          <EmptyState
            icon={<History className="size-9" />}
            title="Aucune opération"
            description="Vos enregistrements apparaîtront ici, même ceux faits hors connexion."
          />
        ) : (
          buckets.map((bucket) => (
            <Reveal key={bucket.key}>
              <section className="space-y-2">
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
                          transaction.memberId ? names?.get(transaction.memberId) : undefined
                        }
                        showChevron={false}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          ))
        )}
      </div>
    </main>
  );
}
