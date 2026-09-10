'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Check, CircleCheck, Landmark, Send, Share2, User } from 'lucide-react';
import { NavDrawer } from '@/components/layout/nav-drawer';
import { Card, CardPanel, InfoRow } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { StatusLine } from '@/components/operation/status-line';
import { FieldError } from '@/components/ui/field';
import { useRecu, SOURCE_LABELS } from '@/lib/hooks/use-recu';
import { construireMessageRecu, lienWhatsApp } from '@/lib/recu/message';
import { partagerRecu } from '@/lib/recu/partage';
import { formatDateLong, formatSigned } from '@/lib/format';
import { directionOf, operationMeta, type Transaction } from '@/lib/types';
import { routes } from '@/lib/routes';

/** Maquette « iPhone 17 - 20 » — confirmation d'enregistrement et envoi du reçu. */
export function SuccessStep({
  groupId,
  transaction,
}: {
  groupId: string;
  transaction: Transaction;
}) {
  const { donnees, fichier, phone } = useRecu(groupId, transaction);
  const [note, setNote] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function transferer(): Promise<void> {
    if (!donnees) return;
    setErreur(null);
    const texte = construireMessageRecu(donnees);

    // Le dessin a échoué : on part avec le texte seul plutôt que de bloquer la
    // trésorière, qui a un membre devant elle qui attend sa preuve.
    if (!fichier) {
      window.open(lienWhatsApp(phone, texte), '_blank', 'noopener,noreferrer');
      return;
    }

    const resultat = await partagerRecu(fichier, texte, phone);
    if (resultat === 'telecharge') {
      setNote('Reçu enregistré dans vos images. Joignez-le à la conversation WhatsApp ouverte.');
    } else if (resultat === 'echec') {
      setErreur("Le partage n'a pas abouti. Réessayez.");
    }
  }

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
              value={donnees?.membre ?? '—'}
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
                title="Transfert de reçu"
                description={
                  phone
                    ? 'Envoyez le reçu au membre par WhatsApp, en image.'
                    : "Ce membre n'a pas de numéro : vous choisirez le destinataire."
                }
              />
            </div>
          </CardPanel>

          {note ? <p className="text-muted text-sm">{note}</p> : null}
          <FieldError id="erreur-recu" message={erreur} />

          <Button size="lg" onClick={() => void transferer()} disabled={!donnees}>
            <Share2 className="size-5" aria-hidden />
            Transférer le reçu
          </Button>
          <Link
            href={routes.historique(groupId)}
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            Voir l&apos;opération
          </Link>
        </Card>
      </div>
    </main>
  );
}
