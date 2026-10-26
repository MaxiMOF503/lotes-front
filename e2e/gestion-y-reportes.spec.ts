import { abrirApp, CUENTAS, consultarPorNomenclatura, expect, ingresarComo, irAConsultaPublica, irAlAreaInterna, pestana, test } from './base';

const NOM_1 = '990000000000000000001';

test.describe('Gestión de fichas y reportes de datos', () => {
  test('ADMIN completa una ficha complementaria y se publica en la consulta', async ({ page }) => {
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.admin);
    await test.step('buscar la parcela en Parcelas reales', async () => {
      await page.getByLabel('Nomenclatura catastral').fill(NOM_1);
      await page.getByRole('button', { name: 'Buscar parcelas' }).click();
      await page.getByRole('button', { name: new RegExp(NOM_1) }).click();
      await expect(page.getByRole('heading', { name: 'Ficha complementaria' })).toBeVisible();
    });
    await test.step('sin fuente ni referencia no se puede guardar', async () => {
      await page.getByLabel('Dirección relevada').fill('Calle de prueba 100');
      await page.getByRole('button', { name: 'Guardar ficha complementaria' }).click();
      await expect(page.getByText('Indicá la fuente y la referencia documental del aporte.')).toBeVisible();
    });
    await test.step('con fuente y referencia se guarda', async () => {
      await page.getByLabel(/Fuente del aporte/).fill('Relevamiento E2E');
      await page.getByLabel(/Referencia documental/).fill('Expediente E2E-001');
      await page.getByRole('button', { name: 'Guardar ficha complementaria' }).click();
      await expect(page.getByText('Ficha complementaria guardada.')).toBeVisible();
    });
    await test.step('la consulta pública muestra el aporte separado del catastro', async () => {
      await irAConsultaPublica(page);
      await consultarPorNomenclatura(page, NOM_1);
      await expect(page.getByText('INFORMACIÓN COMPLEMENTARIA · EQUIPO')).toBeVisible();
      await expect(page.getByText('Calle de prueba 100')).toBeVisible();
    });
  });

  test('un conflicto de edición conserva lo escrito y avisa', async ({ page, api }) => {
    api.sembrarFicha('E2E.1', { direccion: 'Original' });
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.admin);
    await page.getByLabel('Nomenclatura catastral').fill(NOM_1);
    await page.getByRole('button', { name: 'Buscar parcelas' }).click();
    await page.getByRole('button', { name: new RegExp(NOM_1) }).click();
    await expect(page.getByLabel('Dirección relevada')).toHaveValue('Original');
    await page.getByLabel('Dirección relevada').fill('Mi cambio');
    await test.step('otra persona guarda antes', async () => {
      api.sembrarFicha('E2E.1', { direccion: 'Cambio ajeno', version: 2 });
    });
    await page.getByRole('button', { name: 'Guardar ficha complementaria' }).click();
    await expect(page.getByText(/Otra persona actualizó esta ficha/)).toBeVisible();
    await expect(page.getByLabel('Dirección relevada')).toHaveValue('Mi cambio');
  });

  test('ciclo completo: USUARIO reporta, ADMIN responde y USUARIO lee la respuesta', async ({ page }) => {
    await abrirApp(page);
    await test.step('USUARIO envía un reporte desde la ficha', async () => {
      await ingresarComo(page, CUENTAS.usuario);
      await irAConsultaPublica(page);
      await consultarPorNomenclatura(page, NOM_1);
      await page.getByRole('button', { name: 'Reportar un dato' }).click();
      await page.getByLabel('Sección').selectOption({ label: 'Cobertura de agua' });
      await page.getByLabel('Descripción').fill('Falta indicar el prestador del servicio de agua.');
      await page.getByRole('button', { name: 'Enviar reporte' }).click();
      await expect(page.getByText('Gracias, el equipo va a revisar tu reporte')).toBeVisible();
    });
    await test.step('USUARIO cierra sesión', async () => {
      await irAlAreaInterna(page);
      await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    });
    await test.step('ADMIN ve el reporte pendiente y lo resuelve con respuesta', async () => {
      await ingresarComo(page, CUENTAS.admin);
      await pestana(page, /^Reportes/).click();
      const tarjeta = page.getByRole('article').filter({ hasText: NOM_1 });
      await expect(tarjeta).toContainText('Falta indicar el prestador');
      await tarjeta.getByRole('button', { name: 'Responder' }).click();
      await tarjeta.getByLabel('Resuelto').check();
      await tarjeta.getByRole('button', { name: 'Guardar' }).click();
      await expect(tarjeta.getByText('Para resolver o descartar, escribí una respuesta')).toBeVisible();
      await tarjeta.getByLabel(/Respuesta para quien lo envió/).fill('Se verificó la fuente y se completó la ficha.');
      await tarjeta.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText(/Reporte #\d+: resuelto\./)).toBeVisible();
      await expect(page.getByRole('article')).toHaveCount(0);
      await page.getByRole('group', { name: 'Filtrar por estado' }).getByRole('button', { name: 'Resueltos' }).click();
      await expect(page.getByRole('article').filter({ hasText: NOM_1 })).toContainText('Se verificó la fuente');
    });
    await test.step('USUARIO ve la respuesta en Mis reportes', async () => {
      await page.getByRole('button', { name: 'Cerrar sesión' }).click();
      await ingresarComo(page, CUENTAS.usuario);
      await pestana(page, /Mis reportes/).click();
      await expect(page.getByText('RESPUESTA DEL EQUIPO')).toBeVisible();
      await expect(page.getByText('Se verificó la fuente y se completó la ficha.')).toBeVisible();
    });
  });
});
