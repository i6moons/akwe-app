'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Check, CircleCheck, Landmark, Send, User } from 'lucide-react';
import { NavDrawer } from '@/components/layout/nav-drawer';
import { Card, CardPanel, InfoRow } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { StatusLine } from '@/components/operation/status-line';
import { getDb } from '@/lib/db/schema';
import { formatDateLong, formatSigned } from '@/lib/format';
import { directionOf, operationMeta, type Transaction } from '@/lib/types';
import { routes } from '@/lib/routes';

const SOURCE_LABELS = {
  voice: 'Saisie vocale',
  manual: 'Saisie manuelle',
  payment_webhook: 'Mobile money',
} as const;

/** Maquette « iPhone 17 - 20 » — confirmation d'enregistrement et envoi du reçu. */
export function SuccessStep({
  groupId,
  transaction,
}: {
  groupId: string;
  transaction: Transaction;
}) {
  const [memberName, setMemberName] = useState<string | null>(null);

  useEffect(() => {
    if (!transaction.memberId) return;
    void getDb()
      .members.get(transaction.memberId)
      .then((member) => setMemberName(member?.fullName ?? null));
  }, [transaction.memberId]);

  return (
    <main className="safe-bottom min-h-dvh pb-8">
      <div className="flex justify-end px-4 pt-4">
        <NavDrawer />
      </div>

      <div className="flex justify-center pt-2 pb-6">
        <span className="text-accent-500 flex size-24 items-center justify-center rounded-full bg-white">
          <Check className="size-12" strokeWidth={3} aria-hidden />
        </span>
      </div>

      <div className="px-4">
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="bg-brand-800 flex size-11 items-center justify-center rounded-full text-white">
              <User className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-brand-800 font-semibold">
                {operationMeta(transaction.type).label}
              </p>
              <p className="text-accent-600 font-bold">
                {formatSigned(transaction.amount, directionOf(transaction.type))}
              </p>
            </div>
          </div>

          <div className="border-line rounded-xl border px-3">
            <InfoRow
              icon={<User className="size-5" />}
              label="Membre :"
              value={memberName ?? '—'}
            />
            <InfoRow
              icon={<Landmark className="size-5" />}
              label="Source"
              value={SOURCE_LABELS[transaction.source]}
            />
            <InfoRow
              icon={<CalendarDays className="size-5" />}
              label="Date :"
              value={formatDateLong(transaction.occurredAt)}
            />
          </div>

          <CardPanel className="space-y-3">
            <StatusLine
              icon={<CircleCheck className="text-accent-500 size-6" />}
              title={transaction.syncStatus === 'synced' ? 'Synchronisée' : 'Enregistrée'}
              description="L'opération est enregistrée sur votre appareil et sera synchronisée avec le serveur"
            />
            <div className="border-line border-t pt-3">
              <StatusLine
                icon={<Send className="text-brand-700 size-5" />}
                title="Reçu envoyé"
                description="Le reçu a été envoyé au membre (si numéro disponible)"
              />
            </div>
          </CardPanel>

          <Link href={routes.historique(groupId)} className={buttonVariants({ size: 'lg' })}>
            Voir l&apos;opération
          </Link>
          <Link
            href={routes.accueil}
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            Retour à l&apos;accueil
          </Link>
        </Card>
      </div>
    </main>
  );
}
