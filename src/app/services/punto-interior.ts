import type { Geometry, Position } from 'geojson';

/**
 * Devuelve un punto dentro de la parcela (no sobre su borde), para consultarla como si se hiciera clic en ella.
 * Un vértice no sirve: está en el límite y la consulta también devolvería las parcelas vecinas.
 * Se cruza el polígono más grande con una línea horizontal a media altura y se toma el centro del tramo interior más ancho.
 */
export function puntoInterior(geometria: Geometry): { latitud: number; longitud: number } | null {
  const poligonos: Position[][][] = geometria.type === 'Polygon' ? [geometria.coordinates]
    : geometria.type === 'MultiPolygon' ? geometria.coordinates : [];
  let mejor: { poligono: Position[][]; area: number; minY: number; maxY: number } | null = null;
  for (const poligono of poligonos) {
    const exterior = poligono[0] ?? [];
    if (exterior.length < 4) continue;
    const xs = exterior.map(p => p[0]), ys = exterior.map(p => p[1]);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const area = (Math.max(...xs) - Math.min(...xs)) * (maxY - minY);
    if (!mejor || area > mejor.area) mejor = { poligono, area, minY, maxY };
  }
  if (!mejor || mejor.maxY === mejor.minY) return null;
  // Correrse apenas de la mitad exacta evita que la línea pase justo por un vértice.
  const y = mejor.minY + (mejor.maxY - mejor.minY) * 0.500137;
  const cortes: number[] = [];
  for (const anillo of mejor.poligono) {
    for (let i = 0; i < anillo.length - 1; i++) {
      const [x1, y1] = anillo[i], [x2, y2] = anillo[i + 1];
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) cortes.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
    }
  }
  cortes.sort((a, b) => a - b);
  let ancho = 0, longitud: number | null = null;
  for (let i = 0; i + 1 < cortes.length; i += 2) {
    if (cortes[i + 1] - cortes[i] > ancho) { ancho = cortes[i + 1] - cortes[i]; longitud = (cortes[i] + cortes[i + 1]) / 2; }
  }
  return longitud === null ? null : { latitud: y, longitud };
}
