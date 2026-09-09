import type { ReactNode } from 'react';

/** Ligne « icône + titre + explication » de l'écran de succès. */
export function StatusLine({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0" aria-hidden>
        {icon}
      </span>
      <span className="text-sm">
        <span className="text-brand-800 block font-semibold">{title}</span>
        <span className="text-brand-700/80 block">{description}</span>
      </span>
    </div>
  );
}
