import { expect, test as base, type Page } from '@playwright/test';
import { ApiFalsa, CUENTAS } from './api-falsa';

type Cuenta = (typeof CUENTAS)[keyof typeof CUENTAS];

export const test = base.extend<{ api: ApiFalsa }>({
  api: [async ({ page }, use) => {
    const api = new ApiFalsa();
    await api.instalar(page);
    await use(api);
  }, { auto: true }]
});
export { expect, CUENTAS };

export async function abrirApp(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Conocé el lote');
}

/** Entra al área interna sin sesión (formulario de ingreso). */
export async function irAlAreaInterna(page: Page) {
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: /Área interna|Gestión territorial|Mi espacio/ }).click();
}

export async function ingresar(page: Page, cuenta: Cuenta, clave = cuenta.password) {
  await irAlAreaInterna(page);
  await page.getByLabel('Correo electrónico').fill(cuenta.email);
  await page.getByLabel('Contraseña').fill(clave);
  await page.getByRole('button', { name: /Ingresar al sistema/ }).click();
}

export async function ingresarComo(page: Page, cuenta: Cuenta) {
  await ingresar(page, cuenta);
  await expect(page.getByText('SESIÓN ACTIVA')).toBeVisible();
}

export const pestana = (page: Page, nombre: string | RegExp) =>
  page.getByRole('navigation', { name: 'Área interna' }).getByRole('button', { name: nombre });

export async function irAConsultaPublica(page: Page) {
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Consulta pública' }).click();
}

/** Busca por nomenclatura en la consulta pública y espera la ficha. */
export async function consultarPorNomenclatura(page: Page, nomenclatura: string) {
  await page.getByLabel('Nomenclatura catastral').fill(nomenclatura);
  await page.getByRole('button', { name: /^Buscar/ }).click();
  await expect(page.getByRole('heading', { name: 'Tu consulta territorial' })).toBeVisible();
  await expect(page.locator('.nomenclatura-valor').first()).toHaveText(nomenclatura);
}
