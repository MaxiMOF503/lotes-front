export interface DiaEstadistica {fecha:string;visitas:number;consultas:number;porIdentificador:number;porCoordenadas:number;porDireccion:number;sinCriterioValido:number;exitosas:number;invalidas:number;sinResultados:number;erroresTecnicos:number;}
export interface Estadisticas {desde:string;hasta:string;zona:string;visitas:number;consultas:number;dias:DiaEstadistica[];}
export interface SesionUsuario {nombre:string;email:string;rol:'ADMIN'|'USUARIO';}
