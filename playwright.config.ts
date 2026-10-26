import { defineConfig, devices } from '@playwright/test';

const PUERTO = Number(process.env.E2E_PUERTO ?? 4300);

/**
 * Pruebas de recorridos críticos en un navegador real.
 * No necesitan backend ni MySQL: cada prueba instala una API falsa en memoria (e2e/api-falsa.ts)
 * con datos sintéticos, así que no dependen del orden ni de datos locales.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PUERTO}`,
    locale: 'es-AR',
    // Sin animación de bienvenida: acelera las pruebas y la app ya respeta esta preferencia.
    reducedMotion: 'reduce',
    viewport: { width: 1280, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } }],
  webServer: {
    command: `npx ng serve --host 127.0.0.1 --port ${PUERTO}`,
    url: `http://127.0.0.1:${PUERTO}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  }
});
