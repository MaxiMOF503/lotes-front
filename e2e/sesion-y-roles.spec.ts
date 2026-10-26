import { CUENTAS, expect, ingresar, ingresarComo, irAConsultaPublica, irAlAreaInterna, pestana, test } from './base';
import { abrirApp } from './base';

test.describe('Ingreso, salida y permisos por rol', () => {
  test('ADMIN: ingresa, ve todas las pestañas y cierra sesión', async ({ page }) => {
    await abrirApp(page);
    await test.step('ingresar con la cuenta administradora', async () => { await ingresarComo(page, CUENTAS.admin); });
    await test.step('ve las pestañas de gestión', async () => {
      for (const nombre of [/Parcelas reales/, /Consultas guardadas/, /Historial/, /Comparar parcelas/, /Mis reportes/, /Reportes/, /Calidad de datos/, /Estadísticas/])
        await expect(pestana(page, nombre).first()).toBeVisible();
      await expect(page.getByText('Administrador', { exact: true }).first()).toBeVisible();
    });
    await test.step('cerrar sesión devuelve al formulario de ingreso', async () => {
      await page.getByRole('button', { name: 'Cerrar sesión' }).click();
      await expect(page.getByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeVisible();
    });
  });

  test('USUARIO: ingresa y solo ve su espacio personal', async ({ page }) => {
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.usuario);
    await test.step('ve sus pestañas', async () => {
      for (const nombre of [/Consultas guardadas/, /Historial/, /Comparar parcelas/, /Mis reportes/])
        await expect(pestana(page, nombre)).toBeVisible();
    });
    await test.step('no ve las pestañas de administración', async () => {
      for (const nombre of [/Parcelas reales/, /Calidad de datos/, /Estadísticas/])
        await expect(pestana(page, nombre)).toHaveCount(0);
      await expect(pestana(page, /^✉/)).toHaveCount(0);
    });
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeVisible();
  });

  test('credenciales incorrectas: se explica sin confundir con sesión vencida', async ({ page }) => {
    await abrirApp(page);
    await ingresar(page, CUENTAS.usuario, 'clave-equivocada');
    await expect(page.getByText(/Usuario o contraseña incorrectos/)).toBeVisible();
    await expect(page.getByText('Tu sesión terminó')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeVisible();
  });

  test('la sesión se conserva al volver a la consulta pública y a la zona interna', async ({ page }) => {
    await abrirApp(page);
    await ingresarComo(page, CUENTAS.usuario);
    await irAConsultaPublica(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Conocé el lote');
    await irAlAreaInterna(page);
    await expect(page.getByText('SESIÓN ACTIVA')).toBeVisible();
  });
});
