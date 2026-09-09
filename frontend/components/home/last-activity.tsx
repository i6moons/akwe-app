'use client';

import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import { CardPanel } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/states';
import { formatMoneyLong, formatRelative } from '@/lib/format';
import { groupSubtitle } from '@/components/caisse/group-row';
import { useGroupRows, useLatestTransaction } from '@/lib/hooks/use-akwe';
import { routes } from '@/lib/routes';

/** Bloc « Dernière activité » de l'accueil : la caisse touchée le plus récemment. */
export function LastActivity() {
  const latest = useLatestTransaction();
  const rows = useGroupRows();

  if (latest === undefined || rows === undefined) return <Skeleton className="h-20 w-full" />;

  if (latest === null) {
    return (
      <CardPanel className="text-brand-700/70 text-sm">
        Aucune opération pour le moment. Enregistrez la première cotisation de votre caisse.
      </CardPanel>
    );
  }

  const row = rows.find((item) => item.group.id === latest.groupId);
  if (!row) return null;

  return (
    <Link
      href={routes.caisse(row.group.id)}
      className="bg-surface-2 flex items-center gap-3 rounded-xl p-3"
    >
      <span className="bg-brand-600 flex size-12 shrink-0 items-center justify-center rounded-full text-white">
        <Users className="size-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-display text-brand-800 block truncate font-bold">
          {row.group.name}
        </span>
        <span className="text-brand-700/70 block truncate text-xs">
          {groupSubtitle(row.group, row.memberCount)}
        </span>
        <span className="font-display text-brand-800 block pt-1 text-sm font-bold">
          {formatMoneyLong(row.balance)}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="text-brand-700/70 block text-xs">{formatRelative(latest.occurredAt)}</span>
        <ChevronRight className="text-brand-600 ml-auto size-5" aria-hidden />
      </span>
    </Link>
  );
}
