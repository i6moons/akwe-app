'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { History, Home, Users, Wallet } from 'lucide-react';
import { NAV_LINKS } from '@/lib/nav';
import { cn } from '@/lib/utils';

const ICONES = { Home, Wallet, Users, History } as const;

/**
 * Navigation permanente des grands écrans.
 *
 * Sur téléphone, le menu est un tiroir qu'on ouvre : la largeur est trop
 * précieuse. Dès qu'on a la place, les mêmes destinations restent affichées —
 * on voit où on est sans avoir à ouvrir quoi que ce soit.
 */
export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="bg-brand-900 sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-white/10 p-4 lg:flex">
      <p className="font-display px-3 pt-2 pb-6 text-2xl text-white">AKWÈ</p>

      <nav aria-label="Navigation principale">
        <ul className="space-y-1">
          {NAV_LINKS.map(({ href, label, icon }) => {
            const Icone = ICONES[icon];
            const actif = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={actif ? 'page' : undefined}
                  className={cn(
                    'min-h-touch flex items-center gap-3 rounded-xl px-3 text-white',
                    actif ? 'bg-brand-600' : 'hover:bg-brand-700',
                  )}
                >
                  <Icone className="size-5" aria-hidden />
                  <span className="font-medium">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="mt-auto px-3 text-xs text-white/50">Le carnet des tontines</p>
    </aside>
  );
}
