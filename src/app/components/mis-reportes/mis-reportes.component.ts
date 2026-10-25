import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { EstadoReporte, Pagina, ReporteDato, SeccionReporte, TipoReporte } from '../../models/reporte-dato.model';
import { ApiService } from '../../services/api.service';
import { ReportesDatosService } from '../../services/reportes-datos.service';
import { EstadoOperacionComponent } from '../estado-operacion/estado-operacion.component';

@Component({selector:'app-mis-reportes',standalone:true,imports:[CommonModule,EstadoOperacionComponent],templateUrl:'./mis-reportes.component.html',styleUrls:['./mis-reportes.component.css','./mis-reportes-estados.component.css']})
export class MisReportesComponent implements OnInit {
  private reportes=inject(ReportesDatosService);private api=inject(ApiService);private cd=inject(ChangeDetectorRef);
  pagina:Pagina<ReporteDato>|null=null;cargando=true;error='';
  ngOnInit(){void this.cargar(0);}
  async cargar(numero:number){
    if(numero<0||(this.pagina&&numero>=this.pagina.totalPaginas&&this.pagina.totalPaginas>0))return;
    this.cargando=true;this.error='';
    try{this.pagina=await this.reportes.listar(numero);}catch(e){this.error=this.api.error(e);}finally{this.cargando=false;this.cd.markForCheck();}
  }
  seccion(valor:SeccionReporte){return ({PARCELA:'Datos de la parcela',ZONIFICACION:'Zonificación',AGUA:'Cobertura de agua',ELECTRICIDAD:'Infraestructura eléctrica',FICHA_COMPLEMENTARIA:'Información complementaria',OTRO:'Otro dato'} as Record<SeccionReporte,string>)[valor];}
  tipo(valor:TipoReporte){return valor==='INCORRECTO'?'Dato incorrecto':'Información faltante';}
  estado(valor:EstadoReporte){return ({PENDIENTE:'Pendiente',EN_REVISION:'En revisión',RESUELTO:'Resuelto',DESCARTADO:'No corresponde'} as Record<EstadoReporte,string>)[valor]||valor;}
}
