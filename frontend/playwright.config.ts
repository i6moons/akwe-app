import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'fr-BJ',
    permissions: ['microphone'],
    // Sans cela, un proxy défini dans l'environnement intercepte aussi 127.0.0.1
    // et le navigateur ne joint jamais le serveur local.
    launchOptions: { args: ['--no-proxy-server'] },
  },
  projects: [
    // Nos utilisatrices sont sur Android d'entrée de gamme : le mobile est le cas nominal.
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
