'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { History, Home, Menu, Users, Wallet, X } from 'lucide-react';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: routes.accueil, label: 'Accueil', icon: Home },
  { href: routes.caisses, label: 'Mes caisses', icon: Wallet },
  { href: routes.nouvelleCaisse, label: 'Nouvelle caisse', icon: Users },
  { href: routes.operations, label: 'Historique', icon: History },
] as const;

/** Menu latéral ouvert par l'icône « hamburger » présente sur toutes les maquettes. */
export function NavDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        className="size-touch -mr-2 flex items-center justify-end text-white"
      >
        <Menu className="size-7" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <nav className="bg-brand-900 relative flex h-full w-72 max-w-[85%] flex-col p-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="size-touch flex items-center justify-center text-white"
              >
                <X className="size-6" />
              </button>
            </div>
            <ul className="mt-4 space-y-1">
              {LINKS.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'min-h-touch flex items-center gap-3 rounded-xl px-3 text-white',
                      pathname === href ? 'bg-brand-600' : 'hover:bg-brand-700',
                    )}
                  >
                    <Icon className="size-5" />
                    <span className="font-medium">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </>
  );
}
