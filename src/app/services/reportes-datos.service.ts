import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { ActualizarReporteDato, CrearReporteDato, EstadoReporte, Pagina, ReporteDato } from '../models/reporte-dato.model';

@Injectable({providedIn:'root'})
export class ReportesDatosService {
  private api=inject(ApiService);
  private pendientesSubject=new BehaviorSubject<number|null>(null);
  /** Cantidad de reportes pendientes de la bandeja del administrador (null mientras no se consultó). */
  readonly pendientes$=this.pendientesSubject.asObservable();
  crear(reporte:CrearReporteDato):Promise<ReporteDato>{ return this.api.write<ReporteDato>('POST','/mi-espacio/reportes',reporte); }
  listar(pagina=0):Promise<Pagina<ReporteDato>>{ return this.api.get<Pagina<ReporteDato>>('/mi-espacio/reportes?pagina='+pagina); }
  /** Bandeja del administrador; sin estado devuelve todos. */
  administrar(estado:EstadoReporte|null,pagina=0):Promise<Pagina<ReporteDato>>{
    return this.api.get<Pagina<ReporteDato>>('/admin/reportes?pagina='+pagina+(estado?'&estado='+estado:''));
  }
  actualizar(id:number,cambio:ActualizarReporteDato):Promise<ReporteDato>{ return this.api.write<ReporteDato>('PATCH','/admin/reportes/'+id,cambio); }
  /** Actualiza el contador de pendientes. Un fallo se ignora: el contador es informativo. */
  async refrescarPendientes():Promise<void>{
    try{ this.pendientesSubject.next((await this.administrar('PENDIENTE',0)).total); }catch{ /* se conserva el último valor */ }
  }
  limpiarPendientes():void{ this.pendientesSubject.next(null); }
}
