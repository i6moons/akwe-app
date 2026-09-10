'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { FixedAction } from '@/components/ui/fixed-action';
import { FieldError } from '@/components/ui/field';
import { apiUrl } from '@/lib/api';
import { getSession, renommerSession } from '@/lib/auth/session';
import { jetonDAcces } from '@/lib/auth/token';
import { routes } from '@/lib/routes';

/** Une initiale et un nom au minimum ; au-delà, c'est une phrase, pas un nom. */
const MIN_NOM = 2;
const MAX_NOM = 60;

/**
 * Dernière étape de la première connexion : comment vous appelez-vous ?
 *
 * Demandé une seule fois, à la création du compte. Toute l'application salue
 * ensuite la trésorière par son nom, et ce nom accompagne les caisses qu'elle
 * crée. C'est aussi ce qui distingue deux comptes à l'écran.
 */
export default function ProfilPage() {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    // Personne n'est connectée : cet écran n'a rien à enregistrer.
    if (!getSession()) router.replace(routes.connexion);
  }, [router]);

  const propre = nom.trim().replace(/\s+/g, ' ');
  const valide = propre.length >= MIN_NOM && propre.length <= MAX_NOM;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!valide || enCours) return;
    setEnCours(true);
    setErreur(null);

    try {
      const reponse = await fetch(apiUrl('/api/auth/profil'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jetonDAcces()}`,
        },
        body: JSON.stringify({ fullName: propre }),
      });
      if (!reponse.ok) throw new Error('refus');
    } catch {
      setEnCours(false);
      setErreur('Enregistrement impossible. Vérifiez votre réseau.');
      return;
    }

    renommerSession(propre);
    router.replace(routes.accueil);
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 pt-16 pb-8">
      <Wordmark />

      <div className="pt-14 text-center">
        <h1 className="font-display text-3xl font-bold text-white">Votre nom</h1>
        <p className="pt-2 text-white/80">
          Pour que votre carnet vous reconnaisse et que vos reçus portent votre nom
        </p>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-1 flex-col pt-12">
        <input
          type="text"
          autoComplete="name"
          autoFocus
          aria-label="Votre nom"
          placeholder="Par exemple : Adjoavi Hounkpatin"
          value={nom}
          onChange={(event) => {
            setNom(event.target.value);
            setErreur(null);
          }}
          maxLength={MAX_NOM}
          aria-invalid={Boolean(erreur)}
          aria-describedby={erreur ? 'erreur-nom' : undefined}
          disabled={enCours}
          className="text-field border-brand-500 focus:border-accent-500 min-h-14 rounded-xl border-2 bg-transparent px-4 text-white outline-none placeholder:text-white/50"
        />

        <div className="pt-3">
          <FieldError id="erreur-nom" message={erreur} />
        </div>

        <FixedAction>
          <Button type="submit" size="lg" disabled={!valide || enCours}>
            {enCours ? 'Enregistrement…' : 'Continuer'}
          </Button>
        </FixedAction>
      </form>
    </main>
  );
}
