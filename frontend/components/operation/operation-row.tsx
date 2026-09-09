import { ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import { SyncBadge } from '@/components/ui/badge';
import { formatSigned, formatTime } from '@/lib/format';
import { directionOf, operationMeta, type Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';

const SOURCE_LABELS = {
  voice: 'Saisie vocale',
  manual: 'Saisie manuelle',
  payment_webhook: 'Mobile money',
} as const;

/** Ligne d'opération de l'historique (maquette « iPhone 17 - 9 »). */
export function OperationRow({
  transaction,
  memberName,
  showChevron = true,
}: {
  transaction: Transaction;
  memberName?: string;
  showChevron?: boolean;
}) {
  const direction = directionOf(transaction.type);
  const isIn = direction === 'in';

  return (
    <div className="bg-surface rounded-card flex items-center gap-3 p-3">
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full',
          isIn ? 'bg-accent-100 text-accent-600' : 'bg-danger-100 text-danger-500',
        )}
        aria-hidden
      >
        {isIn ? <ArrowUpRight className="size-6" /> : <ArrowDownLeft className="size-6" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-brand-800 font-bold">{operationMeta(transaction.type).label}</p>
        {memberName ? <p className="text-brand-700/80 truncate text-sm">{memberName}</p> : null}
        <p className="text-brand-700/80 text-xs">
          {formatTime(transaction.occurredAt)} · {SOURCE_LABELS[transaction.source]}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className={cn('font-bold', isIn ? 'text-accent-600' : 'text-danger-500')}>
          {formatSigned(transaction.amount, direction)}
        </p>
        <div className="flex justify-end pt-1">
          <SyncBadge status={transaction.syncStatus} />
        </div>
      </div>

      {showChevron ? <ChevronRight className="text-brand-600 size-5 shrink-0" aria-hidden /> : null}
    </div>
  );
}
