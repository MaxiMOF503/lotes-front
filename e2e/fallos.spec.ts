import { abrirApp, CUENTAS, expect, ingresarComo, pestana, test } from './base';

test.describe('Sesión vencida y servidor no disponible', () => {
  test('sesión vencida: se ofrece volver a ingresar, y al hacerlo de nuevo se vuelve a la misma pestaña', async ({ page, api }) => {
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.usuario);
    await pestana(page, /Historial/).click();
    await expect(page.getByText('Tu recorrido empieza en el mapa')).toBeVisible();
    await test.step('el servidor deja de reconocer la sesión', async () => {
      api.vencerSesion();
      await page.getByRole('button', { name: /Actualizar lista/ }).click();
      await expect(page.getByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeVisible();
    });
    await test.step('al ingresar de nuevo vuelve al Historial', async () => {
      await page.getByLabel('Correo electrónico').fill(CUENTAS.usuario.email);
      await page.getByLabel('Contraseña').fill(CUENTAS.usuario.password);
      await page.getByRole('button', { name: /Ingresar al sistema/ }).click();
      await expect(pestana(page, /Historial/)).toHaveAttribute('aria-pressed', 'true');
    });
  });

  test('servidor caído en la consulta: se explica y se puede reintentar sin recargar', async ({ page, api }) => {
    await abrirApp(page);
    const mapa = page.getByRole('region', { name: /Mapa interactivo/ }).locator('.leaflet-container');
    await test.step('el servidor no responde', async () => {
      api.caida = true;
      await mapa.click();
      await expect(page.getByText('No pudimos consultar este punto')).toBeVisible();
      await expect(page.getByText(/servidor no está disponible/i)).toBeVisible();
    });
    await test.step('vuelve el servidor y reintentar funciona', async () => {
      api.caida = false;
      await page.getByRole('button', { name: /Reintentar/ }).click();
      await expect(page.locator('.nomenclatura-valor').first()).toHaveText('990000000000000000001');
    });
  });

  test('error interno del servidor: no se muestran detalles técnicos', async ({ page, api }) => {
    await abrirApp(page);
    api.fallar(/\/public\/v1\/territorio\/consulta$/, 500, { status: 500, codigo: 'ERROR_INTERNO', mensaje: 'java.lang.NullPointerException at Foo.java:12', errores: [], correlacionId: 'abc-123' });
    await page.getByRole('region', { name: /Mapa interactivo/ }).locator('.leaflet-container').click();
    const aviso = page.getByRole('alert').filter({ hasText: 'No pudimos consultar este punto' });
    await expect(aviso).toBeVisible();
    await expect(aviso).not.toContainText('NullPointerException');
    await expect(aviso).toContainText('abc-123');
  });

  test('capa sin importar: el administrador recibe una instrucción clara', async ({ page, api }) => {
    await abrirApp(page);
    api.fallar(/\/public\/v1\/territorio\/consulta$/, 503, { status: 503, codigo: 'CAPA_NO_IMPORTADA', mensaje: 'La capa no fue importada', errores: [] });
    await page.getByRole('region', { name: /Mapa interactivo/ }).locator('.leaflet-container').click();
    await expect(page.getByText(/preparar-solo/)).toBeVisible();
  });
});
