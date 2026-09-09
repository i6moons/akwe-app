import { cn } from '@/lib/utils';

/** Le logotype AKWÈ. Du texte, pas une image : rien à télécharger en 3G. */
export function Wordmark({
  className,
  tagline = false,
}: {
  className?: string;
  tagline?: boolean;
}) {
  return (
    <div className={cn('text-center', className)}>
      <p className="font-display text-4xl font-bold tracking-wide text-white">AKWÈ</p>
      {tagline ? (
        <p className="font-display pt-1 text-sm font-semibold text-white/80">
          Le carnet des tontines
        </p>
      ) : null}
    </div>
  );
}
