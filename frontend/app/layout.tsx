import type { Metadata, Viewport } from 'next';
import { AppProviders } from '@/components/providers';
import { fontVariables } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'AKWÈ — Le carnet des tontines',
  description:
    "Le carnet intelligent des tontines et coopératives d'épargne au Bénin : saisie vocale, hors ligne, reçus et score de crédit.",
  manifest: '/manifest.webmanifest',
  applicationName: 'AKWÈ',
  appleWebApp: { capable: true, title: 'AKWÈ', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
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
