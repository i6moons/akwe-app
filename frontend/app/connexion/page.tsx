'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { FixedAction } from '@/components/ui/fixed-action';
import { FieldError } from '@/components/ui/field';
import { m } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { formatPhone } from '@/lib/format';
import { setPendingPhone } from '@/lib/auth/session';
import { routes } from '@/lib/routes';

/** Un numéro béninois compte 10 chiffres une fois l'indicatif retiré. */
const PHONE_LENGTH = 10;

/** Maquette « iPhone 17 - 2 » — entrée par numéro de téléphone. */
export default function ConnexionPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [secousse, setSecousse] = useState(0);

  const digits = phone.replace(/\D/g, '');
  const isValid = digits.length === PHONE_LENGTH;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!isValid) {
      setError('Entrez les 10 chiffres de votre numéro.');
      // Change de clé pour rejouer la secousse même si l'erreur est identique.
      setSecousse((tour) => tour + 1);
      return;
    }
    setPendingPhone(digits);
    router.push(routes.verification);
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <Wordmark className="shrink-0 pt-6" />

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center">
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold text-white">Bienvenue !</h1>
            <p className="pt-2 text-white/80">
              Entrez votre numéro de téléphone pour vous connecter
            </p>
          </div>

          <m.div
            key={secousse}
            animate={secousse > 0 ? { x: [0, -10, 10, -10, 10, 0] } : undefined}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={cn(
              'mt-10 flex items-stretch rounded-xl border-2 transition-colors duration-200',
              error ? 'border-danger-500' : 'border-brand-500 focus-within:border-accent-500',
            )}
          >
            <span className="border-brand-500 flex items-center gap-2 border-r px-4 text-white">
              <span aria-hidden className="text-lg">
                🇧🇯
              </span>
              <span className="font-medium">+ 229</span>
            </span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              aria-label="Numéro de téléphone"
              placeholder="Numéro de téléphone"
              value={phone}
              onChange={(event) => {
                setPhone(formatPhone(event.target.value));
                setError(null);
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'erreur-telephone' : undefined}
              onBlur={() => {
                if (phone && !isValid) setError('Entrez les 10 chiffres de votre numéro.');
              }}
              className="text-field min-h-14 flex-1 bg-transparent px-4 text-white outline-none placeholder:text-white/50"
            />
          </m.div>

          <div className="pt-3">
            <FieldError id="erreur-telephone" message={error} />
          </div>
        </div>

        <FixedAction className="border-transparent bg-transparent backdrop-blur-none">
          <Button type="submit" size="lg" disabled={!isValid}>
            Envoyez le code OTP
          </Button>
        </FixedAction>
      </form>
    </main>
  );
}
