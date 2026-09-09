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
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Sans cela, on arrive au milieu d'un écran neuf après avoir fait défiler le
  // précédent. Instantané et non « smooth » : le fondu masque déjà le saut.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </m.div>
  );
}
