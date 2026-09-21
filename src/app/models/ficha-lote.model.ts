/* ====================================================================
 *  Interfaces TypeScript — Contrato público de ficha de lote
 *  Mapeo exacto de los DTOs del backend (GET /api/public/v1/lotes/ficha)
 *  Los datos actuales son SIMULADOS y no tienen valor oficial.
 * ==================================================================== */

export interface FichaLoteResponse {
  criterioConsulta: CriterioConsultaResponse;
  lote: DatosLoteResponse;
  zonificacion: ZonificacionResponse;
  infraestructuraElectrica: ElectricidadResponse;
  coberturaAgua: AguaResponse;
  advertencia: string;
  dondeConsultar: DondeConsultarResponse | null;
}

export interface CriterioConsultaResponse {
  tipo: string;                 // 'IDENTIFICADOR' | 'COORDENADAS'
  identificador: string | null;
  latitud: number | null;
  longitud: number | null;
}

export interface DatosLoteResponse {
  identificador: string;
  direccionAproximada: string | null;
  departamento: string | null;
  coordenadas: CoordenadasResponse;
  procedencia: ProcedenciaResponse;
}

export interface CoordenadasResponse {
  latitud: number;
  longitud: number;
}

export interface ZonificacionResponse {
  descripcion: string | null;
  verificada: boolean;
  procedencia: ProcedenciaResponse;
}

export interface ElectricidadResponse {
  distanciaRedElectricaMts: number | null;
  tieneAcceso: boolean;
  procedencia: ProcedenciaResponse;
}

export interface AguaResponse {
  tieneCobertura: boolean;
  procedencia: ProcedenciaResponse;
}

export interface DondeConsultarResponse {
  departamento: string;
  contacto: string | null;
  direccionOficina: string | null;
  comoConsultar: string | null;
  procedencia: ProcedenciaResponse;
}

export interface ProcedenciaResponse {
  tipo: string;           // 'SIMULADO'
  fuente: string | null;  // 'Dataset demostrativo F-01'
  oficial: boolean;       // false para datos simulados
}

/* Respuesta de error del backend */
export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  codigo: string;    // 'CONSULTA_INVALIDA' | 'LOTE_NO_ENCONTRADO' | 'ERROR_INTERNO'
  mensaje: string;
  path: string;
  errores: DetalleError[];
}

export interface DetalleError {
  campo: string;
  mensaje: string;
}

/** Estados posibles de la consulta en el frontend */
export type EstadoConsulta = 'vacio' | 'cargando' | 'cargado' | 'error' | 'sin-resultados';
