import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'public/sw.js',
      'captures/**',
      // Script de capture d'écrans, lancé à la main : il parle dans la console.
      'tests/captures.mjs',
      // Fichier généré par Next à chaque build.
      'next-env.d.ts',
    ],
  },
  {
    rules: {
      // L'argent est toujours un entier FCFA : `any` masquerait les erreurs de type sur les montants.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
];

export default config;
