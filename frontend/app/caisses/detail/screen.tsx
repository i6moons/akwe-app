'use client';

import Link from 'next/link';
import { ChevronRight, History, Mic, Pencil } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { GroupBalanceCard } from '@/components/caisse/group-balance-card';
import { ActionRow } from '@/components/ui/action-row';
import { Card, CardTitle, InfoRow } from '@/components/ui/card';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { SyncIndicator } from '@/components/layout/offline-notice';
import { useGroup, useGroupSummary, useTransactions } from '@/lib/hooks/use-akwe';
import { monthlyDelta } from '@/lib/db/repository';
import { formatDateLong, formatMoney } from '@/lib/format';
import { FREQUENCY_LABELS } from '@/lib/types';
import { routes } from '@/lib/routes';
import { MissingParam } from '@/components/layout/screen-states';
import { useCaisseId } from '@/lib/hooks/use-params';

/** Lit l'identifiant dans l'adresse, puis passe la main à l'écran. */
export function CaisseDetailScreen() {
  const id = useCaisseId();
  if (!id) return <MissingParam />;
  return <CaisseDetail id={id} />;
}

/** Maquette « iPhone 17 - 17 » — fiche d'une caisse. */
function CaisseDetail({ id }: { id: string }) {
  const group = useGroup(id);
  const summary = useGroupSummary(id);
  const transactions = useTransactions(id);

  if (group === undefined) {
    return (
      <main className="min-h-dvh">
        <AppHeader title="Chargement…" />
        <div className="space-y-4 px-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </main>
    );
  }

  if (group === null) {
    return (
      <main className="min-h-dvh">
        <AppHeader title="Caisse introuvable" />
        <div className="px-4">
          <ErrorState message="Cette caisse n'existe pas ou a été supprimée." />
        </div>
      </main>
    );
  }

  return (
    <main className="safe-bottom min-h-dvh space-y-4 pb-8">
      <AppHeader title={group.name} subtitle="Ici se trouve les informations liés à votre caisse" />

      <div className="space-y-4 px-4 lg:grid lg:grid-cols-5 lg:items-start lg:gap-4 lg:space-y-0">
        <div className="space-y-4 lg:col-span-3">
          <GroupBalanceCard
            group={group}
            balance={summary?.balance}
            monthDelta={transactions ? monthlyDelta(transactions) : undefined}
            memberCount={summary?.memberCount}
          />

          <SyncIndicator />

          <Card className="space-y-4">
            <CardTitle className="text-base">Informations générales</CardTitle>
            <div>
              <InfoRow label="Nom de caisse :" value={group.name} />
              <InfoRow
                label="Fréquence de cotisation :"
                value={`${formatMoney(group.contributionAmount)} / ${FREQUENCY_LABELS[group.frequency]}`}
              />
              <InfoRow label="Lieu indiqué :" value={group.location} />
              <InfoRow label="Date de création :" value={formatDateLong(group.createdAt)} />
            </div>

            <Link
              href={routes.membres(id)}
              className="bg-brand-800 min-h-touch flex items-center justify-between rounded-[8px] px-4 font-semibold text-white"
            >
              Membres ({summary?.memberCount ?? '—'})
              <ChevronRight className="size-5" aria-hidden />
            </Link>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <ActionRow
            href={routes.saisieVocale(id)}
            icon={<Mic className="size-6" />}
            title="Enregistrez une opération"
            description="Parlez simplement, l'IA s'occupe du reste"
          />

          <ActionRow
            href={routes.saisieManuelle(id)}
            icon={<Pencil className="size-6" />}
            title="Saisir manuellement"
            description="Sans micro, en deux taps"
          />

          <ActionRow
            href={routes.historique(id)}
            icon={<History className="size-6" />}
            title="Historique des opérations"
            description="Veuillez trouver la liste de vos opérations"
          />
        </div>
      </div>
    </main>
  );
}
