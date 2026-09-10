import type { IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { HttpError, MAX_BODY_BYTES, readJson } from '../src/lib/http';

function request(body: string | Buffer): IncomingMessage {
  return Readable.from([Buffer.from(body)]) as unknown as IncomingMessage;
}

async function statusOf(body: string | Buffer): Promise<number | null> {
  try {
    await readJson(request(body));
    return null;
  } catch (error) {
    return error instanceof HttpError ? error.status : -1;
  }
}

describe('readJson', () => {
  it('lit un corps JSON valide', async () => {
    await expect(readJson(request('{"batch":[]}'))).resolves.toEqual({ batch: [] });
  });

  it('renvoie 400 sur un corps vide ou illisible, jamais 500', async () => {
    await expect(statusOf('')).resolves.toBe(400);
    await expect(statusOf('   ')).resolves.toBe(400);
    await expect(statusOf('{"batch":')).resolves.toBe(400);
    await expect(statusOf('pas du json')).resolves.toBe(400);
  });

  it('coupe un corps trop volumineux au lieu de remplir la mémoire', async () => {
    await expect(statusOf(Buffer.alloc(MAX_BODY_BYTES + 1, 0x61))).resolves.toBe(413);
  });
});
