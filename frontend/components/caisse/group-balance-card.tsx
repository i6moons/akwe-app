'use client';

import { useState } from 'react';
import { CalendarDays, Coins, Eye, EyeOff, MapPin, TrendingUp, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/states';
import { formatMoney, formatMoneyLong } from '@/lib/format';
import { FREQUENCY_LABELS, type Group } from '@/lib/types';

/** En-tête vert de la fiche caisse (maquette « iPhone 17 - 17 »). */
export function GroupBalanceCard({
  group,
  balance,
  monthDelta,
  memberCount,
}: {
  group: Group;
  balance?: number;
  monthDelta?: number;
  memberCount?: number;
}) {
  const [visible, setVisible] = useState(true);

  return (
    <section className="bg-brand-600 rounded-card p-4">
      <div className="flex items-center gap-3">
        <span className="bg-accent-500 text-brand-950 flex size-11 shrink-0 items-center justify-center rounded-full">
          <Coins className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-lg font-bold text-white">{group.name}</p>
          <p className="text-sm text-white/70">informations générales</p>
        </div>
        {group.isActive ? <Badge tone="synced">● Active</Badge> : null}
      </div>

      <div className="mt-4 border-t border-white/20 pt-4">
        <p className="font-display font-semibold text-white">Solde de la caisse</p>
        <div className="flex items-center justify-between gap-3">
          {balance === undefined ? (
            <Skeleton className="mt-2 h-9 w-40 bg-white/20" />
          ) : (
            <p className="text-accent-500 text-3xl font-bold tracking-tight">
              {visible ? formatMoneyLong(balance) : '•••••• FCFA'}
            </p>
          )}
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Masquer le solde' : 'Afficher le solde'}
            aria-pressed={!visible}
            className="size-touch flex items-center justify-center text-white"
          >
            {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        {monthDelta !== undefined ? (
          <p className="flex items-center gap-1 text-sm text-white/80">
            <TrendingUp className="size-4" aria-hidden />
            {monthDelta >= 0 ? '+' : '−'} {formatMoney(Math.abs(monthDelta))} ce mois
          </p>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-white/20 pt-3 text-white">
        <Fact icon={<CalendarDays className="size-4" />} label="Fréquence">
          {formatMoney(group.contributionAmount)} / {FREQUENCY_LABELS[group.frequency]}
        </Fact>
        <Fact icon={<MapPin className="size-4" />} label="Lieu">
          {group.location}
        </Fact>
        <Fact icon={<Users className="size-4" />} label="Membres">
          {memberCount ?? '—'} membres
        </Fact>
      </dl>
    </section>
  );
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[11px] text-white/70">
        <span aria-hidden>{icon}</span>
        {label}
      </dt>
      <dd className="truncate text-xs font-semibold">{children}</dd>
    </div>
  );
}
