import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Erreur transportant le code HTTP à renvoyer. Sans elle, un corps JSON
 * malformé remontait jusqu'au `catch` du serveur et repartait en 500 : le
 * client croyait à une panne serveur alors que sa requête était en cause, et
 * réessayait indéfiniment de vider une file d'attente irrecevable.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/**
 * 1 Mio. Un lot de 200 opérations pèse quelques dizaines de kilo-octets ;
 * au-delà, il s'agit d'une erreur ou d'un abus, et lire le flux jusqu'au bout
 * remplirait la mémoire du serveur.
 */
export const MAX_BODY_BYTES = 1_048_576;

export async function readJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer: Buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    size += buffer.byteLength;
    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, 'Corps de requête trop volumineux');
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) throw new HttpError(400, 'Corps JSON vide');

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new HttpError(400, 'JSON invalide');
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent || res.writableEnded) return;
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

export function sendEmpty(res: ServerResponse, status: number): void {
  if (res.headersSent || res.writableEnded) return;
  res.writeHead(status, { 'Cache-Control': 'no-store' });
  res.end();
}

/**
 * `CORS_ORIGIN` restreint l'origine autorisée en déploiement ; le défaut `*`
 * garde la démo locale utilisable depuis n'importe quel port de développement.
 */
export function cors(res: ServerResponse): void {
  const origin = process.env.CORS_ORIGIN?.trim() || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  if (origin !== '*') res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '600');
}
