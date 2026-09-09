import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatMoneyLong } from '@/lib/format';
import type { Group } from '@/lib/types';
import { routes } from '@/lib/routes';

/** Vignette de caisse du carrousel « Mes caisses » sur l'accueil. */
export function GroupMiniCard({
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
      className="border-line flex h-full flex-col gap-2 rounded-xl border bg-white p-3"
    >
      <span className="bg-brand-600 flex size-9 items-center justify-center rounded-full text-white">
        <Users className="size-5" aria-hidden />
      </span>
      <span className="text-brand-800 line-clamp-2 text-sm font-bold">{group.name}</span>
      <span className="text-brand-700/80 text-xs">{memberCount} membres</span>
      <span className="text-brand-800 text-sm font-bold">{formatMoneyLong(balance)}</span>
      <span className="mt-auto flex items-center justify-between pt-1">
        {group.isActive ? <Badge tone="active">Active</Badge> : <span />}
        <ChevronRight className="text-brand-600 size-4" aria-hidden />
      </span>
    </Link>
  );
}
