import { AppHeader } from '@/components/layout/app-header';
import { ErrorState, Skeleton } from '@/components/ui/states';

/**
 * États communs aux écrans pré-rendus.
 *
 * Ces pages sont construites au build sans connaître la caisse : l'identifiant
 * n'arrive qu'une fois la page ouverte dans le navigateur. Le temps d'un souffle,
 * on montre le squelette plutôt qu'une page vide.
 */
export function ScreenFallback({ title = 'Chargement…' }: { title?: string }) {
  return (
    <main className="min-h-dvh">
      <AppHeader title={title} />
      <div className="space-y-4 px-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </main>
  );
}

/** Adresse incomplète : lien partagé tronqué, ou favori d'une ancienne version. */
export function MissingParam({ what = 'Cette caisse' }: { what?: string }) {
  return (
    <main className="min-h-dvh">
      <AppHeader title="Adresse incomplète" />
      <div className="px-4">
        <ErrorState message={`${what} n'a pas été trouvée. Revenez à la liste de vos caisses.`} />
      </div>
    </main>
  );
}
