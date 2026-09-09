'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SideNav } from '@/components/layout/side-nav';
import { ROUTES_PLEINE_LARGEUR, ROUTES_SANS_COQUILLE } from '@/lib/nav';

/**
 * Coquille de l'application.
 *
 * Elle vit dans `layout.tsx`, pas dans `template.tsx` : la barre latérale ne
 * doit ni se remonter ni se refondre à chaque navigation, seul le contenu
 * change.
 *
 * Sans elle, sur un écran large, une carte s'étirait sur 1400 px et un champ
 * destiné à recevoir « 2000 » en faisait mille.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Ouverture et authentification n'ont pas de navigation, mais gardent une
  // largeur de lecture : six cases de code réparties sur toute la fenêtre ne se
  // lisent plus comme un code, et un champ de téléphone d'un mètre non plus.
  if (ROUTES_SANS_COQUILLE.includes(pathname)) {
    if (ROUTES_PLEINE_LARGEUR.includes(pathname)) return <>{children}</>;
    return <div className="mx-auto w-full lg:max-w-md">{children}</div>;
  }

  return (
    <div className="lg:flex lg:items-start">
      <SideNav />
      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full lg:max-w-4xl lg:px-6 lg:py-4">{children}</div>
      </div>
    </div>
  );
}
