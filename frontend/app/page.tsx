'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { m, trackingIn } from '@/components/ui/motion';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

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
          <m.h1
            variants={trackingIn}
            initial="hidden"
            animate="visible"
            className="font-display text-brand-800 text-5xl"
          >
            AKWÈ
          </m.h1>
          <m.p
            initial={{ y: 8 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.4, delay: 0.35, ease: 'easeOut' }}
            className="font-display text-brand-800 pt-2 text-sm"
          >
            Le carnet des tontines
          </m.p>
        </div>

        <m.div
          initial={{ y: 12 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
          className="w-full"
        >
          <div className="relative">
            {/* C'est le halo qui respire, pas le bouton : la cible tactile ne
                bouge jamais sous le doigt et reste stable pour les tests. */}
            <m.span
              aria-hidden
              className="bg-accent-500 absolute inset-0 rounded-xl"
              animate={{ scale: [1, 1.06, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            />
            <Link
              href={routes.connexion}
              className={cn(buttonVariants({ size: 'lg' }), 'relative')}
            >
              Commencer
            </Link>
          </div>
        </m.div>
      </div>
    </main>
  );
}
