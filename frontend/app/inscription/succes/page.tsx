'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ShieldCheck } from 'lucide-react';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { FixedAction } from '@/components/ui/fixed-action';
import { clearInscription } from '@/lib/auth/session';
import { routes } from '@/lib/routes';

/**
 * Maquette « iPhone 17 - 23 » — le compte existe, mais la session n'est pas
 * ouverte : la trésorière ressaisit son code pour entrer. Le faire une seconde
 * fois tout de suite, pendant qu'elle l'a en tête, est ce qui l'ancre.
 */
export default function InscriptionReussiePage() {
  const router = useRouter();

  useEffect(() => {
    // Le brouillon a rempli son office : on l'efface pour qu'un retour en
    // arrière ne relance pas une inscription déjà aboutie.
    clearInscription();
  }, []);

  return (
    <main className="flex min-h-dvh flex-col px-6 pt-16 pb-8">
      <Wordmark />

      <div className="flex justify-center pt-16">
        <span className="text-accent-500 flex size-24 items-center justify-center rounded-full bg-white">
          <Check className="size-12" strokeWidth={3} aria-hidden />
        </span>
      </div>

      <div className="pt-8 text-center">
        <h1 className="font-display text-3xl font-bold text-white">Compte créé avec succès</h1>
        <p className="pt-2 text-white/80">Votre compte AKWÈ est maintenant actif</p>
      </div>

      <div className="border-accent-500/60 mt-10 flex items-start gap-3 rounded-xl border px-4 py-4">
        <span className="bg-brand-800 mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-white">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <p className="text-sm text-white/90">
          N&apos;oubliez pas de garder votre code bien en sécurité. Il vous sera demandé à chaque
          connexion.
        </p>
      </div>

      <FixedAction>
        <Button size="lg" onClick={() => router.replace(routes.connexion)}>
          Se connecter
        </Button>
      </FixedAction>
    </main>
  );
}
