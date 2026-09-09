'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { m } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

/**
 * Panneau glissant par-dessus l'écran, avec fond flouté.
 *
 * Sert au menu latéral et à toute boîte de dialogue : on gère une seule fois la
 * fermeture par Échap, le piège à focus et le verrouillage du défilement.
 */
export function Sheet({
  open,
  onClose,
  side = 'right',
  label,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  side?: 'right' | 'bottom';
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel.current) return;

      // Piège à focus : au clavier, la tabulation ne doit pas repartir dans la
      // page restée derrière le panneau.
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, [open, onClose]);

  const offscreen = side === 'right' ? { x: '100%' } : { y: '100%' };

  return (
    <AnimatePresence>
      {open ? (
        <div
          className={cn(
            'fixed inset-0 z-50 flex',
            side === 'right'
              ? 'justify-end'
              : // Remonte du bas sur téléphone, se pose au centre sur grand écran.
                'items-end sm:items-center sm:justify-center sm:p-4',
          )}
        >
          <m.button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <m.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            initial={offscreen}
            animate={{ x: 0, y: 0 }}
            exit={offscreen}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className={cn('bg-brand-900 relative outline-none', className)}
          >
            {children}
          </m.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
