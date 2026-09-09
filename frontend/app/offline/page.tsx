import Link from 'next/link';
import { CloudOff } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { routes } from '@/lib/routes';

/** Page servie par le service worker quand une route n'est pas encore en cache. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="flex size-24 items-center justify-center rounded-full bg-white/10 text-white">
        <CloudOff className="size-12" aria-hidden />
      </span>
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Vous êtes hors connexion</h1>
        <p className="pt-2 text-white/80">
          Vos caisses et vos opérations restent disponibles. Cette page-ci a besoin du réseau.
        </p>
      </div>
      <Link href={routes.accueil} className={buttonVariants({ size: 'lg' })}>
        Revenir à l&apos;accueil
      </Link>
    </main>
  );
}
