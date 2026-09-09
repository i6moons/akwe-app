import type { NextConfig } from 'next';

/**
 * En-têtes de sécurité appliqués à toute l'application.
 * `Permissions-Policy` autorise explicitement le micro : la saisie vocale en dépend.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
    // Sans cela, Next réutilise pendant 0 seconde une route dynamique préchargée :
    // chaque navigation repasse par le réseau, et tout s'arrête hors connexion.
    // Nos écrans ne lisent que l'IndexedDB locale, les garder 5 minutes est sûr.
    staleTimes: { dynamic: 300, static: 300 },
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
