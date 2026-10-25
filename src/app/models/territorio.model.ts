import type { Feature, Geometry } from 'geojson';

export interface FuenteTerritorial {
  capa: string; fuente: string; url: string; registros: number;
  invalidos: number; sinGeometria: number; importadoEn: string;
}
export type ElementoTerritorial = Feature<Geometry, Record<string, string | number | null>>;
export interface CapaResponse {
  type: 'FeatureCollection'; features: ElementoTerritorial[];
  fuente: FuenteTerritorial; hayMas: boolean; acercar: boolean; mensaje: string;
}
export interface ConsultaTerritorial {
  latitud: number; longitud: number; parcelas: ElementoTerritorial[]; hayMasParcelas: boolean;
  dentroRadioAgua: boolean;
  /** Radio de Aguas Luján; falta (undefined/null) en copias antiguas o si la capa no está importada. */
  dentroRadioAguasLujan?: boolean | null;
  electricidad: { distanciaMetros: number | null; tipo: string | null; radioBusquedaMetros: number; alcance: string };
  fuentes: FuenteTerritorial[]; advertencia: string;
}
export interface BusquedaParcelas { items: ElementoTerritorial[]; pagina: number; hayMas: boolean; }
/** Dirección normalizada por Georef (ubicación aproximada) o relevada por el equipo en una ficha (con su parcela). */
export interface DireccionOficial {
  origen: 'GEOREF' | 'FICHA'; texto: string; calle: string | null; altura: number | null; cruce: string | null;
  localidad: string | null; latitud: number | null; longitud: number | null;
  parcelaId: string | null; nomenclatura: string | null;
}
export interface DireccionesResponse { resultados: DireccionOficial[]; fuente: string; advertencia: string; }
export interface ParcelaCercana { parcela: ElementoTerritorial; distanciaMetros: number; }
export interface CercanasResponse { latitud: number; longitud: number; radioMetros: number; parcelas: ParcelaCercana[]; }
/**
 * Búsqueda pública por nomenclatura o por dirección: coincidencias para elegir antes de abrir la ficha.
 * Por dirección, primero se elige la dirección (si hay varias) y después la parcela cercana a su punto.
 */
export interface EstadoBusquedaParcelas {
  estado: 'vacio' | 'cargando' | 'direcciones' | 'opciones' | 'sin-resultados' | 'error';
  tipo: 'nomenclatura' | 'direccion';
  texto: string;
  direcciones: DireccionOficial[];
  items: ElementoTerritorial[];
  /** Metros desde el punto de la dirección, en el mismo orden que items (solo por dirección). */
  distancias: number[] | null;
  punto: { latitud: number; longitud: number } | null;
  radioMetros: number | null;
  hayMas: boolean;
  advertencia: string | null;
  error: string | null;
}
/** Cómo se llegó a la consulta: clic en el mapa, búsqueda por nomenclatura o por dirección. */
export type OrigenConsulta = { tipo: 'mapa' } | { tipo: 'nomenclatura'; nomenclatura: string } | { tipo: 'direccion'; texto: string };
export interface EstadoTerritorial {
  estado: 'vacio' | 'cargando' | 'cargado' | 'error';
  datos: ConsultaTerritorial | null;
  error: string | null;
}
