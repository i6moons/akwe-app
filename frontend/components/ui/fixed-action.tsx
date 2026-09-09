import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Barre d'action principale.
 *
 * Sur un téléphone tenu à une main, le bas de l'écran est la seule zone
 * atteignable sans se contorsionner : le bouton qui valide, enregistre ou
 * supprime y reste ancré quelle que soit la longueur du formulaire. Le fond
 * reprend le vert de l'application plutôt qu'un bandeau blanc, qui se lirait
 * comme un élément étranger sur un écran vert foncé.
 *
 * Sur un grand écran, ce raisonnement tombe : la souris atteint tout, et une
 * barre collée en bas de la fenêtre, loin du formulaire, perd son lien avec
 * lui. Le bouton reprend donc sa place dans le flux, sous les champs.
 */
export function FixedAction({
  children,
  className,
  /** Hauteur réservée sur téléphone pour que rien ne passe sous la barre. */
  spacer = true,
}: {
  children: ReactNode;
  className?: string;
  spacer?: boolean;
}) {
  return (
    <>
      {spacer ? <div aria-hidden className="h-24 lg:hidden" /> : null}
      <div
        className={cn(
          'bg-brand-800/95 fixed inset-x-0 bottom-0 z-40 border-t border-white/10 backdrop-blur',
          'px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          'lg:static lg:mx-auto lg:mt-6 lg:max-w-md lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none',
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
