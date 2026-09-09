'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { OtpInput, OTP_LENGTH } from '@/components/auth/otp-input';
import { formatPhone } from '@/lib/format';
import { getPendingPhone, openSession } from '@/lib/auth/session';
import { routes } from '@/lib/routes';

const EXPIRY_SECONDS = 300;

/** Maquette « iPhone 17 - 3 » — vérification du code reçu par SMS. */
export default function VerificationPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(EXPIRY_SECONDS);

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

  function handleSubmit(): void {
    if (!complete || !phone) return;
    // La vérification réelle du code est faite côté serveur par le lead technique.
    openSession(phone);
    router.replace(routes.accueil);
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
        <OtpInput value={code} onChange={setCode} disabled={remaining === 0} />
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

      <div className="safe-bottom mt-auto pt-10">
        <Button size="lg" onClick={handleSubmit} disabled={!complete}>
          Suivant
        </Button>
      </div>
    </main>
  );
}
