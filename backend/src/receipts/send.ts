import type { ReceiptRequest, ReceiptResponse } from '../../contracts/api';

/**
 * Envoi du reçu WhatsApp / SMS.
 * Sans jeton : simulation honnête pour la démo (sent=true, id mock).
 */
export async function sendReceipt(request: ReceiptRequest): Promise<ReceiptResponse> {
  const phone = request.member_phone.trim();
  if (!phone) {
    return { sent: false, provider_message_id: null };
  }

  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (request.channel === 'whatsapp' && token && phoneNumberId) {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone.replace(/\s+/g, ''),
          type: 'text',
          text: {
            body: `AKWÈ — Cotisation enregistrée (réf. ${request.transaction_id}). Merci.`,
          },
        }),
      },
    );

    if (!response.ok) {
      return { sent: false, provider_message_id: null };
    }

    const data = (await response.json()) as {
      messages?: Array<{ id?: string }>;
    };
    return {
      sent: true,
      provider_message_id: data.messages?.[0]?.id ?? null,
    };
  }

  // Mode démo / sandbox : on confirme l'émission sans provider réel.
  return {
    sent: true,
    provider_message_id: `mock-${request.channel}-${request.transaction_id.slice(0, 8)}`,
  };
}
