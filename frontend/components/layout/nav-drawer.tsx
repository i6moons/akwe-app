'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { History, Home, Menu, Users, Wallet, X } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { NAV_LINKS } from '@/lib/nav';
import { cn } from '@/lib/utils';

const ICONES = { Home, Wallet, Users, History } as const;

/** Menu latéral ouvert par l'icône « hamburger » présente sur toutes les maquettes. */
export function NavDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        // Sur grand écran, la barre latérale reste affichée : ce bouton ferait doublon.
        className="size-touch -mr-2 flex items-center justify-end text-white lg:hidden"
      >
        <Menu className="size-7" />
      </button>

      <Sheet open={open} onClose={close} label="Menu principal" className="h-full w-72 max-w-[85%]">
        <div className="flex h-full flex-col p-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={close}
              aria-label="Fermer le menu"
              className="size-touch flex items-center justify-center text-white"
            >
              <X className="size-6" />
            </button>
          </div>
          <ul className="mt-4 space-y-1">
            {NAV_LINKS.map(({ href, label, icon }) => {
              const Icone = ICONES[icon];
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'min-h-touch flex items-center gap-3 rounded-xl px-3 text-white',
                      pathname === href ? 'bg-brand-600' : 'hover:bg-brand-700',
                    )}
                  >
                    <Icone className="size-5" aria-hidden />
                    <span className="font-medium">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </Sheet>
    </>
  );
}
