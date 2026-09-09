'use client';

import Link from 'next/link';
import { CalendarClock, ChevronRight, CloudOff, Users, Wallet } from 'lucide-react';
import { NavDrawer } from '@/components/layout/nav-drawer';
import { SyncIndicator } from '@/components/layout/offline-notice';
import { BalanceCard } from '@/components/home/balance-card';
import { StatTiles } from '@/components/home/stat-tiles';
import { Card, CardTitle } from '@/components/ui/card';
import { SkeletonList } from '@/components/ui/states';
import { LastActivity } from '@/components/home/last-activity';
import { GroupMiniCard } from '@/components/caisse/group-mini-card';
import { useGroupRows, useHomeSummary } from '@/lib/hooks/use-akwe';
import { useSessionName } from '@/lib/hooks/use-session-name';
import { routes } from '@/lib/routes';

/** Maquette « iPhone 17 - 4 » — vue d'ensemble de toutes les caisses. */
export default function AccueilPage() {
  const summary = useHomeSummary();
  const rows = useGroupRows();
  const name = useSessionName();

  return (
    <main className="safe-bottom min-h-dvh pb-8">
      <div className="flex justify-end px-4 pt-4">
        <NavDrawer />
      </div>

      <div className="px-4">
        <h1 className="font-display text-2xl font-bold text-white">Bienvenue, {name} !</h1>
        <p className="pt-1 text-sm text-white/70">
          Voici un aperçu de vos tontines et de vos activités
        </p>
      </div>

      <div className="space-y-4 px-4 pt-5">
        <BalanceCard total={summary?.totalSavings} monthDelta={summary?.monthDelta} />

        <StatTiles
          stats={[
            {
              value: summary?.activeGroups,
              label: 'Caisses actives',
              icon: <Wallet className="size-5" />,
            },
            { value: summary?.memberCount, label: 'Membres', icon: <Users className="size-5" /> },
            {
              value: summary?.monthOperations,
              label: 'Opérations ce mois',
              icon: <CalendarClock className="size-5" />,
            },
            {
              value: summary?.pendingOperations,
              label: 'Opérations en attente',
              icon: <CloudOff className="size-5" />,
            },
          ]}
        />

        <SyncIndicator />

        <Card className="space-y-4">
          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <CardTitle className="text-base">Dernière activité</CardTitle>
              <Link href={routes.operations} className="text-accent-600 text-sm font-semibold">
                Voir tout
              </Link>
            </header>
            <LastActivity />
          </section>

          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <CardTitle className="text-base">Mes caisses</CardTitle>
              <Link href={routes.caisses} className="text-accent-600 text-sm font-semibold">
                Voir tout
              </Link>
            </header>

            {rows === undefined ? (
              <SkeletonList rows={2} />
            ) : rows.length === 0 ? (
              <Link
                href={routes.nouvelleCaisse}
                className="border-line text-brand-700 min-h-touch flex items-center justify-between rounded-xl border border-dashed px-4"
              >
                Créer votre première caisse
                <ChevronRight className="size-5" aria-hidden />
              </Link>
            ) : (
              <ul className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                {rows.map((row) => (
                  <li key={row.group.id} className="w-44 shrink-0">
                    <GroupMiniCard {...row} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Card>
      </div>
    </main>
  );
}
