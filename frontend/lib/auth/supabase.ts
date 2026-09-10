'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase du navigateur.
 *
 * Il ne sert qu'à l'authentification : les lectures et écritures métier passent
 * par nos routes `/api/*`, qui contrôlent l'appartenance des données. C'est la
 * clé publique qui est utilisée ici, celle qui est faite pour être exposée.
 *
 * La bibliothèque conserve la session et renouvelle le jeton toute seule. Sans
 * ce renouvellement, la trésorière serait déconnectée au bout d'une heure et ses
 * envois échoueraient en silence, la file d'attente se contentant d'afficher
 * « en attente ».
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const CLE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let instance: SupabaseClient | null = null;

/** `null` quand aucun projet n'est configuré : l'application reste utilisable hors ligne. */
export function supabase(): SupabaseClient | null {
  if (!URL || !CLE) return null;
  instance ??= createClient(URL, CLE, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return instance;
}

/**
 * Adresse technique dérivée du numéro.
 *
 * Supabase authentifie par courriel ou par téléphone ; le second exige un
 * fournisseur SMS payant. On garde donc l'écran au numéro, tel que les
 * trésorières le connaissent, et l'on fabrique une adresse stable à partir de
 * ce numéro. Le domaine est réservé aux exemples par la RFC 2606 : aucun
 * courriel ne pourra jamais y être livré, ce qui est précisément voulu.
 */
export function adresseDepuisNumero(phone: string): string {
  return `${phone.replace(/\D/g, '')}@akwe.invalid`;
}
