import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { loadEnvFile } from 'node:process';
import {
  handleHealth,
  handleReceipts,
  handleSync,
  handleVoiceParse,
} from './handlers';
import { cors, readJson, sendEmpty, sendJson } from './lib/http';
import type {
  ReceiptRequest,
  SyncRequest,
  VoiceParseRequest,
} from '../contracts/api';

try {
  loadEnvFile('.env.local');
} catch {
  /* optional */
}
try {
  loadEnvFile('.env');
} catch {
  /* optional */
}

const PORT = Number.parseInt(process.env.PORT ?? '3460', 10);

async function router(req: IncomingMessage, res: ServerResponse): Promise<void> {
  cors(res);
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname.replace(/\/$/, '') || '/';

  if (req.method === 'OPTIONS') {
    sendEmpty(res, 204);
    return;
  }

  if (path === '/api/health' && (req.method === 'GET' || req.method === 'HEAD')) {
    if (req.method === 'HEAD') {
      sendEmpty(res, 204);
      return;
    }
    const result = handleHealth();
    sendJson(res, result.status, result.body);
    return;
  }

  if (path === '/api/sync' && req.method === 'POST') {
    const body = await readJson<SyncRequest>(req);
    const result = await handleSync(body);
    sendJson(res, result.status, result.body);
    return;
  }

  if (path === '/api/voice/parse' && req.method === 'POST') {
    const body = await readJson<VoiceParseRequest>(req);
    const result = await handleVoiceParse(body);
    sendJson(res, result.status, result.body);
    return;
  }

  if (path === '/api/receipts' && req.method === 'POST') {
    const body = await readJson<ReceiptRequest>(req);
    const result = await handleReceipts(body);
    sendJson(res, result.status, result.body);
    return;
  }

  sendJson(res, 404, { error: 'Route inconnue' });
}

createServer((req, res) => {
  void router(req, res).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    sendJson(res, 500, { error: message });
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`AKWÈ backend prêt sur http://127.0.0.1:${PORT}`);
  console.log('Routes : POST /api/sync · POST /api/voice/parse · POST /api/receipts · GET /api/health');
});
