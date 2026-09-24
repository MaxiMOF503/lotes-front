export interface Procedencia { tipo:'SIMULADO'|'NO_VERIFICADO'|'OFICIAL';fuente:string;referencia:string|null; }
export interface LoteEdicion {
  identificador:string;latitud:number|null;longitud:number|null;departamentoId:number|null;
  direccionAproximada:string|null;zonificacion:string|null;zonificacionVerificada:boolean;
  distanciaRedElectricaMts:number|null;tieneAccesoElectricidad:boolean;tieneCoberturaAgua:boolean;
  procedenciaLote:Procedencia;procedenciaZonificacion:Procedencia;procedenciaElectricidad:Procedencia;procedenciaAgua:Procedencia;
}
export interface LoteDetalle {id:number;datos:LoteEdicion;}
export interface PaginaLotes {items:{id:number;identificador:string;direccionAproximada:string|null}[];pagina:number;totalPaginas:number;total:number;}
export interface DiaEstadistica {fecha:string;visitas:number;consultas:number;porIdentificador:number;porCoordenadas:number;sinCriterioValido:number;exitosas:number;invalidas:number;sinResultados:number;erroresTecnicos:number;}
export interface Estadisticas {desde:string;hasta:string;zona:string;visitas:number;consultas:number;dias:DiaEstadistica[];}
export const nuevoLote=():LoteEdicion=>({identificador:'',latitud:null,longitud:null,departamentoId:null,direccionAproximada:null,
  zonificacion:null,zonificacionVerificada:false,distanciaRedElectricaMts:null,tieneAccesoElectricidad:false,tieneCoberturaAgua:false,
  procedenciaLote:{tipo:'NO_VERIFICADO',fuente:'',referencia:null},procedenciaZonificacion:{tipo:'NO_VERIFICADO',fuente:'',referencia:null},
  procedenciaElectricidad:{tipo:'NO_VERIFICADO',fuente:'',referencia:null},procedenciaAgua:{tipo:'NO_VERIFICADO',fuente:'',referencia:null}});
