import type { Page, Route } from '@playwright/test';

/**
 * API falsa en memoria para las pruebas E2E. Cada prueba crea la suya, de modo que ninguna depende de otra.
 * Los datos son sintéticos y explícitos: parcelas "E2E", cuentas @e2e.test y claves que solo existen acá.
 */
export const CUENTAS = {
  admin: { nombre: 'Admin E2E', email: 'admin@e2e.test', password: 'Clave-E2E-solo-pruebas', rol: 'ADMIN' as const },
  usuario: { nombre: 'Usuario E2E', email: 'usuario@e2e.test', password: 'Clave-E2E-solo-pruebas', rol: 'USUARIO' as const }
};

type Props = Record<string, string | number | null>;
interface ParcelaFalsa { id: string; propiedades: Props; centro: [number, number]; medio: number }

const cuadrado = (lat: number, lon: number, m: number) => ({
  type: 'MultiPolygon' as const,
  coordinates: [[[[lon - m, lat - m], [lon + m, lat - m], [lon + m, lat + m], [lon - m, lat + m], [lon - m, lat - m]]]]
});

/** El centro del mapa inicial (-33.035, -68.88) cae dentro de la parcela A. */
export const PARCELAS: ParcelaFalsa[] = [
  { id: 'E2E.1', centro: [-33.035, -68.88], medio: 0.02, propiedades: { nomenclatu: '990000000000000000001', zonificaci: 'Zona de prueba A', suptotal: 500, frenmetros: 12.5, codigo: 'ZA', fos_max: 0.6, ordenanza: 'Ord. E2E 1' } },
  { id: 'E2E.2', centro: [-33.06, -68.92], medio: 0.004, propiedades: { nomenclatu: '990000000000000000002', zonificaci: 'Zona de prueba B', suptotal: 800, frenmetros: 20, codigo: 'ZB', fos_max: 0.5, ordenanza: 'Ord. E2E 2' } },
  { id: 'E2E.3', centro: [-33.0, -68.84], medio: 0.004, propiedades: { nomenclatu: '990000000000000000003', zonificaci: 'Zona de prueba C', suptotal: 300, frenmetros: 10, codigo: 'ZC', fos_max: 0.7, ordenanza: 'Ord. E2E 3' } }
];

const FUENTES = ['catastro', 'aysam', 'aguas_lujan', 'electricidad'].map(capa => ({
  capa, fuente: `Fuente de prueba · ${capa}`, url: 'https://ejemplo.invalid/' + capa, registros: 3, invalidos: 0, sinGeometria: 0, importadoEn: '2026-10-01'
}));

const feature = (p: ParcelaFalsa) => ({ type: 'Feature', id: p.id, geometry: cuadrado(p.centro[0], p.centro[1], p.medio), properties: p.propiedades });
const contiene = (p: ParcelaFalsa, lat: number, lon: number) =>
  Math.abs(lat - p.centro[0]) <= p.medio && Math.abs(lon - p.centro[1]) <= p.medio;

interface Ficha { parcelaId: string; direccion: string | null; observaciones: string | null; fuente: string | null; referencia: string | null; actualizadoPor: string | null; actualizadoEn: string | null; version: number }
interface Reporte { id: number; parcelaId: string; nomenclatura: string; seccion: string; tipo: string; descripcion: string; estado: string; respuesta: string | null;
  creadoPor: { nombre: string; email: string }; respondidoPor: { nombre: string; email: string } | null; creadoEn: string; actualizadoEn: string; respondidoEn: string | null; parcelaIdCanonico: string | null }

export class ApiFalsa {
  /** Cuenta con sesión abierta; null si nadie ingresó. */
  sesion: (typeof CUENTAS)[keyof typeof CUENTAS] | null = null;
  caida = false;
  private fallos: { patron: RegExp; metodo?: string; estado: number; cuerpo: unknown; veces: number }[] = [];
  private guardadas: { id: number; email: string; parcelaId: string; nomenclatura: string; latitud: number; longitud: number; creadaEn: string }[] = [];
  private historial: { id: number; email: string; latitud: number; longitud: number; consultadaEn: string; resumen: string }[] = [];
  private fichas = new Map<string, Ficha>();
  private reportes: Reporte[] = [];
  private seq = 1;
  readonly pedidos: string[] = [];

  /** Responde con un error HTTP a los próximos pedidos que coincidan (por defecto, uno). */
  fallar(patron: RegExp, estado: number, cuerpo: unknown, opciones: { metodo?: string; veces?: number } = {}) {
    this.fallos.push({ patron, metodo: opciones.metodo, estado, cuerpo, veces: opciones.veces ?? 1 });
  }
  /** Simula que el servidor venció la sesión: los pedidos protegidos devuelven 401. */
  vencerSesion() { this.sesion = null; }
  /** Datos ya existentes para empezar una prueba sin repetir pasos. */
  sembrarFicha(parcelaId: string, ficha: Partial<Ficha>) {
    this.fichas.set(parcelaId, { parcelaId, direccion: null, observaciones: null, fuente: 'Fuente E2E', referencia: 'Expediente E2E', actualizadoPor: 'Admin E2E', actualizadoEn: '2026-10-20T12:00:00Z', version: 1, ...ficha });
  }
  sembrarGuardada(email: string, parcelaId: string) {
    const p = PARCELAS.find(x => x.id === parcelaId)!;
    this.guardadas.push({ id: this.seq++, email, parcelaId, nomenclatura: String(p.propiedades['nomenclatu']), latitud: p.centro[0], longitud: p.centro[1], creadaEn: '2026-10-21T10:00:00Z' });
  }

  async instalar(page: Page) {
    // Sin tráfico externo: los mosaicos del mapa no se descargan.
    await page.route(/tile\.openstreetmap|basemaps|tiles\./, r => r.fulfill({ status: 204 }));
    await page.addInitScript(() => localStorage.setItem('loteseguro.asistente.visto', '1'));
    await page.route('**/api/**', r => this.atender(r));
  }

  private json(r: Route, estado: number, cuerpo?: unknown) {
    return r.fulfill(cuerpo === undefined ? { status: estado } : { status: estado, contentType: 'application/json', body: JSON.stringify(cuerpo) });
  }
  private error(r: Route, estado: number, codigo: string, mensaje: string) {
    return this.json(r, estado, { timestamp: '2026-10-25T12:00:00Z', status: estado, codigo, mensaje, path: '', errores: [], correlacionId: 'e2e-' + codigo.toLowerCase() });
  }
  private pagina<T>(items: T[], n: number) {
    const total = items.length, tam = 20;
    return { items: items.slice(n * tam, n * tam + tam), pagina: n, totalPaginas: Math.max(1, Math.ceil(total / tam)), total };
  }
  private consulta(lat: number, lon: number) {
    const hits = PARCELAS.filter(p => contiene(p, lat, lon));
    return { latitud: lat, longitud: lon, parcelas: hits.map(feature), hayMasParcelas: false, dentroRadioAgua: true, dentroRadioAguasLujan: false,
      electricidad: { distanciaMetros: 42.5, tipo: 'Media tensión', radioBusquedaMetros: 1000, alcance: 'Distancia a un tramo publicado; no confirma conexión.' },
      fuentes: FUENTES, advertencia: 'Datos de prueba E2E. No acreditan dominio ni factibilidad.' };
  }
  private informe(c: { latitud: number; longitud: number }, parcelaId: string | null, historico: boolean) {
    const aportes = [...this.fichas.values()].filter(f => !parcelaId || f.parcelaId === parcelaId)
      .map(f => ({ parcelaId: f.parcelaId, ficha: { direccion: f.direccion, observaciones: f.observaciones, fuente: f.fuente, referencia: f.referencia, actualizadoEn: f.actualizadoEn } }));
    return { generadoEn: '2026-10-25T12:00:00Z', fechaConsulta: '2026-10-25T11:00:00Z', historico, parcelaId, consulta: this.consulta(c.latitud, c.longitud), aportes };
  }
  private exigir(r: Route, rol?: 'ADMIN'): boolean {
    if (!this.sesion) { void this.error(r, 401, 'AUTENTICACION_REQUERIDA', 'Se requiere autenticación.'); return false; }
    if (rol && this.sesion.rol !== rol) { void this.error(r, 403, 'ACCESO_DENEGADO', 'No tenés permiso.'); return false; }
    return true;
  }

  private async atender(r: Route) {
    const req = r.request(); const url = new URL(req.url()); const metodo = req.method();
    const ruta = url.pathname.replace(/^\/api/, ''); const q = url.searchParams;
    this.pedidos.push(metodo + ' ' + ruta);
    if (this.caida) return r.abort('connectionrefused');
    const i = this.fallos.findIndex(f => f.patron.test(ruta) && (!f.metodo || f.metodo === metodo));
    if (i >= 0) {
      const f = this.fallos[i]; if (--f.veces <= 0) this.fallos.splice(i, 1);
      return this.json(r, f.estado, f.cuerpo);
    }
    let m: RegExpMatchArray | null;
    const cuerpo = () => { try { return JSON.parse(req.postData() || '{}'); } catch { return {}; } };

    if (ruta === '/csrf') return this.json(r, 200, { headerName: 'X-XSRF-TOKEN', token: 'e2e' });
    if (ruta === '/public/v1/visitas') return this.json(r, 204);
    if (ruta === '/me') return this.sesion ? this.json(r, 200, { nombre: this.sesion.nombre, email: this.sesion.email, rol: this.sesion.rol }) : this.error(r, 401, 'AUTENTICACION_REQUERIDA', 'Sin sesión.');
    if (ruta === '/login') {
      const datos = new URLSearchParams(req.postData() || '');
      const cuenta = Object.values(CUENTAS).find(c => c.email === datos.get('username') && c.password === datos.get('password'));
      if (!cuenta) return this.error(r, 401, 'CREDENCIALES_INVALIDAS', 'Credenciales inválidas.');
      this.sesion = cuenta; return r.fulfill({ status: 200, contentType: 'text/plain', body: '' });
    }
    if (ruta === '/logout') { this.sesion = null; return this.json(r, 204); }

    // ---- Consulta pública ----
    if (ruta === '/public/v1/territorio/fuentes') return this.json(r, 200, FUENTES);
    if (ruta.startsWith('/public/v1/territorio/capas/')) return this.json(r, 200, { type: 'FeatureCollection', features: [], fuente: FUENTES[0], hayMas: false, acercar: true, mensaje: 'Acercá el mapa para ver esta capa.' });
    if (ruta === '/public/v1/territorio/consulta') return this.json(r, 200, this.consulta(Number(q.get('latitud')), Number(q.get('longitud'))));
    if (ruta === '/public/v1/territorio/parcelas') {
      const n = q.get('nomenclatura') ?? '';
      const items = PARCELAS.filter(p => String(p.propiedades['nomenclatu']).startsWith(n)).map(feature);
      return this.json(r, 200, { items, pagina: 0, hayMas: false });
    }
    if (ruta === '/public/v1/territorio/parcelas/cercanas') {
      const lat = Number(q.get('latitud')), lon = Number(q.get('longitud'));
      const cerca = PARCELAS.filter(p => contiene(p, lat, lon)).map(p => ({ parcela: feature(p), distanciaMetros: 0 }));
      return this.json(r, 200, { latitud: lat, longitud: lon, radioMetros: 30, parcelas: cerca });
    }
    if ((m = ruta.match(/^\/public\/v1\/territorio\/parcelas\/([^/]+)\/ficha$/))) {
      const f = this.fichas.get(decodeURIComponent(m[1]));
      return f ? this.json(r, 200, { direccion: f.direccion, observaciones: f.observaciones, fuente: f.fuente, referencia: f.referencia, actualizadoEn: f.actualizadoEn }) : this.json(r, 200);
    }
    if ((m = ruta.match(/^\/public\/v1\/territorio\/parcelas\/([^/]+)$/))) {
      const p = PARCELAS.find(x => x.id === decodeURIComponent(m![1]));
      return p ? this.json(r, 200, feature(p)) : this.error(r, 404, 'PARCELA_NO_ENCONTRADA', 'La parcela no existe.');
    }
    if (ruta === '/public/v1/territorio/direcciones') {
      const texto = (q.get('texto') ?? '').toLowerCase();
      const resultados = texto.includes('prueba') ? [{ origen: 'GEOREF', texto: 'CALLE DE PRUEBA 100, Luján de Cuyo, Mendoza', calle: 'CALLE DE PRUEBA', altura: 100, cruce: null,
        localidad: 'Luján', latitud: -33.035, longitud: -68.88, parcelaId: null, nomenclatura: null }] : [];
      return this.json(r, 200, { resultados, fuente: 'Georef (prueba)', advertencia: 'Ubicación aproximada: elegí tu parcela.' });
    }

    // ---- Mi espacio (cuenta autenticada) ----
    if (ruta === '/mi-espacio/consultas' && metodo === 'POST') {
      if (!this.exigir(r)) return;
      const { latitud, longitud } = cuerpo(); const c = this.consulta(latitud, longitud);
      const nom = c.parcelas[0]?.properties['nomenclatu'];
      this.historial.unshift({ id: this.seq++, email: this.sesion!.email, latitud, longitud, consultadaEn: new Date().toISOString(), resumen: nom ? 'Parcela ' + nom : 'Sin parcela identificada' });
      return this.json(r, 200, c);
    }
    if (ruta === '/mi-espacio/guardadas' && metodo === 'GET') {
      if (!this.exigir(r)) return;
      return this.json(r, 200, this.pagina(this.guardadas.filter(g => g.email === this.sesion!.email).map(g => ({ ...g, etiqueta: null })), Number(q.get('pagina') ?? 0)));
    }
    if ((m = ruta.match(/^\/mi-espacio\/guardadas\/([^/]+)\/informe$/))) {
      if (!this.exigir(r)) return;
      const g = this.guardadas.find(x => x.id === Number(m![1]) && x.email === this.sesion!.email);
      return g ? this.json(r, 200, this.informe(g, g.parcelaId, false)) : this.error(r, 404, 'GUARDADA_NO_ENCONTRADA', 'No existe.');
    }
    if ((m = ruta.match(/^\/mi-espacio\/guardadas\/([^/]+)$/))) {
      if (!this.exigir(r)) return;
      if (metodo === 'PUT') {
        const id = decodeURIComponent(m[1]); const p = PARCELAS.find(x => x.id === id);
        if (!p) return this.error(r, 404, 'PARCELA_NO_ENCONTRADA', 'La parcela no existe.');
        const { latitud, longitud } = cuerpo();
        let g = this.guardadas.find(x => x.parcelaId === id && x.email === this.sesion!.email);
        if (!g) { g = { id: this.seq++, email: this.sesion!.email, parcelaId: id, nomenclatura: String(p.propiedades['nomenclatu']), latitud, longitud, creadaEn: new Date().toISOString() }; this.guardadas.push(g); }
        return this.json(r, 200, { ...g, etiqueta: null });
      }
      if (metodo === 'DELETE') { this.guardadas = this.guardadas.filter(x => !(x.id === Number(m![1]) && x.email === this.sesion!.email)); return this.json(r, 204); }
    }
    if (ruta === '/mi-espacio/historial') {
      if (!this.exigir(r)) return;
      return this.json(r, 200, this.pagina(this.historial.filter(h => h.email === this.sesion!.email), Number(q.get('pagina') ?? 0)));
    }
    if ((m = ruta.match(/^\/mi-espacio\/historial\/([^/]+)\/informe$/))) {
      if (!this.exigir(r)) return;
      const h = this.historial.find(x => x.id === Number(m![1]) && x.email === this.sesion!.email);
      return h ? this.json(r, 200, this.informe(h, null, true)) : this.error(r, 404, 'HISTORIAL_NO_ENCONTRADO', 'No existe.');
    }
    if ((m = ruta.match(/^\/mi-espacio\/historial\/([^/]+)$/)) && metodo === 'DELETE') {
      if (!this.exigir(r)) return;
      this.historial = this.historial.filter(x => !(x.id === Number(m![1]) && x.email === this.sesion!.email)); return this.json(r, 204);
    }
    if (ruta === '/mi-espacio/comparacion') {
      if (!this.exigir(r)) return;
      const ids = (q.get('ids') ?? '').split(',').map(Number);
      return this.json(r, 200, ids.map(id => this.guardadas.find(g => g.id === id && g.email === this.sesion!.email)).filter(Boolean).map(g => this.informe(g!, g!.parcelaId, false)));
    }
    if (ruta === '/mi-espacio/reportes') {
      if (!this.exigir(r)) return;
      if (metodo === 'POST') {
        const d = cuerpo(); const p = PARCELAS.find(x => x.id === d.parcelaId);
        if (!p) return this.error(r, 404, 'PARCELA_NO_ENCONTRADA', 'La parcela no existe.');
        const ahora = new Date().toISOString();
        const rep: Reporte = { id: this.seq++, parcelaId: p.id, nomenclatura: String(p.propiedades['nomenclatu']), seccion: d.seccion, tipo: d.tipo, descripcion: d.descripcion, estado: 'PENDIENTE', respuesta: null,
          creadoPor: { nombre: this.sesion!.nombre, email: this.sesion!.email }, respondidoPor: null, creadoEn: ahora, actualizadoEn: ahora, respondidoEn: null, parcelaIdCanonico: null };
        this.reportes.unshift(rep); return this.json(r, 201, rep);
      }
      return this.json(r, 200, this.pagina(this.reportes.filter(x => x.creadoPor.email === this.sesion!.email), Number(q.get('pagina') ?? 0)));
    }

    // ---- Administración ----
    if (ruta === '/admin/parcelas/fichas') {
      if (!this.exigir(r, 'ADMIN')) return;
      const items = [...this.fichas.values()].map(f => ({ ...f, nomenclatura: String(PARCELAS.find(p => p.id === f.parcelaId)?.propiedades['nomenclatu']) }));
      return this.json(r, 200, this.pagina(items, 0));
    }
    if ((m = ruta.match(/^\/admin\/parcelas\/([^/]+)\/ficha$/))) {
      if (!this.exigir(r, 'ADMIN')) return;
      const id = decodeURIComponent(m[1]); const p = PARCELAS.find(x => x.id === id);
      if (!p) return this.error(r, 404, 'PARCELA_NO_ENCONTRADA', 'La parcela no existe.');
      const nomenclatura = String(p.propiedades['nomenclatu']);
      if (metodo === 'GET') return this.json(r, 200, { ...(this.fichas.get(id) ?? { parcelaId: id, direccion: null, observaciones: null, fuente: null, referencia: null, actualizadoPor: null, actualizadoEn: null, version: 0 }), nomenclatura });
      if (metodo === 'PUT') {
        const d = cuerpo(); const actual = this.fichas.get(id);
        if ((actual?.version ?? 0) !== (d.version ?? 0)) return this.error(r, 409, 'FICHA_MODIFICADA', 'Otra persona actualizó la ficha.');
        const nueva: Ficha = { parcelaId: id, direccion: d.direccion ?? null, observaciones: d.observaciones ?? null, fuente: d.fuente, referencia: d.referencia,
          actualizadoPor: this.sesion!.email, actualizadoEn: new Date().toISOString(), version: (actual?.version ?? 0) + 1 };
        this.fichas.set(id, nueva); return this.json(r, 200, { ...nueva, nomenclatura });
      }
    }
    if (ruta === '/admin/estadisticas') {
      if (!this.exigir(r, 'ADMIN')) return;
      return this.json(r, 200, { desde: q.get('desde'), hasta: q.get('hasta'), zona: 'Luján de Cuyo', visitas: 3, consultas: 2, dias: [] });
    }
    if (ruta === '/admin/reportes' && metodo === 'GET') {
      if (!this.exigir(r, 'ADMIN')) return;
      const estado = q.get('estado');
      return this.json(r, 200, this.pagina(this.reportes.filter(x => !estado || x.estado === estado), Number(q.get('pagina') ?? 0)));
    }
    if ((m = ruta.match(/^\/admin\/reportes\/(\d+)$/)) && metodo === 'PATCH') {
      if (!this.exigir(r, 'ADMIN')) return;
      const rep = this.reportes.find(x => x.id === Number(m![1]));
      if (!rep) return this.error(r, 404, 'REPORTE_NO_ENCONTRADO', 'El reporte no existe.');
      const d = cuerpo(); const resp = (d.respuesta ?? '').trim() || null;
      if ((d.estado === 'RESUELTO' || d.estado === 'DESCARTADO') && (!resp || resp.length < 10))
        return this.error(r, 400, 'RESPUESTA_REQUERIDA', 'Para cerrar o descartar un reporte, escribí una respuesta de al menos 10 caracteres.');
      Object.assign(rep, { estado: d.estado, respuesta: resp, respondidoPor: { nombre: this.sesion!.nombre, email: this.sesion!.email }, respondidoEn: new Date().toISOString() });
      return this.json(r, 200, rep);
    }
    if (ruta === '/public/v1/usuarios') return this.json(r, 201);
    return this.error(r, 404, 'RECURSO_NO_ENCONTRADO', 'Ruta no simulada: ' + metodo + ' ' + ruta);
  }
}
