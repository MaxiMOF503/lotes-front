export interface PaginaEspacio<T> {items:T[];pagina:number;totalPaginas:number;total:number;}
export interface Guardada {id:number;parcelaId:string;nomenclatura:string;etiqueta:string|null;latitud:number;longitud:number;creadaEn:string;}
export interface FichaComplementaria {parcelaId:string;nomenclatura:string;direccion:string|null;observaciones:string|null;fuente:string|null;referencia:string|null;actualizadoPor:string|null;actualizadoEn:string|null;version:number|null;}
export interface FichaPublica {direccion:string|null;observaciones:string|null;fuente:string;referencia:string;actualizadoEn:string;}
export interface SeleccionParcela {id:string;latitud?:number;longitud?:number;}

export interface ConsultaHistorial {id:number;latitud:number;longitud:number;consultadaEn:string;resumen:string;}
export interface InformeTerritorial {
 generadoEn:string;fechaConsulta:string;historico:boolean;parcelaId:string|null;
 consulta:import('./territorio.model').ConsultaTerritorial;
 aportes:{parcelaId:string;ficha:FichaPublica}[];
}
