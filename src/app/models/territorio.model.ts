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
  electricidad: { distanciaMetros: number | null; tipo: string | null; radioBusquedaMetros: number; alcance: string };
  fuentes: FuenteTerritorial[]; advertencia: string;
}
export interface BusquedaParcelas { items: ElementoTerritorial[]; pagina: number; hayMas: boolean; }
/** Búsqueda pública por nomenclatura: lista de coincidencias antes de abrir la ficha de una parcela. */
export interface EstadoBusquedaParcelas {
  estado: 'vacio' | 'cargando' | 'opciones' | 'sin-resultados' | 'error';
  nomenclatura: string;
  items: ElementoTerritorial[];
  hayMas: boolean;
  error: string | null;
}
/** Cómo se llegó a la consulta: clic en el mapa o búsqueda por nomenclatura. */
export type OrigenConsulta = { tipo: 'mapa' } | { tipo: 'nomenclatura'; nomenclatura: string };
export interface EstadoTerritorial {
  estado: 'vacio' | 'cargando' | 'cargado' | 'error';
  datos: ConsultaTerritorial | null;
  error: string | null;
}
