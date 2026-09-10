'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { FixedAction } from '@/components/ui/fixed-action';
import { FieldError } from '@/components/ui/field';
import { OtpInput, OTP_LENGTH } from '@/components/auth/otp-input';
import { getInscription, type Inscription } from '@/lib/auth/session';
import { sInscrire } from '@/lib/auth/inscription';
import { routes } from '@/lib/routes';

/**
 * Maquette « iPhone 17 - 3 » — choix du code fixe.
 *
 * Aucun code n'est envoyé : celui-ci est choisi, et c'est écrit à l'écran. La
 * maquette prévoyait un « Renvoyez le code » hérité d'un envoi par SMS ; il
 * n'aurait rien renvoyé, et donner à une trésorière un bouton qui ne fait rien
 * est la meilleure façon de lui faire croire que l'application est cassée.
 */
export default function MotDePassePage() {
  const router = useRouter();
  const [inscription, setInscriptionEnCours] = useState<Inscription | null>(null);
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    const attente = getInscription();
    if (!attente) {
      router.replace(routes.inscription);
      return;
    }
    setInscriptionEnCours(attente);
  }, [router]);

  const complet = code.replace(/\D/g, '').length === OTP_LENGTH;

  async function handleSubmit(): Promise<void> {
    if (!complet || !inscription || enCours) return;
    setEnCours(true);
    setErreur(null);

    const echec = await sInscrire(inscription.phone, inscription.fullName, code.replace(/\D/g, ''));
    if (echec === null) {
      router.replace(routes.inscriptionReussie);
      return;
    }

    setEnCours(false);
    setErreur(
      echec === 'deja-inscrit'
        ? 'Ce numéro a déjà un compte. Connectez-vous.'
        : echec === 'reseau'
          ? 'Inscription impossible. Vérifiez votre réseau.'
          : 'Inscription impossible. Réessayez dans un instant.',
    );
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 pt-16 pb-8">
      <Wordmark />

      <div className="pt-14 text-center">
        <h1 className="font-display text-3xl font-bold text-white">Mot de passe</h1>
        <p className="pt-2 text-white/80">
          Choisissez votre mot de passe
          <br />à utiliser pour vos connexions
        </p>
      </div>

      <div className="pt-10">
        <OtpInput
          value={code}
          onChange={(valeur) => {
            setCode(valeur);
            setErreur(null);
          }}
          disabled={enCours}
        />
      </div>

      <div className="pt-3">
        <FieldError id="erreur-code" message={erreur} />
      </div>

      <div className="flex justify-start pt-8">
        <button
          type="button"
          onClick={() => router.push(routes.inscription)}
          className="min-h-touch flex items-center gap-2 text-white/90"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Modifier le numéro
        </button>
      </div>

      <div className="border-accent-500/60 mt-6 flex items-start gap-3 rounded-xl border px-4 py-4">
        <span className="bg-brand-800 mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-white">
          <Lock className="size-5" aria-hidden />
        </span>
        <p className="text-sm text-white/90">
          Ce code est unique et sera votre code fixe. Gardez-le précieusement : il ne peut pas être
          retrouvé.
        </p>
      </div>

      <FixedAction>
        <Button size="lg" onClick={() => void handleSubmit()} disabled={!complet || enCours}>
          {enCours ? 'Création…' : 'Suivant'}
        </Button>
      </FixedAction>
    </main>
  );
}
