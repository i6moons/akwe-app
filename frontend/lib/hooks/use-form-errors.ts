'use client';

import { useCallback, useState } from 'react';

/** Une règle par champ : renvoie le message à afficher, ou `null` si tout va bien. */
export type Rules<T extends string> = Partial<Record<T, () => string | null>>;

export interface FormErrors<T extends string> {
  /** Message à passer au `Field`. Rien tant que le champ n'a pas été quitté. */
  error: (champ: T) => string | undefined;
  /** À brancher sur `onBlur` : valide le champ dès qu'on le quitte. */
  blur: (champ: T) => () => void;
  /** Valide tout. Renvoie `true` si le formulaire peut partir. */
  valider: () => boolean;
  /** Efface l'erreur d'un champ pendant la frappe. */
  effacer: (champ: T) => void;
  /** Erreur globale du formulaire, en dessous des champs. */
  formError: string | null;
  setFormError: (message: string | null) => void;
}

/**
 * Validation au fil de la saisie.
 *
 * Attendre la validation finale pour signaler une erreur oblige à remonter tout
 * le formulaire ; ici l'erreur apparaît dès qu'on quitte le champ fautif, et
 * disparaît dès qu'on le corrige.
 */
export function useFormErrors<T extends string>(rules: Rules<T>): FormErrors<T> {
  const [errors, setErrors] = useState<Partial<Record<T, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const verifier = useCallback((champ: T): string | null => rules[champ]?.() ?? null, [rules]);

  const blur = useCallback(
    (champ: T) => () => {
      const message = verifier(champ);
      setErrors((actuelles) => ({ ...actuelles, [champ]: message ?? undefined }));
    },
    [verifier],
  );

  const effacer = useCallback((champ: T) => {
    setErrors((actuelles) => ({ ...actuelles, [champ]: undefined }));
  }, []);

  const valider = useCallback((): boolean => {
    const suivantes: Partial<Record<T, string>> = {};
    for (const champ of Object.keys(rules) as T[]) {
      const message = rules[champ]?.();
      if (message) suivantes[champ] = message;
    }
    setErrors(suivantes);
    setFormError(null);
    return Object.keys(suivantes).length === 0;
  }, [rules]);

  const error = useCallback((champ: T) => errors[champ], [errors]);

  return { error, blur, valider, effacer, formError, setFormError };
}
