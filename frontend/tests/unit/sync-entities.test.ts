import { describe, expect, it } from 'vitest';
import { lireCaisse, lireMembre, separerParEntite, type EntreeLot } from '@/lib/sync/entities';

const PROPRIETAIRE = '11111111-1111-1111-1111-111111111111';
const CAISSE = '22222222-2222-2222-2222-222222222222';

function entree(entity: EntreeLot['entity'], payload: Record<string, unknown>): EntreeLot {
  return { client_uuid: 'lot-1', entity, payload };
}

describe('séparation du lot par entité', () => {
  it('conserve les trois entités et ignore ce qui est inconnu', () => {
    const entrees = separerParEntite({
      batch: [
        { client_uuid: 'a', entity: 'group', payload: {} },
        { client_uuid: 'b', entity: 'member', payload: {} },
        { client_uuid: 'c', entity: 'transaction', payload: {} },
        { client_uuid: 'd', entity: 'inconnue', payload: {} },
        { entity: 'group', payload: {} },
      ],
    });

    expect(entrees.map((item) => item.entity)).toEqual(['group', 'member', 'transaction']);
  });

  it('renvoie une liste vide quand le corps est inexploitable', () => {
    expect(separerParEntite(null)).toEqual([]);
    expect(separerParEntite({ batch: 'texte' })).toEqual([]);
  });
});

describe('lecture d’une caisse', () => {
  const valide = {
    id: CAISSE,
    name: 'Tontine Ayaba',
    contributionAmount: 2000,
    frequency: 'weekly',
    location: 'Godomey',
  };

  it('rattache la caisse à la trésorière qui synchronise', () => {
    const ligne = lireCaisse(entree('group', valide), PROPRIETAIRE);
    expect(ligne?.owner_id).toBe(PROPRIETAIRE);
    expect(ligne?.contribution_amount).toBe(2000);
  });

  it('refuse un montant qui n’est pas un entier positif de FCFA', () => {
    expect(
      lireCaisse(entree('group', { ...valide, contributionAmount: 0 }), PROPRIETAIRE),
    ).toBeNull();
    expect(
      lireCaisse(entree('group', { ...valide, contributionAmount: 1500.5 }), PROPRIETAIRE),
    ).toBeNull();
  });

  it('refuse une fréquence hors des trois valeurs admises', () => {
    expect(
      lireCaisse(entree('group', { ...valide, frequency: 'annuel' }), PROPRIETAIRE),
    ).toBeNull();
  });

  it('retombe sur la clé d’idempotence quand la charge utile n’a pas d’identifiant', () => {
    const { id, ...sansId } = valide;
    void id;
    expect(lireCaisse(entree('group', sansId), PROPRIETAIRE)?.id).toBe('lot-1');
  });
});

describe('lecture d’une membre', () => {
  const caisses = new Set([CAISSE]);
  const valide = { id: 'm-1', groupId: CAISSE, fullName: 'Adjovi Sébastien' };

  it('accepte une membre rattachée à une caisse de la trésorière', () => {
    expect(lireMembre(entree('member', valide), caisses)?.group_id).toBe(CAISSE);
  });

  it('refuse une membre rattachée à une caisse qui ne lui appartient pas', () => {
    expect(lireMembre(entree('member', { ...valide, groupId: 'autre' }), caisses)).toBeNull();
  });

  it('refuse une membre sans nom', () => {
    expect(lireMembre(entree('member', { ...valide, fullName: '  ' }), caisses)).toBeNull();
  });
});
