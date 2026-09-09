'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CircleAlert } from 'lucide-react';
import { m } from '@/components/ui/motion';

interface FieldAria {
  id: string;
  /** Identifiants du message d'erreur et de l'aide, pour `aria-describedby`. */
  describedBy?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldAria | null>(null);

/**
 * Les champs récupèrent leur `id`, leur `aria-describedby` et leur
 * `aria-invalid` ici plutôt que de les répéter sur chaque appel : un message
 * d'erreur non relié à son champ n'existe pas pour un lecteur d'écran.
 */
export function useFieldAria(): FieldAria | null {
  return useContext(FieldContext);
}

/** Libellé + champ + message d'erreur ou d'aide, en français simple. */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  htmlFor: string;
  children: ReactNode;
}) {
  const errorId = `${htmlFor}-erreur`;
  const hintId = `${htmlFor}-aide`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <FieldContext.Provider value={{ id: htmlFor, describedBy, invalid: Boolean(error) }}>
      <div className="space-y-2">
        <label htmlFor={htmlFor} className="text-brand-800 block font-semibold">
          {label}
          {required ? <span className="text-danger-600"> *</span> : null}
        </label>
        {children}
        {hint && !error ? (
          <p id={hintId} className="text-brand-700/80 text-sm">
            {hint}
          </p>
        ) : null}
        <FieldError id={errorId} message={error} />
      </div>
    </FieldContext.Provider>
  );
}

/**
 * Message d'erreur qui se déplie et se replie.
 * L'apparition brutale d'une ligne fait sauter tout le formulaire ; ici la
 * hauteur est animée, le reste du champ ne bouge pas d'un coup.
 */
export function FieldError({ id, message }: { id?: string; message?: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <m.p
          key={message}
          id={id}
          role="alert"
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="text-danger-600 flex items-start gap-1.5 overflow-hidden text-sm font-medium"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {message}
        </m.p>
      ) : null}
    </AnimatePresence>
  );
}
