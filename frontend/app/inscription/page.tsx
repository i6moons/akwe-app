'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { FixedAction } from '@/components/ui/fixed-action';
import { FieldError } from '@/components/ui/field';
import { ChampTelephone } from '@/components/auth/champ-telephone';
import { formatPhone } from '@/lib/format';
import { setInscription } from '@/lib/auth/session';
import { routes } from '@/lib/routes';

/** Un numéro béninois compte 10 chiffres une fois l'indicatif retiré. */
const PHONE_LENGTH = 10;
const MIN_NOM = 2;

/** Maquette « iPhone 17 - 22 » — création du compte. */
export default function InscriptionPage() {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [phone, setPhone] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);

  const chiffres = phone.replace(/\D/g, '');
  const nomPropre = nom.trim().replace(/\s+/g, ' ');

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (nomPropre.length < MIN_NOM) {
      setErreur('Entrez votre nom et prénom.');
      return;
    }
    if (chiffres.length !== PHONE_LENGTH) {
      setErreur('Entrez les 10 chiffres de votre numéro.');
      return;
    }
    // Le code se choisit à l'écran suivant : rien n'est créé tant qu'il n'est
    // pas saisi, et une inscription abandonnée ne laisse donc aucun compte.
    setInscription({ phone: chiffres, fullName: nomPropre });
    router.push(routes.motDePasse);
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 pt-16 pb-8">
      <Wordmark />

      <div className="pt-14 text-center">
        <h1 className="font-display text-3xl font-bold text-white">Inscription</h1>
        <p className="pt-2 text-white/80">
          Entrez votre nom et prénom
          <br />
          ainsi que votre numéro de téléphone
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 pt-12">
        <input
          type="text"
          autoComplete="name"
          aria-label="Nom et prénom"
          placeholder="Entrez votre nom et prénom"
          value={nom}
          onChange={(event) => {
            setNom(event.target.value);
            setErreur(null);
          }}
          maxLength={60}
          className="champ-sombre text-field border-brand-500 focus:border-accent-500 min-h-14 rounded-xl border-2 bg-transparent px-4 text-white outline-none placeholder:text-white/50"
        />

        <ChampTelephone
          value={phone}
          onChange={(valeur) => {
            setPhone(formatPhone(valeur));
            setErreur(null);
          }}
          invalide={Boolean(erreur)}
        />

        <FieldError id="erreur-inscription" message={erreur} />

        <p className="pt-2 text-center text-sm text-white/80">
          Vous avez déjà un compte ?{' '}
          <Link href={routes.connexion} className="text-accent-500 font-semibold">
            Se connecter
          </Link>
        </p>

        <FixedAction>
          <Button type="submit" size="lg">
            S&apos;inscrire
          </Button>
        </FixedAction>
      </form>
    </main>
  );
}
