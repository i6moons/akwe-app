/**
 * Colonnes réellement présentes dans la base, table par table.
 *
 * Le projet hébergé a été monté avant `0001_init.sql` et lui a divergé : le
 * quartier d'une caisse ou la phrase dictée d'une opération y manquent. Écrire
 * une colonne absente fait échouer tout le lot avec « Could not find the
 * 'is_active' column », et la trésorière voit sa file rester bloquée sans
 * comprendre pourquoi.
 *
 * On interroge donc la description que PostgREST publie de lui-même, et l'on
 * n'envoie que ce que la base sait recevoir. La synchronisation reste possible
 * sur un schéma incomplet ; la migration `0004` la rend complète.
 */

import { fetchAvecDelai } from '@/lib/api';

const URL_BASE = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const CLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/** Mémorisé pour la durée du processus : le schéma ne bouge pas en pleine démonstration. */
let cache: Promise<Record<string, string[]>> | null = null;

async function decrire(): Promise<Record<string, string[]>> {
  // La promesse ci-dessus est mémorisée : sans échéance, une requête pendante
  // se figeait dans le cache et bloquait toute écriture ultérieure du processus.
  const reponse = await fetchAvecDelai(`${URL_BASE}/rest/v1/`, {
    headers: { apikey: CLE, Authorization: `Bearer ${CLE}` },
    cache: 'no-store',
  });
  if (!reponse.ok) return {};

  const spec = (await reponse.json()) as {
    definitions?: Record<string, { properties?: Record<string, unknown> }>;
  };

  const tables: Record<string, string[]> = {};
  for (const [nom, definition] of Object.entries(spec.definitions ?? {})) {
    tables[nom] = Object.keys(definition.properties ?? {});
  }
  return tables;
}

/**
 * Retire d'une ligne les champs que la table ne possède pas.
 *
 * En cas d'échec de la description, la ligne part telle quelle : mieux vaut une
 * erreur explicite de Postgres qu'une écriture silencieusement amputée.
 */
export async function filtrerColonnes(
  table: string,
  lignes: readonly object[],
): Promise<Record<string, unknown>[]> {
  const brutes = lignes.map((ligne) => ({ ...ligne }) as Record<string, unknown>);
  if (brutes.length === 0) return [];
  if (!URL_BASE || !CLE) return brutes;

  cache ??= decrire().catch(() => ({}));
  const connues = (await cache)[table];
  if (!connues || connues.length === 0) return brutes;

  const autorisees = new Set(connues);
  return brutes.map((ligne) =>
    Object.fromEntries(Object.entries(ligne).filter(([champ]) => autorisees.has(champ))),
  );
}
