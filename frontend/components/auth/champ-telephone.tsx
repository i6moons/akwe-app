'use client';

import { cn } from '@/lib/utils';

/**
 * Champ de numéro béninois, avec l'indicatif figé à gauche.
 *
 * L'indicatif n'est pas saisissable : nos utilisatrices tapent leur numéro
 * comme elles le dictent, sans le « +229 » qu'elles n'écrivent jamais.
 */
export function ChampTelephone({
  value,
  onChange,
  onBlur,
  invalide,
  describedBy,
}: {
  value: string;
  onChange: (valeur: string) => void;
  onBlur?: () => void;
  invalide?: boolean;
  describedBy?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-stretch rounded-xl border-2 transition-colors duration-200',
        invalide ? 'border-danger-500' : 'border-brand-500 focus-within:border-accent-500',
      )}
    >
      <span className="border-brand-500 flex items-center gap-2 border-r px-4 text-white">
        <span aria-hidden className="text-lg">
          🇧🇯
        </span>
        <span className="font-medium">+ 229</span>
      </span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        aria-label="Numéro de téléphone"
        placeholder="Numéro de téléphone"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(invalide)}
        aria-describedby={describedBy}
        className="champ-sombre text-field min-h-14 flex-1 bg-transparent px-4 text-white outline-none placeholder:text-white/50"
      />
    </div>
  );
}
