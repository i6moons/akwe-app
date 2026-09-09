import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { routes } from '@/lib/routes';

/**
 * Écran d'ouverture (maquette « iPhone 17 - 1 »).
 * Les deux triangles verts en diagonale sont dessinés en CSS : pas d'image à
 * télécharger, l'écran s'affiche instantanément même en 3G.
 */
export default function SplashPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-white">
      <div
        aria-hidden
        className="bg-brand-800 absolute inset-x-0 top-0 h-[32%]"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 0)' }}
      />
      <div
        aria-hidden
        className="bg-brand-800 absolute inset-x-0 bottom-0 h-[32%]"
        style={{ clipPath: 'polygon(0 100%, 0 0, 100% 100%)' }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        <div>
          <h1 className="font-display text-brand-800 text-5xl font-bold tracking-wide">AKWÈ</h1>
          <p className="font-display text-brand-800 pt-2 text-sm font-semibold">
            Le carnet des tontines
          </p>
        </div>

        <Link href={routes.connexion} className={buttonVariants({ size: 'lg' })}>
          Commencer
        </Link>
      </div>
    </main>
  );
}
