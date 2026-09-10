'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { FixedAction } from '@/components/ui/fixed-action';
import { OtpInput, OTP_LENGTH } from '@/components/auth/otp-input';
import { FieldError } from '@/components/ui/field';
import { formatPhone } from '@/lib/format';
import { getPendingPhone } from '@/lib/auth/session';
import { seConnecter } from '@/lib/auth/connexion';
import { routes } from '@/lib/routes';

const EXPIRY_SECONDS = 300;

/** Maquette « iPhone 17 - 3 » — vérification du code reçu par SMS. */
export default function VerificationPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(EXPIRY_SECONDS);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    const pending = getPendingPhone();
    if (!pending) {
      router.replace(routes.connexion);
      return;
    }
    setPhone(pending);
  }, [router]);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const complete = code.replace(/\D/g, '').length === OTP_LENGTH;
  const minutes = Math.floor(remaining / 60);
  const seconds = `${remaining % 60}`.padStart(2, '0');

  async function handleSubmit(): Promise<void> {
    if (!complete || !phone || enCours) return;
    setEnCours(true);
    setErreur(null);

    const resultat = await seConnecter(phone, code.replace(/\D/g, ''));
    if (resultat.ok) {
      // Première connexion : on lui demande son nom avant de lui ouvrir son carnet.
      router.replace(resultat.nouveau ? routes.profil : routes.accueil);
      return;
    }

    setEnCours(false);
    setErreur(
      resultat.cause === 'code'
        ? 'Ce code ne correspond pas à ce numéro.'
        : 'Connexion impossible. Vérifiez votre réseau.',
    );
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 pt-16 pb-8">
      <Wordmark />

      <div className="pt-14 text-center">
        <h1 className="font-display text-3xl font-bold text-white">Vérification</h1>
        <p className="pt-2 text-white/80">
          Un code a été envoyé au
          <br />+ 229 {phone ? formatPhone(phone) : '…'}
        </p>
      </div>

      <p className="pt-10 text-right text-sm text-white/80">
        Expire dans{' '}
        <span className="font-semibold text-white">
          {minutes}:{seconds}
        </span>
      </p>

      <div className="pt-3">
        <OtpInput
          value={code}
          onChange={(valeur) => {
            setCode(valeur);
            setErreur(null);
          }}
          disabled={remaining === 0 || enCours}
        />
      </div>

      <div className="pt-3">
        <FieldError id="erreur-code" message={erreur} />
      </div>

      <div className="flex flex-col items-center gap-3 pt-8">
        <button
          type="button"
          onClick={() => setRemaining(EXPIRY_SECONDS)}
          className="text-accent-500 min-h-touch font-semibold"
        >
          Renvoyez le code
        </button>
        <button
          type="button"
          onClick={() => router.push(routes.connexion)}
          className="min-h-touch flex items-center gap-2 text-white/90"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Modifier le numéro
        </button>
      </div>

      <FixedAction>
        <Button size="lg" onClick={() => void handleSubmit()} disabled={!complete || enCours}>
          {enCours ? 'Connexion…' : 'Suivant'}
        </Button>
      </FixedAction>
    </main>
  );
}
