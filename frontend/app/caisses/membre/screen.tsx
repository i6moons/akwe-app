'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CalendarDays, HandCoins, Pencil, Phone, Users } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { MemberIdentity } from '@/components/membre/member-identity';
import { ScoreCard } from '@/components/membre/score-card';
import { OperationRow } from '@/components/operation/operation-row';
import { Card, CardTitle, InfoRow } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useGroup, useMember, useTransactions } from '@/lib/hooks/use-akwe';
import { totalContributedBy } from '@/lib/db/repository';
import { computeScore } from '@/lib/score';
import { formatDateLong, formatMoneyLong, formatPhone } from '@/lib/format';
import { routes } from '@/lib/routes';
import { MissingParam } from '@/components/layout/screen-states';
import { useCaisseId, useMembreId } from '@/lib/hooks/use-params';

/** Lit l'identifiant dans l'adresse, puis passe la main à l'écran. */
export function FicheMembreScreen() {
  const id = useCaisseId();
  const memberId = useMembreId();
  if (!id) return <MissingParam />;
  if (!memberId) return <MissingParam what="Ce membre" />;
  return <FicheMembre id={id} memberId={memberId} />;
}

/** Maquette « iPhone 17 - 12 » — fiche membre et score AKWÈ. */
function FicheMembre({ id, memberId }: { id: string; memberId: string }) {
  const member = useMember(memberId);
  const group = useGroup(id);
  const transactions = useTransactions(id);

  const score = useMemo(
    () => (member && group && transactions ? computeScore(member, group, transactions) : null),
    [member, group, transactions],
  );

  if (member === undefined || group === undefined) {
    return (
      <main className="min-h-dvh">
        <AppHeader title="" />
        <div className="space-y-4 px-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  if (member === null || group === null) {
    return (
      <main className="min-h-dvh">
        <AppHeader title="Membre introuvable" />
        <div className="px-4">
          <ErrorState message="Ce membre n'existe plus dans cette caisse." />
        </div>
      </main>
    );
  }

  const own = (transactions ?? []).filter((item) => item.memberId === memberId).slice(0, 3);

  return (
    <main className="safe-bottom min-h-dvh space-y-4 pb-8">
      <AppHeader title="" />

      <div className="space-y-4 px-4">
        <MemberIdentity member={member} />

        <Card className="space-y-4">
          <CardTitle className="text-base">Informations générales</CardTitle>
          <div>
            <InfoRow
              icon={<Phone className="size-5" />}
              label="Téléphone"
              value={member.phone ? `+229 ${formatPhone(member.phone)}` : 'Non renseigné'}
            />
            <InfoRow
              icon={<CalendarDays className="size-5" />}
              label="Date d'entrée"
              value={formatDateLong(member.joinedAt)}
            />
            <InfoRow
              icon={<Users className="size-5" />}
              label="Membre de la caisse"
              value={group.name}
            />
          </div>

          <CardTitle className="text-base">Participations</CardTitle>
          <InfoRow
            icon={<HandCoins className="size-5" />}
            label="Total des cotisations"
            value={
              transactions ? (
                <span className="text-accent-600">
                  + {formatMoneyLong(totalContributedBy(transactions, memberId))}
                </span>
              ) : (
                '—'
              )
            }
          />
        </Card>

        <Card className="space-y-3">
          <CardTitle className="text-base">Dernières opérations</CardTitle>
          {own.length === 0 ? (
            <p className="text-brand-700/70 text-sm">Aucune opération pour ce membre.</p>
          ) : (
            <ul className="space-y-2">
              {own.map((transaction) => (
                <li key={transaction.id}>
                  <OperationRow transaction={transaction} showChevron={false} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {score ? <ScoreCard score={score} /> : <Skeleton className="h-80 w-full" />}

        <Link href={routes.modifierMembre(id, memberId)} className={buttonVariants({ size: 'lg' })}>
          <Pencil className="size-5" aria-hidden />
          Modifier le membre
        </Link>
      </div>
    </main>
  );
}
