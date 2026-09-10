'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { m } from '@/components/ui/motion';

/**
 * Transition entre les écrans.
 *
 * `template.tsx` est remonté à chaque navigation, contrairement à `layout.tsx` :
 * c'est ce qui permet de rejouer l'apparition. On se limite à un fondu court —
 * un mouvement plus appuyé donnerait une impression de lenteur sur les
 * téléphones d'entrée de gamme que visent nos utilisatrices.
 */

/**
 * Le fondu ne s'applique qu'aux navigations, jamais au premier affichage.
 *
 * L'état `initial` est écrit en style en ligne dans le HTML du serveur : partir
 * de `opacity: 0` rend toute l'application invisible tant que le JavaScript
 * n'est pas arrivé, et définitivement s'il échoue.
 *
 * Ce fichier est remonté à chaque navigation, mais le module persiste : un
 * drapeau suffit à distinguer l'arrivée sur le site du reste. Il doit être lu
 * uniquement dans le navigateur — sur le serveur, le module survit d'une requête
 * à l'autre, si bien qu'à partir de la deuxième visite le fondu se retrouvait de
 * nouveau écrit dans le HTML.
 */
let dejaAffiche = false;

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Faux au rendu serveur comme à l'hydratation : les deux concordent.
  const fondu = typeof window !== 'undefined' && dejaAffiche;

  useEffect(() => {
    dejaAffiche = true;
  }, []);

  // Sans cela, on arrive au milieu d'un écran neuf après avoir fait défiler le
  // précédent. Instantané et non « smooth » : le fondu masque déjà le saut.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <m.div
      initial={fondu ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </m.div>
  );
}
