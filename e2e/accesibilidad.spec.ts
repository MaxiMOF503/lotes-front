import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { abrirApp, CUENTAS, consultarPorNomenclatura, expect, ingresar, ingresarComo, irAConsultaPublica, irAlAreaInterna, pestana, test } from './base';

const NOM_1 = '990000000000000000001';
const NOM_SIN_FICHA = '990000000000000000002';
const REGLAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Falla si la pantalla actual incumple alguna regla WCAG 2.2 AA que axe puede comprobar automáticamente. */
async function sinViolaciones(page: Page, pantalla: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(REGLAS).analyze();
  const resumen = violations.map(v => `${v.id} (${v.impact}) · ${v.help}\n` + v.nodes.slice(0, 4).map(n => '    ' + n.target.join(' ')).join('\n'));
  expect(resumen, `Violaciones de accesibilidad en «${pantalla}»`).toEqual([]);
}

test.describe('Auditoría automática (axe, WCAG 2.2 AA)', () => {
  test('consulta pública: inicio, ficha, búsqueda por dirección y errores', async ({ page, api }) => {
    api.sembrarFicha('E2E.1', { direccion: 'Calle E2E 1', observaciones: 'Observación de prueba' });
    await abrirApp(page);
    await sinViolaciones(page, 'inicio');
    await consultarPorNomenclatura(page, NOM_1);
    await sinViolaciones(page, 'ficha de una parcela');
    await page.getByRole('button', { name: /Por dirección/ }).click();
    await sinViolaciones(page, 'búsqueda por dirección');
    await page.getByRole('button', { name: /Por nomenclatura/ }).click();
    await page.getByLabel('Nomenclatura catastral').fill('123456');
    await page.getByRole('button', { name: /^Buscar/ }).click();
    await expect(page.getByText('No encontramos coincidencias')).toBeVisible();
    await sinViolaciones(page, 'búsqueda sin resultados');
    api.caida = true;
    await page.getByRole('region', { name: /Mapa interactivo/ }).locator('.leaflet-container').click();
    await expect(page.getByText('No pudimos consultar este punto')).toBeVisible();
    await sinViolaciones(page, 'error de conexión');
  });

  test('ingreso y espacio personal (USUARIO)', async ({ page, api }) => {
    api.sembrarGuardada(CUENTAS.usuario.email, 'E2E.1');
    api.sembrarGuardada(CUENTAS.usuario.email, 'E2E.2');
    await abrirApp(page);
    await irAlAreaInterna(page);
    await sinViolaciones(page, 'formulario de ingreso');
    await ingresarComo(page, CUENTAS.usuario);
    for (const nombre of [/Consultas guardadas/, /Historial/, /Comparar parcelas/, /Mis reportes/]) {
      await pestana(page, nombre).click();
      await expect(pestana(page, nombre)).toHaveAttribute('aria-pressed', 'true');
      await sinViolaciones(page, String(nombre));
    }
    await pestana(page, /Consultas guardadas/).click();
    await page.getByRole('button', { name: 'Ver informe' }).first().click();
    await expect(page.getByRole('dialog', { name: 'Informe de consulta' })).toBeVisible();
    await sinViolaciones(page, 'informe de una guardada');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Quitar', exact: true }).first().click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await sinViolaciones(page, 'confirmación de quitar');
  });

  test('área de administración (ADMIN)', async ({ page, api }) => {
    api.sembrarFicha('E2E.1', { direccion: 'Calle E2E 1' });
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.admin);
    await sinViolaciones(page, 'parcelas reales');
    for (const nombre of [/^Reportes/, /Calidad de datos/, /Estadísticas/]) {
      await pestana(page, nombre).click();
      await expect(pestana(page, nombre)).toHaveAttribute('aria-pressed', 'true');
      await sinViolaciones(page, String(nombre));
    }
    await pestana(page, /Parcelas reales/).click();
    await page.getByLabel('Nomenclatura catastral').fill(NOM_SIN_FICHA);
    await page.getByRole('button', { name: 'Buscar parcelas' }).click();
    await page.getByRole('button', { name: new RegExp(NOM_SIN_FICHA) }).click();
    await expect(page.getByRole('heading', { name: 'Ficha complementaria' })).toBeVisible();
    await page.getByLabel('Dirección relevada').fill('Calle de prueba 1');
    await page.getByRole('button', { name: 'Guardar ficha complementaria' }).click();
    await expect(page.getByText('Indicá la fuente y la referencia documental del aporte.')).toBeVisible();
    await sinViolaciones(page, 'ficha complementaria con error');
  });

  test('reportar un dato y responder un reporte', async ({ page }) => {
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.usuario);
    await irAConsultaPublica(page);
    await consultarPorNomenclatura(page, NOM_1);
    await page.getByRole('button', { name: 'Reportar un dato' }).click();
    await page.getByLabel('Descripción').fill('corta');
    await sinViolaciones(page, 'formulario de reporte');
    await page.getByLabel('Descripción').fill('Falta indicar el prestador del servicio de agua.');
    await page.getByRole('button', { name: 'Enviar reporte' }).click();
    await expect(page.getByText('Gracias, el equipo va a revisar tu reporte')).toBeVisible();
    await irAlAreaInterna(page);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await ingresarComo(page, CUENTAS.admin);
    await pestana(page, /^Reportes/).click();
    await page.getByRole('button', { name: 'Responder' }).click();
    await sinViolaciones(page, 'formulario de respuesta de un reporte');
  });
});

test.describe('Teclado y lector de pantalla', () => {
  test('buscar por nomenclatura y consultar solo con teclado', async ({ page }) => {
    await abrirApp(page);
    const campo = page.getByLabel('Nomenclatura catastral');
    await campo.focus();
    await page.keyboard.type(NOM_1);
    await page.keyboard.press('Enter');
    await expect(page.locator('.nomenclatura-valor').first()).toHaveText(NOM_1);
  });

  test('ingresar solo con teclado', async ({ page }) => {
    await abrirApp(page);
    const menu = page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: /Área interna/ });
    await menu.focus();
    await page.keyboard.press('Enter');
    await page.getByLabel('Correo electrónico').focus();
    await page.keyboard.type(CUENTAS.usuario.email);
    await page.keyboard.press('Tab');
    await page.keyboard.type(CUENTAS.usuario.password);
    await page.keyboard.press('Enter');
    await expect(page.getByText('SESIÓN ACTIVA')).toBeVisible();
  });

  const probarDialogo = async (page: Page, disparador: Locator, dialogo: Locator) => {
    await disparador.focus();
    await page.keyboard.press('Enter');
    await expect(dialogo).toBeVisible();
    await test.step('el foco entra al diálogo', async () => {
      await expect.poll(() => dialogo.evaluate(el => el.contains(document.activeElement))).toBe(true);
    });
    await test.step('Tab no sale del diálogo', async () => {
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Tab');
        expect(await dialogo.evaluate(el => el.contains(document.activeElement))).toBe(true);
      }
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Shift+Tab');
        expect(await dialogo.evaluate(el => el.contains(document.activeElement))).toBe(true);
      }
    });
    await test.step('Escape lo cierra y el foco vuelve al control que lo abrió', async () => {
      await page.keyboard.press('Escape');
      await expect(dialogo).toHaveCount(0);
      await expect(disparador).toBeFocused();
    });
  };

  test('informe: foco atrapado, Escape cierra y el foco vuelve', async ({ page, api }) => {
    api.sembrarGuardada(CUENTAS.usuario.email, 'E2E.1');
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.usuario);
    await probarDialogo(page, page.getByRole('button', { name: 'Ver informe' }), page.getByRole('dialog', { name: 'Informe de consulta' }));
  });

  test('confirmación de quitar una guardada: foco atrapado y restaurado', async ({ page, api }) => {
    api.sembrarGuardada(CUENTAS.usuario.email, 'E2E.1');
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.usuario);
    await probarDialogo(page, page.getByRole('button', { name: 'Quitar', exact: true }), page.getByRole('alertdialog'));
  });

  test('descartar cambios de la ficha: foco atrapado', async ({ page }) => {
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.admin);
    await page.getByLabel('Nomenclatura catastral').fill(NOM_1);
    await page.getByRole('button', { name: 'Buscar parcelas' }).click();
    await page.getByRole('button', { name: new RegExp(NOM_1) }).click();
    await page.getByLabel('Dirección relevada').fill('Cambio sin guardar');
    await probarDialogo(page, page.getByRole('button', { name: 'Cerrar sesión' }), page.getByRole('alertdialog', { name: /Descartar cambios/ }));
  });

  test('los errores se anuncian como alerta y conservan el contexto', async ({ page }) => {
    await abrirApp(page);
    await ingresar(page, CUENTAS.usuario, 'clave-equivocada');
    const alerta = page.getByRole('alert').filter({ hasText: /Usuario o contraseña incorrectos/ });
    await expect(alerta).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toHaveValue(CUENTAS.usuario.email);
  });

  test('los campos con error indican el problema a los lectores de pantalla', async ({ page }) => {
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.admin);
    await page.getByLabel('Nomenclatura catastral').fill(NOM_1);
    await page.getByRole('button', { name: 'Buscar parcelas' }).click();
    await page.getByRole('button', { name: new RegExp(NOM_1) }).click();
    const fuente = page.getByLabel(/Fuente del aporte/);
    await fuente.focus();
    await fuente.blur();
    await expect(page.getByText('Completá la fuente.')).toBeVisible();
    await expect(fuente).toHaveAttribute('aria-invalid', 'true');
    const ayuda = await fuente.getAttribute('aria-describedby');
    expect(ayuda, 'el campo debe apuntar a su mensaje de error').toBeTruthy();
    await expect(page.locator('#' + ayuda!)).toHaveText('Completá la fuente.');
  });

  test('el foco es visible en cada control del recorrido principal', async ({ page }) => {
    await abrirApp(page);
    await page.getByLabel('Nomenclatura catastral').fill(NOM_1);
    await page.getByRole('button', { name: /^Buscar/ }).click();
    await expect(page.locator('.nomenclatura-valor').first()).toBeVisible();
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const sinIndicador: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const contorno = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2;
        const sombra = s.boxShadow !== 'none' && s.boxShadow !== '';
        return { visible: contorno || sombra, nombre: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40) + ' <' + el.tagName.toLowerCase() + '>' };
      });
      if (r && !r.visible) sinIndicador.push(r.nombre);
    }
    expect(sinIndicador, 'controles sin indicador de foco').toEqual([]);
  });

  test('las acciones que dependen del mapa tienen alternativa y el mapa está descrito', async ({ page }) => {
    await abrirApp(page);
    const mapa = page.getByRole('region', { name: /Mapa interactivo/ });
    await expect(mapa).toHaveAccessibleDescription(/buscador|nomenclatura|dirección/i);
    await consultarPorNomenclatura(page, NOM_1);
  });

  test('se respeta prefers-reduced-motion', async ({ page }) => {
    await abrirApp(page);
    const duracion = await page.evaluate(() => getComputedStyle(document.querySelector('button')!).transitionDuration);
    expect(parseFloat(duracion)).toBeLessThan(0.01);
  });
});

test.describe('Responsive sin desplazamiento horizontal ni controles diminutos', () => {
  for (const ancho of [360, 768, 1024, 1440]) {
    test(`recorrido principal a ${ancho}px`, async ({ page, api }) => {
      api.sembrarGuardada(CUENTAS.usuario.email, 'E2E.1');
      api.sembrarGuardada(CUENTAS.usuario.email, 'E2E.2');
      await page.setViewportSize({ width: ancho, height: 900 });
      const abrirMenu = async () => { const b = page.getByRole('button', { name: 'Abrir menú de navegación' }); if (await b.isVisible()) await b.click(); };
      const medir = async (pantalla: string) => {
        const m = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, ventana: window.innerWidth }));
        expect(m.ancho, `Desplazamiento horizontal en «${pantalla}» a ${ancho}px`).toBeLessThanOrEqual(m.ventana);
        const chicos = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('button, a[href], input:not([type=hidden]), select, textarea, [role=button]'))
          .filter(el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !el.closest('.leaflet-control-container') && !(el.tagName === 'A' && el.closest('p, li, small')); })
          .filter(el => { const r = el.getBoundingClientRect(); return r.width < 24 || r.height < 24; })
          .map(el => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30) + ' ' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height)));
        expect(chicos, `Controles menores a 24×24 px en «${pantalla}»`).toEqual([]);
      };
      await abrirApp(page);
      await medir('inicio');
      await consultarPorNomenclatura(page, NOM_1);
      await medir('ficha');
      await abrirMenu();
      await ingresar(page, CUENTAS.usuario, 'x');
      await medir('ingreso con error');
      await page.getByLabel('Contraseña').fill(CUENTAS.usuario.password);
      await page.getByRole('button', { name: /Ingresar al sistema/ }).click();
      await expect(page.getByText('SESIÓN ACTIVA')).toBeVisible();
      for (const nombre of [/Consultas guardadas/, /Historial/, /Comparar parcelas/, /Mis reportes/]) {
        await pestana(page, nombre).click();
        await medir(String(nombre));
      }
      await pestana(page, /Consultas guardadas/).click();
      await page.getByRole('button', { name: 'Ver informe' }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await medir('informe');
    });
  }
});
