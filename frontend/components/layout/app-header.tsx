'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NavDrawer } from '@/components/layout/nav-drawer';
import { cn } from '@/lib/utils';

/**
 * En-tête commun : flèche retour à gauche, menu à droite, titre en dessous.
 * Le titre est centré quand il n'y a pas de sous-titre (écrans de formulaire).
 */
export function AppHeader({
  title,
  subtitle,
  back = true,
  centered = false,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  centered?: boolean;
}) {
  const router = useRouter();

  return (
    <header className="px-4 pt-4 pb-2">
      <div className="min-h-touch flex items-center justify-between">
        {back ? (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Revenir à l'écran précédent"
            className="size-touch -ml-2 flex items-center justify-start text-white"
          >
            <ArrowLeft className="size-6" />
          </button>
        ) : (
          <span className="size-touch" />
        )}
        <NavDrawer />
      </div>

      <div className={cn('pt-1', centered && 'text-center')}>
        {/* Un titre centré est souvent une phrase entière (« Saisir manuelle
            d'une opération ») : on le rend un cran plus petit pour qu'il respire. */}
        <h1 className={cn('font-display font-bold text-white', centered ? 'text-xl' : 'text-2xl')}>
          {title}
        </h1>
        {subtitle ? <p className="pt-1 text-sm text-white/70">{subtitle}</p> : null}
      </div>
    </header>
  );
}
