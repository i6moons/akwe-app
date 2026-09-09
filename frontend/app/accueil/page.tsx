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
import { m, fadeUp, stagger, trackingIn, StaggerItem, StaggerList } from '@/components/ui/motion';
import { useGroupRows, useHomeSummary } from '@/lib/hooks/use-akwe';
import { useSessionName } from '@/lib/hooks/use-session-name';
import { routes } from '@/lib/routes';

/** Maquette « iPhone 17 - 4 » — vue d'ensemble de toutes les caisses. */
export default function AccueilPage() {
  const summary = useHomeSummary();
  const rows = useGroupRows();
  const name = useSessionName();

  return (
    <main className="safe-bottom relative min-h-dvh pb-8">
      {/* Profondeur derrière l'en-tête, sans un octet d'image. */}
      <div aria-hidden className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-80" />

      <div className="relative flex justify-end px-4 pt-4">
        <NavDrawer />
      </div>

      <div className="px-4">
        <m.h1 variants={trackingIn} initial="hidden" animate="visible" className="text-2xl">
          Bienvenue, {name} !
        </m.h1>
        <m.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="pt-1 text-sm text-white/70"
        >
          Voici un aperçu de vos tontines et de vos activités
        </m.p>
      </div>

      <m.div variants={stagger} initial="hidden" animate="visible" className="space-y-4 px-4 pt-5">
        <m.div variants={fadeUp}>
          <BalanceCard total={summary?.totalSavings} monthDelta={summary?.monthDelta} />
        </m.div>

        <m.div variants={fadeUp}>
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
        </m.div>

        <m.div variants={fadeUp}>
          <SyncIndicator />
        </m.div>

        <m.div variants={fadeUp}>
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
                <StaggerList className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                  {rows.map((row) => (
                    <StaggerItem key={row.group.id} className="w-44 shrink-0">
                      <GroupMiniCard {...row} />
                    </StaggerItem>
                  ))}
                </StaggerList>
              )}
            </section>
          </Card>
        </m.div>
      </m.div>
    </main>
  );
}
