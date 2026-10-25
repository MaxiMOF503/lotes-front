import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CrearReporteDato, Pagina, ReporteDato } from '../models/reporte-dato.model';

@Injectable({providedIn:'root'})
export class ReportesDatosService {
  private api=inject(ApiService);
  crear(reporte:CrearReporteDato):Promise<ReporteDato>{ return this.api.write<ReporteDato>('POST','/mi-espacio/reportes',reporte); }
  listar(pagina=0):Promise<Pagina<ReporteDato>>{ return this.api.get<Pagina<ReporteDato>>('/mi-espacio/reportes?pagina='+pagina); }
}
