'use client';

import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

const BARS = [10, 18, 28, 22, 34, 24, 14, 20] as const;

/**
 * Gros bouton micro entouré d'une onde (maquette « iPhone 17 - 8 »).
 * L'onde s'anime seulement pendant l'écoute : c'est le seul retour visuel dont
 * dispose une utilisatrice qui ne lit pas l'écran pendant qu'elle parle.
 */
export function MicButton({
  listening,
  disabled,
  onToggle,
}: {
  listening: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-surface-2 rounded-card flex items-center justify-center gap-3 px-4 py-6">
      <Waveform animated={listening} side="left" />

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={listening}
        aria-label={listening ? "Arrêter l'enregistrement" : 'Appuyez pour enregistrer'}
        className={cn(
          'flex size-20 shrink-0 items-center justify-center rounded-full text-white transition-colors',
          listening ? 'bg-danger-500' : 'bg-brand-800',
          disabled && 'opacity-50',
        )}
      >
        {listening ? <Square className="size-7 fill-current" /> : <Mic className="size-9" />}
      </button>

      <Waveform animated={listening} side="right" />
    </div>
  );
}

function Waveform({ animated, side }: { animated: boolean; side: 'left' | 'right' }) {
  const bars = side === 'left' ? [...BARS].reverse() : BARS;
  return (
    <div aria-hidden className="flex h-12 flex-1 items-center justify-center gap-1">
      {bars.map((height, index) => (
        <span
          key={`${side}-${index}`}
          className={cn('bg-brand-600/60 w-[3px] rounded-full', animated && 'animate-pulse')}
          style={{
            height: `${height}px`,
            animationDelay: animated ? `${index * 90}ms` : undefined,
          }}
        />
      ))}
    </div>
  );
}
