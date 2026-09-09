'use client';

import { LazyMotion, MotionConfig, domAnimation, m } from 'framer-motion';
import type { ReactNode } from 'react';
import type { Variants } from 'framer-motion';

/**
 * Socle d'animation.
 *
 * `LazyMotion` + les composants `m` chargent le moteur d'animation à part du
 * cœur de React : environ 20 ko de moins que `motion` importé directement. Sur
 * la 3G béninoise, ces kilo-octets sont des secondes.
 *
 * `reducedMotion="user"` respecte le réglage système : une utilisatrice sujette
 * au mal des transports voit l'application sans mouvement, sans rien perdre.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/**
 * Aucun état de départ ne met l'opacité à zéro.
 *
 * `framer-motion` écrit l'état `initial` en style en ligne dans le HTML rendu
 * par le serveur. Une entrée en fondu laisse donc la page entièrement
 * invisible tant que le JavaScript n'est pas arrivé — sur une 3G intermittente,
 * cela peut durer plusieurs secondes, et rester ainsi si le script échoue.
 * L'application affichait un écran vert vide alors que tout le texte était bien
 * là, à `opacity: 0`.
 *
 * Le mouvement seul suffit à donner l'impression d'arrivée, et il se dégrade
 * proprement : sans JavaScript, le contenu est simplement en place.
 */

/** Apparition simple : léger glissement vers le haut. */
export const fadeUp: Variants = {
  hidden: { y: 12 },
  visible: { y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

/** Conteneur qui fait apparaître ses enfants l'un après l'autre. */
export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

/** Titre : les lettres se resserrent en apparaissant. */
export const trackingIn: Variants = {
  hidden: { letterSpacing: '0.1em' },
  visible: {
    letterSpacing: '-0.01em',
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

/**
 * Liste dont les éléments apparaissent l'un après l'autre.
 * Le décalage reste court : au-delà, l'écran donne l'impression de ramer.
 */
export function StaggerList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.ul variants={stagger} initial="hidden" animate="visible" className={className}>
      {children}
    </m.ul>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.li variants={fadeUp} className={className}>
      {children}
    </m.li>
  );
}

/**
 * Apparition au défilement des longues listes.
 *
 * Le glissement se fait sans passer par une opacité nulle : dans un registre de
 * comptes, une ligne ne doit jamais dépendre du déclenchement d'un observateur
 * pour être lisible. Si l'animation ne part pas, tout reste visible.
 *
 * `once` : une section déjà vue ne rejoue pas son entrée quand on remonte,
 * sinon la page tressaute sous le pouce.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div
      initial={{ y: 10 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </m.div>
  );
}

export { m };
