/**
 * Contrats d'API entre le frontend et le backend AKWÈ.
 *
 * Ce fichier est la source de vérité partagée : le frontend s'y conforme dans
 * `frontend/lib/sync/client.ts`. Toute modification ici doit être annoncée à
 * l'équipe, car elle casse la synchronisation hors ligne.
 *
 * Convention : les champs voyagent en `snake_case`, comme en base.
 */

export type TransactionType = 'contribution' | 'payout' | 'loan' | 'repayment' | 'fee';
export type TransactionSource = 'manual' | 'voice' | 'payment_webhook';

/* -------------------------------------------------------------------------- */
/* POST /api/sync — remontée de la file d'attente hors ligne                   */
/* -------------------------------------------------------------------------- */

export interface SyncBatchItem {
  /** Clé d'idempotence. Le serveur fait un upsert dessus. */
  client_uuid: string;
  entity: 'transaction' | 'member' | 'group';
  operation: 'create' | 'update';
  payload: unknown;
}

export interface SyncRequest {
  batch: SyncBatchItem[];
}

export interface SyncResponse {
  /**
   * Les `client_uuid` réellement enregistrés. Le client supprime alors ces
   * entrées de sa file. Tout ce qui n'est pas confirmé sera renvoyé plus tard :
   * rejouer un lot déjà traité doit rester sans effet.
   */
  confirmed: string[];
  rejected?: { client_uuid: string; reason: string }[];
}

/* -------------------------------------------------------------------------- */
/* POST /api/voice/parse — structuration d'une phrase dictée                   */
/* -------------------------------------------------------------------------- */

export interface VoiceParseRequest {
  transcript: string;
  group_id: string;
  /** Noms des membres de la caisse, pour le rapprochement phonétique. */
  member_names: string[];
  /** Date du jour côté client, au format `YYYY-MM-DD`. */
  today: string;
}

export interface VoiceParseResponse {
  member_name: string | null;
  /** Entier FCFA. `null` si l'IA n'est pas sûre — ne jamais deviner un montant. */
  amount: number | null;
  type: TransactionType | 'unknown';
  occurred_at: string | null;
  /** Entre 0 et 1. Sous 0.7, le frontend surligne le champ douteux. */
  confidence: number;
  /** Question courte en français si la phrase est ambiguë. */
  clarification: string | null;
}

/* -------------------------------------------------------------------------- */
/* POST /api/receipts — envoi du reçu WhatsApp / SMS                           */
/* -------------------------------------------------------------------------- */

export interface ReceiptRequest {
  transaction_id: string;
  member_phone: string;
  channel: 'whatsapp' | 'sms';
}

export interface ReceiptResponse {
  sent: boolean;
  provider_message_id: string | null;
}
