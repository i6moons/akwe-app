import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatMoney, formatMoneyLong } from '@/lib/format';
import { FREQUENCY_LABELS, type Group } from '@/lib/types';
import { routes } from '@/lib/routes';

export function groupSubtitle(group: Group, memberCount: number): string {
  const frequency = FREQUENCY_LABELS[group.frequency];
  return `${group.location} · ${memberCount} membres · ${formatMoney(group.contributionAmount)} / ${frequency}`;
}

/** Ligne de la liste « Mes caisses » (maquette « iPhone 17 - 5 »). */
export function GroupRow({
  group,
  memberCount,
  balance,
}: {
  group: Group;
  memberCount: number;
  balance: number;
}) {
  return (
    <Link
      href={routes.caisse(group.id)}
      className="bg-surface rounded-card flex items-center gap-3 p-4 transition-all duration-200 ease-out hover:shadow-md active:scale-[0.99]"
    >
      <span className="bg-brand-600 flex size-12 shrink-0 items-center justify-center rounded-full text-white">
        <Users className="size-6" aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        {/* Les noms de tontines sont longs : on les laisse passer à la ligne
            plutôt que de les tronquer, la trésorière doit les reconnaître. */}
        <span className="text-brand-800 block leading-tight font-bold">{group.name}</span>
        <span className="text-brand-700/80 block text-[11px] leading-tight">
          {groupSubtitle(group, memberCount)}
        </span>
        {group.isActive ? (
          <Badge tone="active" className="mt-1">
            Active
          </Badge>
        ) : null}
      </span>

      <span className="border-line shrink-0 border-l pl-2 text-right">
        <span className="text-brand-700/80 block text-[11px]">Solde</span>
        <span className="text-brand-800 block text-sm font-bold">{formatMoneyLong(balance)}</span>
      </span>

      <ChevronRight className="text-brand-600 size-5 shrink-0" aria-hidden />
    </Link>
  );
}
