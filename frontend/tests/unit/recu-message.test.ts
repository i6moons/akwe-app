import { describe, expect, it } from 'vitest';
import {
  construireMessageRecu,
  lienWhatsApp,
  numeroInternational,
  prenom,
} from '@/lib/recu/message';
import type { DonneesRecu } from '@/lib/recu/image';

const RECU: DonneesRecu = {
  reference: 'A1B2C3',
  type: 'Cotisation',
  montant: '+ 2 000 FCFA',
  membre: 'Adjoavi Hounkpatin',
  caisse: 'Tontine des couturières',
  source: 'Saisie manuelle',
  date: '10 septembre 2026',
  tresoriere: 'Irène Sossou',
};

describe('numéro WhatsApp', () => {
  it("ajoute l'indicatif du Bénin au numéro local", () => {
    expect(numeroInternational('0190000001')).toBe('2290190000001');
  });

  it("n'ajoute pas deux fois l'indicatif", () => {
    expect(numeroInternational('+229 01 90 00 00 01')).toBe('2290190000001');
  });

  it('rejette un numéro trop court pour être appelé', () => {
    expect(numeroInternational('0190')).toBeNull();
    expect(numeroInternational(null)).toBeNull();
  });
});

describe('lien WhatsApp', () => {
  it('ouvre la conversation du membre avec le texte du reçu', () => {
    const lien = lienWhatsApp('0190000001', 'Bonjour Adjoavi');
    expect(lien).toBe('https://wa.me/2290190000001?text=Bonjour%20Adjoavi');
  });

  it('laisse choisir le destinataire quand le membre n’a pas de numéro', () => {
    expect(lienWhatsApp(null, 'Bonjour')).toBe('https://wa.me/?text=Bonjour');
  });
});

describe('message du reçu', () => {
  it('interpelle le membre par son prénom', () => {
    expect(prenom('Adjoavi Hounkpatin')).toBe('Adjoavi');
    expect(prenom('   ')).toBe('chère membre');
  });

  it('répète le montant et la date, lisibles sans ouvrir l’image', () => {
    const message = construireMessageRecu(RECU);
    expect(message).toContain('Bonjour Adjoavi,');
    expect(message).toContain('2 000 FCFA');
    expect(message).toContain('10 septembre 2026');
    expect(message).toContain('Tontine des couturières');
    expect(message).toContain('Reçu n° A1B2C3');
  });

  it('retire le signe du montant, qui n’a pas de sens pour le membre', () => {
    expect(construireMessageRecu(RECU)).not.toContain('+ 2 000');
  });
});
