import { Users } from 'lucide-react';
import type { ReactNode } from 'react';

export interface Stat {
  value: number | undefined;
  label: string;
  icon?: ReactNode;
}

/**
 * Bande de quatre compteurs bordés de vert, sous la carte d'épargne.
 * Les quatre tiennent dans la largeur d'un téléphone : rien à faire défiler
 * pour connaître l'état de ses caisses.
 */
export function StatTiles({ stats }: { stats: readonly Stat[] }) {
  return (
    <ul className="grid grid-cols-4 gap-2">
      {stats.map((stat) => (
        <li
          key={stat.label}
          className="border-accent-500 flex flex-col gap-1.5 rounded-xl border p-2"
        >
          <span className="text-white" aria-hidden>
            {stat.icon ?? <Users className="size-5" />}
          </span>
          <span className="text-lg leading-none font-bold text-white">{stat.value ?? '—'}</span>
          <span className="text-[10px] leading-tight text-white/70">{stat.label}</span>
        </li>
      ))}
    </ul>
  );
}
