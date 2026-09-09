'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { m } from '@/components/ui/motion';
import { formatMoney, formatMoneyLong } from '@/lib/format';
import { Skeleton } from '@/components/ui/states';

/**
 * Carte « Épargne total ». Le montant peut être masqué : les téléphones sont
 * partagés et une tontine se tient souvent en public.
 */
export function BalanceCard({ total, monthDelta }: { total?: number; monthDelta?: number }) {
  const [visible, setVisible] = useState(true);
  const loading = total === undefined;

  return (
    <Card className="relative overflow-hidden p-5">
      {/* L'épargne qui pousse : l'illustration des maquettes, posée à droite du
          montant. `priority` car c'est la première image vue à l'ouverture. */}
      <m.div
        aria-hidden
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="pointer-events-none absolute right-2 bottom-2 w-20"
      >
        {/* `unoptimized` : l'optimiseur d'images de Next passe par une route
            serveur, indisponible hors connexion. Le fichier est servi tel quel
            et mis en cache par le service worker. Il pèse moins de 20 ko. */}
        <Image
          src="/image1.png"
          alt=""
          width={224}
          height={150}
          priority
          unoptimized
          className="h-auto w-full object-contain"
        />
      </m.div>

      <div className="relative flex items-center gap-2">
        <p className="font-display text-brand-800 font-semibold">
          Epargne total <span className="font-sans font-normal">(Toutes caisses)</span>
        </p>
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Masquer les montants' : 'Afficher les montants'}
          aria-pressed={!visible}
          className="text-brand-600 size-touch -my-2 flex items-center justify-center"
        >
          {visible ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
        </button>
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-10 w-48" />
      ) : (
        // `pr-24` réserve la place de l'illustration : le montant ne passe
        // jamais dessous, même à sept chiffres.
        <p className="font-display text-brand-800 relative pt-2 pr-20 text-2xl">
          {visible ? formatMoneyLong(total) : '•••••• FCFA'}
        </p>
      )}

      {!loading && monthDelta !== undefined ? (
        <p className="text-accent-600 relative flex items-center gap-1 pt-1 pr-20 font-medium">
          <TrendingUp className="size-4" aria-hidden />
          {visible ? `${monthDelta >= 0 ? '+' : '−'} ${formatMoney(Math.abs(monthDelta))}` : '••••'}
          <span className="text-brand-700/80 font-normal"> ce mois</span>
        </p>
      ) : null}
    </Card>
  );
}
