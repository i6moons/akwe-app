import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import type { SyncStatus } from '@/lib/types';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
  {
    variants: {
      tone: {
        active: 'bg-accent-500 text-brand-950',
        synced: 'bg-accent-100 text-brand-600',
        pending: 'bg-danger-100 text-danger-500',
        failed: 'bg-danger-100 text-danger-500',
        neutral: 'bg-surface-2 text-brand-700',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const SYNC_LABELS: Readonly<Record<SyncStatus, string>> = {
  synced: 'Synchronisé',
  pending: 'En attente',
  failed: 'Échouée',
};

/** État de remontée d'une opération, tel qu'affiché dans l'historique. */
export function SyncBadge({ status }: { status: SyncStatus }) {
  return <Badge tone={status}>{SYNC_LABELS[status]}</Badge>;
}
