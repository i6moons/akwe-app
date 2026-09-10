import type { ReceiptRequest, ReceiptResponse } from '../../contracts/api';

/** 8 s : le reçu est un accusé, pas une étape bloquante de l'enregistrement. */
const TIMEOUT_MS = 8_000;

const GRAPH_VERSION = 'v19.0';

/**
 * Numéro utilisable par un opérateur : indicatif optionnel puis 8 à 15
 * chiffres. Un champ non vide ne suffisait pas — « inconnu » partait vers
 * l'API, qui répondait par une erreur générique.
 */
function toE164(raw: string): string | null {
  const compact = raw.replace(/[\s.\-()]/g, '');
  return /^\+?\d{8,15}$/.test(compact) ? compact : null;
}

function receiptText(request: ReceiptRequest): string {
  return `AKWÈ — Cotisation enregistrée (réf. ${request.transaction_id}). Merci.`;
}

async function sendWhatsApp(
  request: ReceiptRequest,
  phone: string,
  token: string,
  phoneNumberId: string,
): Promise<ReceiptResponse> {
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: receiptText(request) },
      }),
    },
  );

  if (!response.ok) return { sent: false, provider_message_id: null };

  const data = (await response.json()) as { messages?: Array<{ id?: string }> };
  return { sent: true, provider_message_id: data.messages?.[0]?.id ?? null };
}

/**
 * Envoi du reçu WhatsApp / SMS.
 * Sans jeton : simulation honnête pour la démo (sent=true, id mock).
 *
 * L'appel réseau est enveloppé : une coupure pendant l'envoi levait une
 * exception qui repartait en 500, laissant croire que la cotisation n'avait pas
 * été enregistrée alors qu'elle l'était déjà. Un reçu non parti se réessaie ;
 * une cotisation crue perdue se ressaisit en double.
 */
export async function sendReceipt(request: ReceiptRequest): Promise<ReceiptResponse> {
  const phone = toE164(request.member_phone);
  if (phone === null) {
    return { sent: false, provider_message_id: null };
  }

  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (request.channel === 'whatsapp' && token && phoneNumberId) {
    try {
      return await sendWhatsApp(request, phone, token, phoneNumberId);
    } catch {
      return { sent: false, provider_message_id: null };
    }
  }

  // Mode démo / sandbox : on confirme l'émission sans provider réel.
  return {
    sent: true,
    provider_message_id: `mock-${request.channel}-${request.transaction_id.slice(0, 8)}`,
  };
}
