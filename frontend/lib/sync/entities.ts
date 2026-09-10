/**
 * Lecture des caisses et des membres reçus de la file d'attente.
 *
 * La validation des transactions vit dans `validate.ts` ; celle-ci s'occupe des
 * deux entités qui les précèdent. L'ordre compte : une trésorière hors ligne
 * crée sa caisse, y inscrit ses membres puis note des cotisations, et le tout
 * remonte dans un même lot. Enregistrer les transactions avant la caisse
 * violerait la clé étrangère et ferait tout échouer.
 *
 * Les identifiants sont ceux produits par le téléphone, ce qui rend l'écriture
 * idempotente sans colonne supplémentaire : rejouer la file réécrit la même
 * ligne au lieu d'en créer une seconde.
 */

const FREQUENCES = ['daily', 'weekly', 'monthly'] as const;
type Frequence = (typeof FREQUENCES)[number];

export interface LigneCaisse {
  id: string;
  name: string;
  owner_id: string;
  contribution_amount: number;
  frequency: Frequence;
  location: string | null;
  is_active: boolean;
}

export interface LigneMembre {
  id: string;
  group_id: string;
  full_name: string;
  phone: string | null;
  joined_at: string;
  is_active: boolean;
}

export interface EntreeLot {
  client_uuid: string;
  entity: 'transaction' | 'member' | 'group';
  payload: Record<string, unknown>;
}

function texte(valeur: unknown): string {
  return typeof valeur === 'string' ? valeur.trim() : '';
}

function horodatage(valeur: unknown): string {
  const brut = texte(valeur);
  const date = brut ? new Date(brut) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

/** Sépare le lot par entité en conservant l'ordre d'arrivée. */
export function separerParEntite(body: unknown): EntreeLot[] {
  const record = body as { batch?: unknown } | null;
  if (!record || !Array.isArray(record.batch)) return [];

  const entrees: EntreeLot[] = [];
  for (const item of record.batch) {
    if (!item || typeof item !== 'object') continue;
    const ligne = item as Record<string, unknown>;
    const entity = ligne.entity;
    if (entity !== 'transaction' && entity !== 'member' && entity !== 'group') continue;
    const client_uuid = texte(ligne.client_uuid);
    if (!client_uuid) continue;
    const payload =
      ligne.payload && typeof ligne.payload === 'object'
        ? (ligne.payload as Record<string, unknown>)
        : {};
    entrees.push({ client_uuid, entity, payload });
  }
  return entrees;
}

export function lireCaisse(entree: EntreeLot, ownerId: string): LigneCaisse | null {
  const p = entree.payload;
  // L'identifiant de la caisse est la clé d'idempotence elle-même.
  const id = texte(p.id) || entree.client_uuid;
  const name = texte(p.name);
  if (!id || !name) return null;

  const brut = p.contributionAmount ?? p.contribution_amount;
  const montant = typeof brut === 'number' ? brut : Number.parseInt(texte(brut), 10);
  // Les montants sont des entiers de FCFA : un flottant ou un zéro n'a pas de sens.
  if (!Number.isInteger(montant) || montant <= 0) return null;

  const frequence = texte(p.frequency);
  if (!(FREQUENCES as readonly string[]).includes(frequence)) return null;

  const location = texte(p.location);
  return {
    id,
    name,
    owner_id: ownerId,
    contribution_amount: montant,
    frequency: frequence as Frequence,
    location: location || null,
    is_active: p.isActive === undefined ? true : Boolean(p.isActive ?? p.is_active),
  };
}

export function lireMembre(
  entree: EntreeLot,
  caissesAutorisees: ReadonlySet<string>,
): LigneMembre | null {
  const p = entree.payload;
  const id = texte(p.id) || entree.client_uuid;
  const group_id = texte(p.groupId) || texte(p.group_id);
  const full_name = texte(p.fullName) || texte(p.full_name);
  if (!id || !group_id || !full_name) return null;
  // Une membre ne peut être inscrite que dans une caisse appartenant à l'appelante.
  if (!caissesAutorisees.has(group_id)) return null;

  const phone = texte(p.phone);
  return {
    id,
    group_id,
    full_name,
    phone: phone || null,
    joined_at: horodatage(p.joinedAt ?? p.joined_at),
    is_active: p.isActive === undefined ? true : Boolean(p.isActive ?? p.is_active),
  };
}
