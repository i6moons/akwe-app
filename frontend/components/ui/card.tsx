import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Carte claire posée sur le fond vert — le motif dominant des maquettes. */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('bg-surface rounded-card text-brand-800 p-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 className={cn('text-brand-800 text-lg font-semibold', className)} {...props} />;
}

/** Bloc secondaire à l'intérieur d'une carte (gris-vert clair). */
export function CardPanel({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('bg-surface-2 rounded-xl p-3', className)} {...props} />;
}

/** Ligne « libellé / valeur » des fiches d'informations. */
export function InfoRow({
  icon,
  label,
  value,
  className,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('border-line flex items-center gap-3 border-b py-3 last:border-0', className)}
    >
      {icon ? <span className="text-brand-600 shrink-0">{icon}</span> : null}
      <span className="text-brand-700/80 flex-1 text-sm">{label}</span>
      <span className="text-brand-800 text-right font-semibold">{value}</span>
    </div>
  );
}
