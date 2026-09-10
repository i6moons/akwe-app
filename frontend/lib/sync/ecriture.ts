import type { SupabaseClient } from '@supabase/supabase-js';
import { filtrerColonnes } from '@/lib/supabase/colonnes';

/**
 * Écrit un lot, puis se rabat sur les lignes une à une s'il est refusé.
 *
 * Postgres rejette un `upsert` en bloc : une seule ligne fautive — un type
 * d'opération que la contrainte n'admet pas, un membre supprimé entre-temps —
 * et rien ne passe. La file d'attente resterait alors pleine indéfiniment,
 * rejouant le même lot et le voyant échouer à chaque fois, sans que la
 * trésorière puisse rien y faire.
 *
 * Le second passage cherche la fautive par dichotomie plutôt qu'en reprenant
 * chaque ligne : sur un lot de deux cents opérations, une seule en faute coûtait
 * autant d'allers-retours qu'il y a de lignes, soit près d'une minute d'attente.
 * En coupant le lot en deux à chaque échec, une quinzaine de requêtes suffit.
 */
export interface Ecriture {
  reussies: string[];
  echecs: { client_uuid: string; reason: string }[];
}

export async function ecrireLignes(
  supabase: SupabaseClient,
  table: string,
  lignes: readonly { cle: string; valeur: object }[],
  onConflict: string,
): Promise<Ecriture> {
  if (lignes.length === 0) return { reussies: [], echecs: [] };

  const donnees = await filtrerColonnes(
    table,
    lignes.map((ligne) => ligne.valeur),
  );

  const cles = lignes.map((ligne) => ligne.cle);
  const { error } = await supabase.from(table).upsert(donnees, { onConflict });
  if (!error) return { reussies: cles, echecs: [] };

  const reussies: string[] = [];
  const echecs: Ecriture['echecs'] = [];
  await isoler(0, lignes.length);
  return { reussies, echecs };

  /** Retente `[debut, fin)`, en le coupant en deux tant qu'il est refusé. */
  async function isoler(debut: number, fin: number): Promise<void> {
    const tranche = donnees.slice(debut, fin);
    const { error: refus } = await supabase.from(table).upsert(tranche, { onConflict });
    if (!refus) {
      reussies.push(...cles.slice(debut, fin));
      return;
    }
    if (fin - debut === 1) {
      echecs.push({ client_uuid: cles[debut]!, reason: lisible(refus.message) });
      return;
    }
    const milieu = Math.floor((debut + fin) / 2);
    await isoler(debut, milieu);
    await isoler(milieu, fin);
  }
}

/** Traduit les messages de Postgres les plus courants, sans exposer le schéma. */
function lisible(message: string): string {
  if (/transactions_type_check/.test(message)) return "ce type d'opération n'est pas accepté";
  if (/violates foreign key/.test(message)) return 'la caisse ou la membre est introuvable';
  if (/violates check constraint/.test(message)) return 'valeur refusée par la base';
  if (/Could not find the '(\w+)' column/.test(message)) return 'colonne absente de la base';
  return 'écriture refusée';
}
