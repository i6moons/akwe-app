'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { m } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastContext = createContext<((tone: ToastTone, message: string) => void) | null>(null);

const TONES: Record<ToastTone, { icon: ReactNode; className: string }> = {
  success: { icon: <CircleCheck className="size-5" />, className: 'bg-accent-500 text-brand-950' },
  error: { icon: <CircleAlert className="size-5" />, className: 'bg-danger-500 text-white' },
  info: { icon: <Info className="size-5" />, className: 'bg-surface text-brand-800' },
};

/** Messages courts et non bloquants, en haut de l'écran. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        // `polite` : l'annonce ne coupe pas la lecture en cours du lecteur d'écran.
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <m.div
              key={toast.id}
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'flex w-full max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg',
                TONES[toast.tone].className,
              )}
            >
              <span aria-hidden>{TONES[toast.tone].icon}</span>
              {toast.message}
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/** Renvoie `notify(tone, message)`. Sans fournisseur, ne fait rien. */
export function useToast(): (tone: ToastTone, message: string) => void {
  return useContext(ToastContext) ?? (() => undefined);
}
