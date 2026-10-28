import { abrirApp, expect, test } from './base';

test.describe('identidad visual', () => {
  test('el logo está en la cabecera y en el pie, y la pestaña usa el ícono nuevo', async ({ page }) => {
    await abrirApp(page);
    const marca = page.getByRole('link', { name: /LoteoSeguro.*ir a la consulta pública/ });
    await expect(marca.locator('img.brand-logo')).toBeVisible();
    await expect(marca).toContainText('Orientación territorial');
    await expect(page.locator('footer').getByRole('img', { name: /LoteoSeguro/ })).toBeAttached();
    await expect(page).toHaveTitle(/LoteoSeguro/);
    await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute('href', /favicon-32\.png$/);
    for (const href of await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').evaluateAll(l => l.map(e => (e as HTMLLinkElement).href))) {
      expect((await page.request.get(href)).ok(), href).toBeTruthy();
    }
    const imagenes = await page.locator('img.brand-logo, img.footer-logo').evaluateAll(l => l.map(i => (i as HTMLImageElement).naturalWidth));
    expect(imagenes.every(w => w > 0)).toBeTruthy();
  });

  for (const ancho of [320, 360, 390, 1280]) {
    test(`la cabecera y el pie no desbordan con ${ancho}px de ancho`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 800 });
      await abrirApp(page);
      const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(sobra).toBeLessThanOrEqual(0);
      const marca = await page.locator('.brand').boundingBox();
      const menu = await page.locator('.menu-toggle').boundingBox();
      if (menu && await page.locator('.menu-toggle').isVisible()) expect(marca!.x + marca!.width).toBeLessThanOrEqual(menu.x + 1);
      const pie = await page.locator('footer .footer-logo').boundingBox();
      expect(pie!.x + pie!.width).toBeLessThanOrEqual(ancho);
    });
  }
});
