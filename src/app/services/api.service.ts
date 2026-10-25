import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, Subject } from 'rxjs';
import { SesionUsuario } from '../models/admin.model';

export type AccionError = 'corregir' | 'ingresar' | 'reintentar' | 'recargar' | 'ninguna';
export interface ErrorAplicacion {
  codigo: string;
  mensaje: string;
  detalle: string;
  accion: AccionError;
  recuperable: boolean;
}

@Injectable({providedIn:'root'})
export class ApiService {
  private http=inject(HttpClient);
  private autenticacionRequeridaSubject=new Subject<void>();
  readonly autenticacionRequerida$=this.autenticacionRequeridaSubject.asObservable();
  get<T>(path:string) { return firstValueFrom(this.http.get<T>('/api'+path)); }
  async write<T>(method:string,path:string,body:unknown=null) {
    const csrf=await this.get<{headerName:string;token:string}>('/csrf');
    return firstValueFrom(this.http.request<T>(method,'/api'+path,{body,headers:{[csrf.headerName]:csrf.token}}));
  }
  async login(email:string,password:string) {
    const csrf=await this.get<{headerName:string;token:string}>('/csrf');
    const body=new URLSearchParams({username:email,password}).toString();
    try {
      await firstValueFrom(this.http.post('/api/login',body,{headers:new HttpHeaders({[csrf.headerName]:csrf.token,'Content-Type':'application/x-www-form-urlencoded'}),responseType:'text'}));
    } catch (error) {
      // Un 401 durante el formulario de acceso significa credenciales inválidas,
      // no una sesión vencida. Conservamos esa distinción para orientar al usuario.
      if(error instanceof HttpErrorResponse && error.status===401){
        throw new HttpErrorResponse({
          error:{codigo:'CREDENCIALES_INVALIDAS'},headers:error.headers,status:error.status,
          statusText:error.statusText,url:error.url??undefined
        });
      }
      throw error;
    }
    return this.get<SesionUsuario>('/me');
  }
  analizarError(error:unknown):ErrorAplicacion {
    if(!(error instanceof HttpErrorResponse)) return {codigo:'ERROR_DESCONOCIDO',mensaje:'No se pudo completar la operación.',detalle:'Probá nuevamente.',accion:'reintentar',recuperable:true};
    const respuesta=(typeof error.error==='object' && error.error ? error.error : {}) as
      {codigo?:string;mensaje?:string;errores?:Array<{campo?:string;mensaje?:string}>;correlacionId?:string};
    const codigoRespuesta=String(respuesta.codigo || '').toUpperCase();
    const errores=Array.isArray(respuesta.errores) ? respuesta.errores : [];
    const campos=errores.map((e:{campo?:string;mensaje?:string})=>[e.campo,e.mensaje].filter(Boolean).join(': ')).filter(Boolean).join('. ');
    const seguimiento=respuesta.correlacionId ? `Código de seguimiento: ${respuesta.correlacionId}` : '';
    const definidos:Record<string,Omit<ErrorAplicacion,'codigo'>>={
      SERVIDOR_NO_DISPONIBLE:{mensaje:'El servidor no está disponible.',detalle:'Comprobá que el backend esté iniciado y volvé a intentar.',accion:'reintentar',recuperable:true},
      AUTENTICACION_REQUERIDA:{mensaje:'Tu sesión terminó.',detalle:'Volvé a ingresar para continuar desde esta sección.',accion:'ingresar',recuperable:true},
      CREDENCIALES_INVALIDAS:{mensaje:'Usuario o contraseña incorrectos.',detalle:'Revisá los datos ingresados e intentá nuevamente.',accion:'corregir',recuperable:true},
      ACCESO_DENEGADO:{mensaje:'Tu cuenta no tiene permiso para realizar esta acción.',detalle:'Ingresá con una cuenta que tenga el rol necesario.',accion:'ninguna',recuperable:false},
      CSRF_INVALIDO:{mensaje:'La sesión de seguridad venció.',detalle:'Recargá la página antes de volver a enviar la operación.',accion:'recargar',recuperable:true},
      DIRECCIONES_NO_DISPONIBLES:{mensaje:'La búsqueda por dirección no está disponible.',detalle:'Probá nuevamente o buscá por nomenclatura.',accion:'reintentar',recuperable:true},
      CAPA_NO_IMPORTADA:{mensaje:'Falta una capa territorial en esta instalación.',detalle:'Quien administra el sistema debe ejecutar iniciar-local.cmd --preparar-solo.',accion:'ninguna',recuperable:false},
      TERRITORIO_NO_IMPORTADO:{mensaje:'Los datos territoriales todavía no fueron preparados.',detalle:'Quien administra el sistema debe importar las capas oficiales.',accion:'ninguna',recuperable:false},
      BASE_DATOS_NO_DISPONIBLE:{mensaje:'La base de datos no responde.',detalle:'Esperá un momento y volvé a intentar.',accion:'reintentar',recuperable:true},
      FICHA_MODIFICADA:{mensaje:'Otra persona actualizó esta ficha.',detalle:'Recargá la ficha; conservamos lo que escribiste para que puedas revisarlo.',accion:'recargar',recuperable:true},
      EMAIL_EN_USO:{mensaje:'Ya existe una cuenta con ese correo.',detalle:'Usá otro correo o ingresá con la cuenta existente.',accion:'corregir',recuperable:true},
      PARCELA_NO_ENCONTRADA:{mensaje:'La parcela ya no está disponible.',detalle:'Volvé al mapa y elegí una parcela de la importación actual.',accion:'corregir',recuperable:true},
      GUARDADA_NO_ENCONTRADA:{mensaje:'La consulta guardada ya no está disponible.',detalle:'Actualizá la lista para continuar.',accion:'recargar',recuperable:true},
      HISTORIAL_NO_ENCONTRADO:{mensaje:'La consulta del historial ya no está disponible.',detalle:'Actualizá la lista para continuar.',accion:'recargar',recuperable:true},
      RECURSO_NO_ENCONTRADO:{mensaje:'La información solicitada no está disponible.',detalle:'Volvé a la sección anterior y actualizá los datos.',accion:'recargar',recuperable:true},
      PARCELA_CAMBIO:{mensaje:'La parcela cambió desde que la consultaste.',detalle:'Volvé a abrirla desde el mapa para usar los datos actuales.',accion:'recargar',recuperable:true},
      PARCELA_NO_INCLUIDA:{mensaje:'La parcela no forma parte de esta comparación.',detalle:'Actualizá la selección e intentá nuevamente.',accion:'corregir',recuperable:true},
      ERROR_INTERNO:{mensaje:'Ocurrió un error inesperado.',detalle:seguimiento || 'Volvé a intentar. Si se repite, avisá al administrador.',accion:'reintentar',recuperable:true}
    };
    const codigo=codigoRespuesta || (error.status===0?'SERVIDOR_NO_DISPONIBLE':error.status===401?'AUTENTICACION_REQUERIDA':error.status===403?'ACCESO_DENEGADO':'ERROR_DESCONOCIDO');
    const validacion=['CONSULTA_INVALIDA','DATOS_INVALIDOS','CONSULTA_TERRITORIAL_INVALIDA','DIRECCION_INVALIDA','PASSWORD_INVALIDA','RANGO_INVALIDO','PAGINA_INVALIDA','COMPARACION_INVALIDA','PUNTO_FUERA_PARCELA'];
    let resultado=definidos[codigo];
    if(!resultado && validacion.includes(codigo)) resultado={mensaje:campos || respuesta.mensaje || 'Revisá los datos ingresados.',detalle:'Corregí los campos indicados y volvé a intentar.',accion:'corregir',recuperable:true};
    if(!resultado) resultado={mensaje:campos || respuesta.mensaje || 'No se pudo completar la operación.',detalle:seguimiento,accion:error.status>=500?'reintentar':'ninguna',recuperable:error.status>=500};
    if(codigo==='AUTENTICACION_REQUERIDA') this.autenticacionRequeridaSubject.next();
    return {codigo,...resultado};
  }
  error(error:unknown):string {
    const detalle=this.analizarError(error);
    return detalle.detalle ? `${detalle.mensaje} ${detalle.detalle}` : detalle.mensaje;
  }
}
