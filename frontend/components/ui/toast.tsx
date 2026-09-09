'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { m } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

/** Au-delà de trois messages empilés, l'écran d'un téléphone est mangé. */
const MAX_VISIBLES = 3;

const DUREES: Record<ToastTone, number> = {
  success: 4000,
  info: 4000,
  // Une erreur demande à être lue, pas aperçue.
  error: 6000,
  warning: 6000,
};

const STYLES: Record<ToastTone, { icon: ReactNode; className: string }> = {
  success: { icon: <CircleCheck className="size-5" />, className: 'bg-accent-500 text-brand-950' },
  error: { icon: <CircleAlert className="size-5" />, className: 'bg-danger-500 text-white' },
  warning: { icon: <TriangleAlert className="size-5" />, className: 'bg-warn-100 text-brand-950' },
  info: { icon: <Info className="size-5" />, className: 'bg-surface text-brand-800' },
};

const ToastContext = createContext<((tone: ToastTone, message: string) => void) | null>(null);

/** Messages courts et non bloquants. Ils n'interrompent jamais une saisie. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<Toast[]>([]);

  const fermer = useCallback((id: number) => {
    setFile((actuelle) => actuelle.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (tone: ToastTone, message: string) => {
      const id = Date.now() + Math.random();
      setFile((actuelle) => [...actuelle, { id, tone, message }]);
      window.setTimeout(() => fermer(id), DUREES[tone]);
    },
    [fermer],
  );

  // Les messages en trop attendent leur tour plutôt que de s'empiler.
  const visibles = file.slice(0, MAX_VISIBLES);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-end">
        <AnimatePresence initial={false}>
          {visibles.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onClose={() => fermer(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const critique = toast.tone === 'error' || toast.tone === 'warning';

  return (
    <m.div
      // Une erreur coupe la lecture en cours du lecteur d'écran, une réussite non.
      role={critique ? 'alert' : 'status'}
      aria-live={critique ? 'assertive' : 'polite'}
      layout
      initial={{ opacity: 0, y: -16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl py-3 pr-2 pl-4',
        'text-sm font-medium shadow-lg',
        STYLES[toast.tone].className,
      )}
    >
      <span aria-hidden className="shrink-0">
        {STYLES[toast.tone].icon}
      </span>
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer le message"
        className="size-touch -my-2 flex shrink-0 items-center justify-center opacity-70"
      >
        <X className="size-4" />
      </button>
    </m.div>
  );
}

/** Renvoie `notify(tone, message)`. Hors fournisseur, ne fait rien. */
export function useToast(): (tone: ToastTone, message: string) => void {
  return useContext(ToastContext) ?? (() => undefined);
}
