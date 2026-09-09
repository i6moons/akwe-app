'use client';

import type { TransactionType } from '@/lib/types';
import { cn } from '@/lib/utils';

export type HistoryFilter = TransactionType | 'all';

const FILTERS: readonly { value: HistoryFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'contribution', label: 'Cotisations' },
  { value: 'repayment', label: 'Remboursements' },
  { value: 'loan', label: 'Prêts' },
  { value: 'fee', label: 'Dépenses du groupe' },
  { value: 'payout', label: 'Versements' },
];

/** Pastilles de filtre de l'historique (maquette « iPhone 17 - 9 »). */
export function HistoryFilters({
  value,
  onChange,
}: {
  value: HistoryFilter;
  onChange: (filter: HistoryFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les opérations">
      {FILTERS.map((filter) => {
        const selected = value === filter.value;
        return (
          <button
            key={filter.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(filter.value)}
            className={cn(
              'min-h-touch rounded-full px-4 text-sm font-medium',
              selected
                ? 'bg-accent-500 text-brand-950'
                : 'border-brand-600 text-brand-700 border bg-transparent',
            )}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
