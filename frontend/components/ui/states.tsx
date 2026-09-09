import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

/** État vide, avec une consigne qui dit quoi faire ensuite. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  /** Bouton ou lien qui débloque la situation. */
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="bg-surface-2 text-brand-600 flex size-20 items-center justify-center rounded-full">
        {icon}
      </span>
      <p className="text-brand-800 font-semibold">{title}</p>
      <p className="text-brand-700/80 text-sm">{description}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </Card>
  );
}

/** Rouet de chargement, pour les actions courtes qui n'ont pas de squelette. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Chargement en cours"
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
        className ?? 'size-5',
      )}
    />
  );
}

/** Squelette de chargement. Jamais d'écran blanc : la 3G est lente. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-surface-2/60 animate-pulse rounded-xl', className)} />;
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Chargement en cours">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton
          key={index}
          // Sur un petit écran, seules les trois premières lignes sont visibles :
          // inutile d'animer ce que personne ne voit.
          className={cn('h-20 w-full', index >= 3 ? 'hidden sm:block' : undefined)}
        />
      ))}
    </div>
  );
}

/** Message d'erreur avec une porte de sortie : on ne laisse jamais l'utilisatrice bloquée. */
export function ErrorState({
  message,
  onRetry,
  icon,
}: {
  message: string;
  onRetry?: () => void;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-8 text-center">
      {icon ? (
        <span className="bg-danger-100 text-danger-500 flex size-16 items-center justify-center rounded-full">
          {icon}
        </span>
      ) : null}
      <p className="text-brand-800 font-semibold">Une erreur est survenue</p>
      <p className="text-brand-700/80 text-sm">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-brand-600 min-h-touch font-semibold underline"
        >
          Réessayer
        </button>
      ) : null}
    </Card>
  );
}
