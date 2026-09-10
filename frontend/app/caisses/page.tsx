'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Wallet } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { GroupRow } from '@/components/caisse/group-row';
import { Button, buttonVariants } from '@/components/ui/button';
import { FixedAction } from '@/components/ui/fixed-action';
import { EmptyState, SkeletonList } from '@/components/ui/states';
import { StaggerItem, StaggerList } from '@/components/ui/motion';
import { useGroupRows } from '@/lib/hooks/use-akwe';
import { routes } from '@/lib/routes';

/** Maquette « iPhone 17 - 5 » — liste des caisses avec recherche. */
export default function CaissesPage() {
  const rows = useGroupRows();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!rows) return undefined;
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      ({ group }) =>
        group.name.toLowerCase().includes(needle) || group.location.toLowerCase().includes(needle),
    );
  }, [rows, query]);

  return (
    <main className="safe-bottom flex min-h-dvh flex-col pb-6">
      <AppHeader
        title="MES CAISSES"
        subtitle="Voici la liste des différentes caisses auxquelles vous êtes rattachée."
        back={false}
      />

      <div className="px-4 pt-10">
        <label htmlFor="recherche-caisse" className="sr-only">
          Rechercher une caisse
        </label>
        <div className="bg-surface flex items-center gap-3 rounded-[8px] px-4">
          <Search className="text-brand-700/80 size-5 shrink-0" aria-hidden />
          <input
            id="recherche-caisse"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une caisse"
            className="text-field text-brand-800 placeholder:text-brand-700/50 min-h-touch w-full bg-transparent outline-none"
          />
        </div>
      </div>

      <div className="flex-1 space-y-3 px-4 pt-6 lg:flex-none">
        {filtered === undefined ? (
          <SkeletonList rows={3} />
        ) : filtered.length === 0 ? (
          <EmptyState
            className="rounded-[8px]"
            icon={<Wallet className="size-9" />}
            title={query ? 'Aucune caisse trouvée' : 'Aucune caisse pour le moment'}
            description={
              query
                ? 'Vérifiez le nom que vous avez tapé.'
                : 'Commencez par créer votre première caisse.'
            }
            action={
              query ? (
                <Button variant="outline" onClick={() => setQuery('')}>
                  Effacer la recherche
                </Button>
              ) : undefined
            }
          />
        ) : (
          <StaggerList className="space-y-3 xl:grid xl:grid-cols-2 xl:gap-3 xl:space-y-0">
            {filtered.map((row) => (
              <StaggerItem key={row.group.id}>
                <GroupRow {...row} />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>

      <FixedAction>
        <Link href={routes.nouvelleCaisse} className={buttonVariants({ size: 'lg' })}>
          <Plus className="size-5" aria-hidden />
          Nouvelle caisse
        </Link>
      </FixedAction>
    </main>
  );
}
