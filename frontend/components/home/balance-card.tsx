'use client';

import { useState } from 'react';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
      <div className="flex items-center gap-2">
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
        <p className="font-display text-brand-800 pt-2 text-3xl font-bold">
          {visible ? formatMoneyLong(total) : '•••••• FCFA'}
        </p>
      )}

      {!loading && monthDelta !== undefined ? (
        <p className="text-accent-600 flex items-center gap-1 pt-1 font-medium">
          <TrendingUp className="size-4" aria-hidden />
          {visible ? `${monthDelta >= 0 ? '+' : '−'} ${formatMoney(Math.abs(monthDelta))}` : '••••'}
          <span className="text-brand-700/70 font-normal"> ce mois</span>
        </p>
      ) : null}
    </Card>
  );
}
