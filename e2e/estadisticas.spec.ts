import { abrirApp, CUENTAS, expect, ingresarComo, pestana, test } from './base';

const DIAS = [['2026-10-22', 14, 9, 4, 3, 2, 1, 8, 0, 0], ['2026-10-24', 105, 64, 30, 20, 14, 3, 55, 5, 1], ['2026-10-27', 211, 140, 70, 40, 30, 5, 120, 12, 3]]
  .map(d => ({ fecha: d[0], visitas: d[1], consultas: d[2], porNomenclatura: d[3], porDireccion: d[4], porCoordenadas: d[5], sinCriterioValido: 0,
    invalidas: d[6], exitosas: d[7], sinResultados: d[8], erroresTecnicos: d[9] }));

test.describe('Estadísticas', () => {
  test('la tabla de actividad diaria queda ordenada y entra completa', async ({ page }) => {
    await page.route('**/api/admin/estadisticas*', r => r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ desde: '2026-10-22', hasta: '2026-10-27', zona: 'Luján de Cuyo', visitas: 427, consultas: 277, dias: DIAS }) }));
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.admin);
    await pestana(page, /Estadísticas/).click();
    await page.getByRole('button', { name: 'Actualizar' }).click();
    const tabla = page.locator('.table-scroll table');
    await expect(tabla).toBeVisible();
    await test.step('la fecha va a la izquierda y el resto centrado, igual en títulos y datos', async () => {
      const alineaciones = await tabla.evaluate(t => {
        const fila = (tr: Element) => Array.from(tr.children).map(c => getComputedStyle(c).textAlign);
        return { titulos: fila(t.querySelector('thead tr')!), datos: fila(t.querySelector('tbody tr')!) };
      });
      expect(alineaciones.titulos).toHaveLength(10);
      expect(alineaciones.titulos[0]).toBe('left');
      expect(alineaciones.titulos.slice(1)).toEqual(Array(9).fill('center'));
      expect(alineaciones.datos).toEqual(alineaciones.titulos);
    });
    await test.step('entran las 10 columnas sin desplazamiento horizontal', async () => {
      const medidas = await page.locator('.table-scroll').evaluate(e => ({ visible: e.clientWidth, total: e.scrollWidth }));
      expect(medidas.total, 'la tabla es más ancha que su tarjeta').toBeLessThanOrEqual(medidas.visible);
      await expect(page.locator('.table-scroll th', { hasText: 'Error técnico' })).toBeInViewport({ ratio: 1 });
    });
  });
});
