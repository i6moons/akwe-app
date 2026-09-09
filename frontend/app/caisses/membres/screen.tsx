'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Users } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { MemberRow } from '@/components/membre/member-row';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { FixedAction } from '@/components/ui/fixed-action';
import { EmptyState, SkeletonList } from '@/components/ui/states';
import { StaggerItem, StaggerList } from '@/components/ui/motion';
import { useMembers } from '@/lib/hooks/use-akwe';
import { routes } from '@/lib/routes';
import { MissingParam } from '@/components/layout/screen-states';
import { useCaisseId } from '@/lib/hooks/use-params';

/** Lit l'identifiant dans l'adresse, puis passe la main à l'écran. */
export function MembresListeScreen() {
  const id = useCaisseId();
  if (!id) return <MissingParam />;
  return <MembresListe id={id} />;
}

/** Maquettes « iPhone 17 - 10 / 14 / 16 » — liste, recherche et état vide. */
function MembresListe({ id }: { id: string }) {
  const members = useMembers(id);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!members) return undefined;
    const active = members.filter((member) => member.isActive);
    const needle = query.trim().toLowerCase();
    if (!needle) return active;
    return active.filter((member) => member.fullName.toLowerCase().includes(needle));
  }, [members, query]);

  const countLabel = query
    ? `${filtered?.length ?? 0} résultat${(filtered?.length ?? 0) > 1 ? 's' : ''}`
    : `${filtered?.length ?? 0} membre${(filtered?.length ?? 0) > 1 ? 's' : ''} actif${(filtered?.length ?? 0) > 1 ? 's' : ''}`;

  return (
    <main className="safe-bottom flex min-h-dvh flex-col pb-6">
      <AppHeader
        title="Liste des membres"
        subtitle="Ici se trouve la liste des membres de votre caisse"
      />

      <div className="px-4 pt-6">
        <label htmlFor="recherche-membre" className="sr-only">
          Rechercher un membre
        </label>
        <div className="bg-surface rounded-card flex items-center gap-3 px-4">
          <Search className="text-brand-700/80 size-5 shrink-0" aria-hidden />
          <input
            id="recherche-membre"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un membre"
            className="text-field text-brand-800 placeholder:text-brand-700/50 min-h-touch w-full bg-transparent outline-none"
          />
        </div>
      </div>

      <p className="px-4 pt-5 text-sm font-medium text-white">{countLabel}</p>

      <div className="flex-1 px-4 pt-2">
        {filtered === undefined ? (
          <SkeletonList rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="size-9" />}
            title={query ? 'Aucun membre trouvé' : 'Aucun membre pour le moment'}
            description={
              query ? (
                'Vérifiez le nom que vous avez tapé.'
              ) : (
                <>
                  Commencer par ajouter <strong>les premiers membres</strong> de{' '}
                  <strong>votre caisse</strong>.
                </>
              )
            }
            action={
              query ? (
                <Button variant="outline" onClick={() => setQuery('')}>
                  Effacer la recherche
                </Button>
              ) : (
                <Link
                  href={routes.nouveauMembre(id)}
                  className={buttonVariants({ variant: 'primary' })}
                >
                  <Plus className="size-5" aria-hidden />
                  Ajouter un membre
                </Link>
              )
            }
          />
        ) : (
          <Card className="py-0">
            <StaggerList>
              {filtered.map((member) => (
                <StaggerItem key={member.id}>
                  <MemberRow member={member} />
                </StaggerItem>
              ))}
            </StaggerList>
          </Card>
        )}
      </div>

      <FixedAction>
        <Link href={routes.nouveauMembre(id)} className={buttonVariants({ size: 'lg' })}>
          <Plus className="size-5" aria-hidden />
          Ajouter un membre
        </Link>
      </FixedAction>
    </main>
  );
}
