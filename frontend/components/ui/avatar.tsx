import { cn } from '@/lib/utils';
import { initials } from '@/lib/utils';

/** Pastille d'initiales utilisée partout pour identifier un membre ou une caisse. */
export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'size-10 text-sm',
    md: 'size-12 text-base',
    lg: 'size-16 text-xl',
  } as const;

  return (
    <span
      aria-hidden
      className={cn(
        'bg-brand-600 flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
