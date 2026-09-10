import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { loadEnvFile } from 'node:process';
import { handleHealth, handleReceipts, handleSync, handleVoiceParse } from './handlers';
import { HttpError, cors, readJson, sendEmpty, sendJson } from './lib/http';

for (const file of ['.env.local', '.env']) {
  try {
    loadEnvFile(file);
  } catch {
    /* optionnel */
  }
}

const PORT = Number.parseInt(process.env.PORT ?? '3460', 10);
const HOST = process.env.HOST?.trim() || '127.0.0.1';

type Handler = (body: unknown) => Promise<{ status: number; body: unknown }>;

/** Une seule table : ajouter une route ne demande plus de recopier le transport. */
const POST_ROUTES: Readonly<Record<string, Handler>> = {
  '/api/sync': handleSync,
  '/api/voice/parse': handleVoiceParse,
  '/api/receipts': handleReceipts,
};

async function router(req: IncomingMessage, res: ServerResponse): Promise<void> {
  cors(res);

  if (req.method === 'OPTIONS') {
    sendEmpty(res, 204);
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname.replace(/\/$/, '') || '/';

  if (path === '/api/health' && (req.method === 'GET' || req.method === 'HEAD')) {
    if (req.method === 'HEAD') {
      sendEmpty(res, 204);
      return;
    }
    const result = handleHealth();
    sendJson(res, result.status, result.body);
    return;
  }

  const handler = POST_ROUTES[path];
  if (handler) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      sendJson(res, 405, { error: 'Méthode non autorisée' });
      return;
    }
    const result = await handler(await readJson<unknown>(req));
    sendJson(res, result.status, result.body);
    return;
  }

  sendJson(res, 404, { error: 'Route inconnue' });
}

/**
 * Une erreur attendue porte son code ; toute autre reste côté journal.
 *
 * Renvoyer le message brut au client exposait des détails internes — jusqu'aux
 * messages Postgres — sans rien lui apprendre d'utile.
 */
function fail(res: ServerResponse, error: unknown): void {
  if (error instanceof HttpError) {
    sendJson(res, error.status, { error: error.message });
    return;
  }
  console.error('Erreur non gérée :', error);
  sendJson(res, 500, { error: 'Erreur serveur' });
}

const server = createServer((req, res) => {
  void router(req, res).catch((error: unknown) => fail(res, error));
});

server.listen(PORT, HOST, () => {
  console.log(`AKWÈ backend prêt sur http://${HOST}:${PORT}`);
  console.log(
    'Routes : POST /api/sync · POST /api/voice/parse · POST /api/receipts · GET /api/health',
  );
});

// `tsx watch` et Docker envoient un signal : fermer proprement évite de laisser
// le port occupé par le processus précédent.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
