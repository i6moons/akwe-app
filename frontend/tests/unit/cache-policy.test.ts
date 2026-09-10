import { describe, expect, it } from 'vitest';
import { classifyRequest, fontUrlsFromMediaFiles, type RequestView } from '@/lib/pwa/cache-policy';

const ORIGIN = 'https://akwe.test';

function view(partial: Partial<RequestView> & Pick<RequestView, 'url'>): RequestView {
  return {
    method: 'GET',
    mode: 'cors',
    destination: '',
    pageOrigin: ORIGIN,
    header: () => null,
    ...partial,
  };
}

describe('classifyRequest', () => {
  it('laisse passer les POST et les origines étrangères', () => {
    expect(classifyRequest(view({ url: `${ORIGIN}/accueil`, method: 'POST' }))).toBe('bypass');
    expect(classifyRequest(view({ url: 'https://autre.test/accueil', pageOrigin: ORIGIN }))).toBe(
      'bypass',
    );
  });

  it('ne met jamais en cache les appels d’API', () => {
    expect(classifyRequest(view({ url: `${ORIGIN}/api/sync` }))).toBe('bypass');
    expect(classifyRequest(view({ url: `${ORIGIN}/api/health` }))).toBe('bypass');
  });

  it('traite une navigation comme réseau d’abord, cache ensuite', () => {
    expect(
      classifyRequest(view({ url: `${ORIGIN}/caisses/detail?caisse=abc`, mode: 'navigate' })),
    ).toBe('navigate');
    expect(
      classifyRequest(
        view({ url: `${ORIGIN}/accueil`, mode: 'same-origin', destination: 'document' }),
      ),
    ).toBe('navigate');
  });

  it('ne sert pas un vol RSC depuis le cache-first', () => {
    expect(classifyRequest(view({ url: `${ORIGIN}/accueil?_rsc=abc` }))).toBe('fresh');
    expect(
      classifyRequest(
        view({
          url: `${ORIGIN}/accueil`,
          header: (name) => (name.toLowerCase() === 'rsc' ? '1' : null),
        }),
      ),
    ).toBe('fresh');
    expect(
      classifyRequest(
        view({
          url: `${ORIGIN}/accueil`,
          header: (name) =>
            name.toLowerCase() === 'next-router-state-tree' ? '%5B%22%22%5D' : null,
        }),
      ),
    ).toBe('fresh');
  });

  it('sert JS, CSS, polices et images depuis le cache d’abord', () => {
    expect(
      classifyRequest(
        view({ url: `${ORIGIN}/_next/static/chunks/app/page.js`, destination: 'script' }),
      ),
    ).toBe('static');
    expect(
      classifyRequest(
        view({
          url: `${ORIGIN}/_next/static/media/inter.woff2`,
          destination: 'font',
        }),
      ),
    ).toBe('static');
    expect(classifyRequest(view({ url: `${ORIGIN}/image1.png`, destination: 'image' }))).toBe(
      'static',
    );
  });
});

describe('fontUrlsFromMediaFiles', () => {
  it('ne retient que les fichiers de police', () => {
    expect(fontUrlsFromMediaFiles(['inter.woff2', 'inknut.woff', 'chunk.js', 'readme.md'])).toEqual(
      ['/_next/static/media/inter.woff2', '/_next/static/media/inknut.woff'],
    );
  });
});
