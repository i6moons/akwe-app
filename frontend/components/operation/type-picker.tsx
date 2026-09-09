'use client';

import { Minus, Plus } from 'lucide-react';
import { m } from '@/components/ui/motion';
import { OPERATION_TYPES, type TransactionType } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Choix du type d'opération, séparé en entrées et sorties (maquette « iPhone 17 - 18 »).
 * Le signe est visible sur chaque pastille : c'est ce qui évite les erreurs de
 * saisie les plus coûteuses.
 */
export function TypePicker({
  value,
  onChange,
}: {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}) {
  const groups = [
    { label: 'Entrées', direction: 'in' as const },
    { label: 'Sorties', direction: 'out' as const },
  ];

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.direction}>
          <p
            className={cn(
              'pb-2 text-sm font-medium',
              group.direction === 'in' ? 'text-accent-600' : 'text-brand-700/80',
            )}
          >
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {OPERATION_TYPES.filter((meta) => meta.direction === group.direction).map((meta) => {
              const selected = value === meta.type;
              return (
                <m.button
                  key={meta.type}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(meta.type)}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={cn(
                    'min-h-touch flex items-center gap-1 rounded-full px-4 font-medium',
                    selected
                      ? 'bg-accent-500 text-brand-950'
                      : 'bg-surface-2 text-brand-700 hover:bg-line',
                  )}
                >
                  {group.direction === 'in' ? (
                    <Plus className="size-4" aria-hidden />
                  ) : (
                    <Minus className="size-4" aria-hidden />
                  )}
                  {meta.label}
                </m.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
