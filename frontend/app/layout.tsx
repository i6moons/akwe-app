import type { Metadata, Viewport } from 'next';
import { AppProviders } from '@/components/providers';
import { fontVariables } from '@/lib/fonts';
import { siteUrl } from '@/lib/site';
import './globals.css';

const TITRE = 'AKWÈ — Le carnet des tontines';
const DESCRIPTION =
  "Le carnet intelligent des tontines et coopératives d'épargne au Bénin : saisie vocale, hors ligne, reçus et score de crédit.";

/** Vignette des liens partagés. Générée par `scripts/build-icons.mjs`. */
const PARTAGE = [{ url: '/og-image.png', width: 1200, height: 630, alt: TITRE }];

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: TITRE,
  description: DESCRIPTION,
  manifest: '/manifest.webmanifest',
  // iOS ne cherche `apple-touch-icon.png` qu'à la racine du domaine ; le nôtre
  // vit dans `/icons`, il faut donc le désigner explicitement — sans quoi
  // l'icône ajoutée à l'écran d'accueil est une capture de la page.
  icons: { apple: '/icons/apple-touch-icon.png' },
  applicationName: 'AKWÈ',
  appleWebApp: { capable: true, title: 'AKWÈ', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  // Le lien circulera surtout par WhatsApp : sans ces balises, il s'y affiche
  // en texte nu, sans vignette ni titre.
  openGraph: {
    type: 'website',
    locale: 'fr_BJ',
    siteName: 'AKWÈ',
    title: TITRE,
    description: DESCRIPTION,
    images: PARTAGE,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITRE,
    description: DESCRIPTION,
    images: PARTAGE,
  },
};

export const viewport: Viewport = {
  themeColor: '#004643',
  width: 'device-width',
  initialScale: 1,
  // Le zoom reste possible : nos utilisatrices ont souvent besoin d'agrandir.
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fontVariables}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
