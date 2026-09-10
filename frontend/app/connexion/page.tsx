'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { FixedAction } from '@/components/ui/fixed-action';
import { FieldError } from '@/components/ui/field';
import { ChampTelephone } from '@/components/auth/champ-telephone';
import { m } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { formatPhone } from '@/lib/format';
import { seConnecter } from '@/lib/auth/connexion';
import { routes } from '@/lib/routes';

/** Un numéro béninois compte 10 chiffres, le code fixe en compte 6. */
const PHONE_LENGTH = 10;
const CODE_LENGTH = 6;

/** Maquette « iPhone 17 - 2 » — connexion par numéro et code fixe. */
export default function ConnexionPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secousse, setSecousse] = useState(0);
  const [enCours, setEnCours] = useState(false);

  const digits = phone.replace(/\D/g, '');
  const isValid = digits.length === PHONE_LENGTH && code.length === CODE_LENGTH;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (enCours) return;
    if (!isValid) {
      setError('Entrez votre numéro et votre code à 6 chiffres.');
      // Change de clé pour rejouer la secousse même si l'erreur est identique.
      setSecousse((tour) => tour + 1);
      return;
    }

    setEnCours(true);
    setError(null);
    const echec = await seConnecter(digits, code);
    if (echec === null) {
      router.replace(routes.accueil);
      return;
    }

    setEnCours(false);
    setSecousse((tour) => tour + 1);
    setError(
      echec === 'reseau'
        ? 'Connexion impossible. Vérifiez votre réseau.'
        : 'Numéro ou code incorrect.',
    );
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 pt-16 pb-8">
      <Wordmark />

      <div className="pt-14 text-center">
        <h1 className="font-display text-3xl font-bold text-white">Bienvenue !</h1>
        <p className="pt-2 text-white/80">
          Entrez votre numéro de téléphone
          <br />
          et votre mot de passe pour vous connecter
        </p>
      </div>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-1 flex-col gap-4 pt-12"
      >
        <m.div
          key={secousse}
          animate={secousse > 0 ? { x: [0, -10, 10, -10, 10, 0] } : undefined}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="flex flex-col gap-4"
        >
          <ChampTelephone
            value={phone}
            onChange={(valeur) => {
              setPhone(formatPhone(valeur));
              setError(null);
            }}
            onBlur={() => {
              if (phone && digits.length !== PHONE_LENGTH) {
                setError('Entrez les 10 chiffres de votre numéro.');
              }
            }}
            invalide={Boolean(error)}
            describedBy={error ? 'erreur-connexion' : undefined}
          />

          <div
            className={cn(
              'flex items-stretch rounded-xl border-2 transition-colors duration-200',
              error ? 'border-danger-500' : 'border-brand-500 focus-within:border-accent-500',
            )}
          >
            <input
              type={visible ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="current-password"
              aria-label="Mot de passe"
              placeholder="Mot de passe"
              value={code}
              maxLength={CODE_LENGTH}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH));
                setError(null);
              }}
              className="champ-sombre text-field min-h-14 flex-1 bg-transparent px-4 tracking-[0.3em] text-white outline-none placeholder:tracking-normal placeholder:text-white/50"
            />
            <button
              type="button"
              onClick={() => setVisible((etat) => !etat)}
              aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="min-w-touch flex items-center justify-center px-4 text-white/70"
            >
              {visible ? (
                <EyeOff className="size-5" aria-hidden />
              ) : (
                <Eye className="size-5" aria-hidden />
              )}
            </button>
          </div>
        </m.div>

        <FieldError id="erreur-connexion" message={error} />

        <p className="pt-2 text-center text-sm text-white/80">
          Vous n&apos;avez pas de compte ?{' '}
          <Link href={routes.inscription} className="text-accent-500 font-semibold">
            S&apos;inscrire
          </Link>
        </p>

        <FixedAction>
          <Button type="submit" size="lg" disabled={!isValid || enCours}>
            {enCours ? 'Connexion…' : 'Se connecter'}
          </Button>
        </FixedAction>
      </form>
    </main>
  );
}
