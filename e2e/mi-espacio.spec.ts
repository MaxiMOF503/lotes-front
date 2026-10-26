import { abrirApp, CUENTAS, consultarPorNomenclatura, expect, ingresarComo, irAConsultaPublica, irAlAreaInterna, pestana, test } from './base';

const NOM_1 = '990000000000000000001';
const NOM_2 = '990000000000000000002';

test.describe('Mi espacio: guardadas, historial, informes y comparación', () => {
  test('guardar una parcela y quitarla de las guardadas', async ({ page }) => {
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.usuario);
    await irAConsultaPublica(page);
    await test.step('consultar la parcela y guardarla', async () => {
      await consultarPorNomenclatura(page, NOM_1);
      await page.getByRole('button', { name: /Guardar consulta/ }).click();
      await expect(page.getByText('Consulta guardada en tu espacio personal.')).toBeVisible();
    });
    await test.step('aparece en Consultas guardadas', async () => {
      await irAlAreaInterna(page);
      await pestana(page, /Consultas guardadas/).click();
      await expect(page.getByRole('heading', { name: NOM_1 })).toBeVisible();
    });
    await test.step('quitarla pide confirmación y la elimina', async () => {
      await page.getByRole('button', { name: 'Quitar', exact: true }).click();
      await expect(page.getByRole('alertdialog', { name: /¿Quitar esta consulta/ })).toBeVisible();
      await page.getByRole('button', { name: 'Quitar de mis guardadas' }).click();
      await expect(page.getByText('Consulta quitada de tus guardadas.')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Tu próxima consulta puede quedar acá' })).toBeVisible();
    });
  });

  test('una consulta con sesión queda en el historial y se abre su informe', async ({ page }) => {
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.usuario);
    await irAConsultaPublica(page);
    await test.step('consultar por el mapa con la sesión iniciada', async () => {
      await page.getByRole('region', { name: /Mapa interactivo/ }).locator('.leaflet-container').click();
      await expect(page.locator('.nomenclatura-valor').first()).toHaveText(NOM_1);
    });
    await test.step('el historial muestra la consulta', async () => {
      await irAlAreaInterna(page);
      await pestana(page, /Historial/).click();
      await expect(page.getByRole('heading', { name: `Parcela ${NOM_1}` })).toBeVisible();
    });
    await test.step('abrir y cerrar el informe de la copia histórica', async () => {
      await page.getByRole('button', { name: 'Ver informe' }).click();
      const informe = page.getByRole('dialog', { name: 'Informe de consulta' });
      await expect(informe).toBeVisible();
      await expect(informe.getByText('COPIA HISTÓRICA')).toBeVisible();
      await expect(informe.getByText(`Nomenclatura ${NOM_1}`)).toBeVisible();
      await informe.getByRole('button', { name: 'Cerrar informe' }).click();
      await expect(informe).toHaveCount(0);
    });
  });

  test('comparar dos parcelas guardadas y abrir el informe comparativo', async ({ page, api }) => {
    api.sembrarGuardada(CUENTAS.usuario.email, 'E2E.1');
    api.sembrarGuardada(CUENTAS.usuario.email, 'E2E.2');
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.usuario);
    await pestana(page, /Comparar parcelas/).click();
    await test.step('elegir las dos parcelas', async () => {
      await page.getByRole('button', { name: new RegExp(NOM_1) }).click();
      await page.getByRole('button', { name: new RegExp(NOM_2) }).click();
      await expect(page.getByText('2 de 3 parcelas seleccionadas')).toBeVisible();
    });
    await test.step('comparar muestra los datos lado a lado', async () => {
      await page.getByRole('button', { name: /Comparar selección/ }).click();
      await expect(page.getByRole('heading', { name: 'Datos lado a lado' })).toBeVisible();
      await expect(page.getByText('Zona de prueba A')).toBeVisible();
      await expect(page.getByText('Zona de prueba B')).toBeVisible();
    });
    await test.step('el informe comparativo se abre y se cierra', async () => {
      await page.getByRole('button', { name: 'Abrir informe comparativo' }).click();
      const informe = page.getByRole('dialog', { name: 'Informe comparativo' });
      await expect(informe).toBeVisible();
      await informe.getByRole('button', { name: 'Cerrar informe' }).click();
      await expect(informe).toHaveCount(0);
    });
  });

  test('USUARIO no puede ver Estadísticas ni la gestión aunque conozca la ruta', async ({ page, api }) => {
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.usuario);
    const respuesta = await page.evaluate(async () => (await fetch('/api/admin/estadisticas?desde=2026-10-01&hasta=2026-10-07')).status);
    expect(respuesta).toBe(403);
    expect(api.pedidos).toContain('GET /admin/estadisticas');
  });
});
