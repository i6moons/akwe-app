import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Barre d'action ancrée en bas de l'écran.
 *
 * Sur un téléphone tenu à une main, le bas de l'écran est la seule zone
 * atteignable sans se contorsionner. Le bouton qui valide, enregistre ou
 * supprime y reste visible quelle que soit la longueur du formulaire.
 *
 * Le fond reprend le vert de l'application plutôt qu'un bandeau blanc : une
 * bande claire en bas d'un écran vert foncé se lit comme un élément étranger,
 * et casserait la continuité des maquettes.
 */
export function FixedAction({
  children,
  className,
  /** Hauteur réservée dans le flux pour que rien ne passe sous la barre. */
  spacer = true,
}: {
  children: ReactNode;
  className?: string;
  spacer?: boolean;
}) {
  return (
    <>
      {spacer ? <div aria-hidden className="h-24" /> : null}
      <div
        className={cn(
          'bg-brand-800/95 fixed inset-x-0 bottom-0 z-40 border-t border-white/10 backdrop-blur',
          'px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
