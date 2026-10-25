export type SeccionReporte = 'PARCELA'|'ZONIFICACION'|'AGUA'|'ELECTRICIDAD'|'FICHA_COMPLEMENTARIA'|'OTRO';
export type TipoReporte = 'INCORRECTO'|'FALTANTE';
export type EstadoReporte = 'PENDIENTE'|'EN_REVISION'|'RESUELTO'|'DESCARTADO';

export interface CrearReporteDato { parcelaId:string; seccion:SeccionReporte; tipo:TipoReporte; descripcion:string; }
export interface ReporteDato {
  id:number; parcelaId:string; nomenclatura:string; seccion:SeccionReporte; tipo:TipoReporte;
  descripcion:string; estado:EstadoReporte; respuesta:string|null; creadoPor:{nombre:string;email:string};
  respondidoPor:{nombre:string;email:string}|null; creadoEn:string; actualizadoEn:string; respondidoEn:string|null;
}
export interface Pagina<T> { items:T[]; pagina:number; totalPaginas:number; total:number; }
