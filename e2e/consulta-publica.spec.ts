import { abrirApp, consultarPorNomenclatura, expect, test } from './base';

test.describe('Consulta pública sin registro', () => {
  test('por nomenclatura: abre la ficha de la parcela con sus fuentes', async ({ page }) => {
    await abrirApp(page);
    await test.step('buscar la nomenclatura completa', async () => {
      await consultarPorNomenclatura(page, '990000000000000000002');
    });
    await test.step('la ficha muestra datos publicados, servicios y fuentes', async () => {
      await expect(page.getByText('Zona de prueba B')).toBeVisible();
      await expect(page.getByText('Datos de prueba E2E')).toBeVisible();
      await expect(page.getByText('Infraestructura eléctrica').first()).toBeVisible();
    });
    await test.step('sin sesión se invita a ingresar para guardar', async () => {
      await expect(page.getByRole('button', { name: /Ingresar para guardar/ })).toBeVisible();
    });
  });

  test('por nomenclatura parcial: elegir entre varias parcelas', async ({ page }) => {
    await abrirApp(page);
    await page.getByLabel('Nomenclatura catastral').fill('99000000000000000');
    await page.getByRole('button', { name: /^Buscar/ }).click();
    await expect(page.getByRole('heading', { name: 'Elegí la parcela que buscás' })).toBeVisible();
    await expect(page.locator('.opcion-lote')).toHaveCount(3);
    await page.locator('.opcion-lote').filter({ hasText: '990000000000000000003' }).click();
    await expect(page.locator('.nomenclatura-valor').first()).toHaveText('990000000000000000003');
  });

  test('por nomenclatura inexistente: avisa que no hay coincidencias', async ({ page }) => {
    await abrirApp(page);
    await page.getByLabel('Nomenclatura catastral').fill('123456');
    await page.getByRole('button', { name: /^Buscar/ }).click();
    await expect(page.getByText('No encontramos coincidencias')).toBeVisible();
  });

  test('por mapa: un clic sobre el mapa consulta ese punto', async ({ page }) => {
    await abrirApp(page);
    await test.step('clic en el centro del mapa', async () => {
      await page.getByRole('region', { name: /Mapa interactivo/ }).locator('.leaflet-container').click();
    });
    await expect(page.getByRole('heading', { name: 'Tu consulta territorial' })).toBeVisible();
    await expect(page.locator('.nomenclatura-valor').first()).toHaveText('990000000000000000001');
    await expect(page.getByText('Punto del mapa')).toBeVisible();
  });

  test('por dirección: sugerencia de Georef, elegir la parcela cercana', async ({ page }) => {
    await abrirApp(page);
    await page.getByRole('button', { name: /Por dirección/ }).click();
    await page.getByLabel('Dirección').fill('calle de prueba 100');
    await test.step('aparece la sugerencia y se elige', async () => {
      await page.getByRole('option', { name: /CALLE DE PRUEBA 100/ }).click();
    });
    await test.step('con una sola parcela cercana se abre su ficha', async () => {
      await expect(page.getByRole('heading', { name: 'Tu consulta territorial' })).toBeVisible();
    });
    await expect(page.locator('.nomenclatura-valor').first()).toHaveText('990000000000000000001');
    await expect(page.locator('.criterio-valor')).toContainText('ubicación aproximada');
  });
});
