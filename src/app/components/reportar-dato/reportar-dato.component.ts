import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ElementoTerritorial } from '../../models/territorio.model';
import { SeccionReporte, TipoReporte } from '../../models/reporte-dato.model';
import { ApiService } from '../../services/api.service';
import { ReportesDatosService } from '../../services/reportes-datos.service';
import { SesionService } from '../../services/sesion.service';
import { EstadoOperacionComponent } from '../estado-operacion/estado-operacion.component';

@Component({selector:'app-reportar-dato',standalone:true,imports:[CommonModule,FormsModule,EstadoOperacionComponent],templateUrl:'./reportar-dato.component.html',styleUrl:'./reportar-dato.component.css'})
export class ReportarDatoComponent {
  @Input({required:true}) parcela!:ElementoTerritorial;
  @Output() areaSolicitada=new EventEmitter<'reportes'>();
  private reportes=inject(ReportesDatosService);private api=inject(ApiService);private cd=inject(ChangeDetectorRef);
  readonly sesion$=inject(SesionService).sesion$;
  abierto=false;ocupado=false;enviado=false;error='';
  seccion:SeccionReporte='PARCELA';tipo:TipoReporte='INCORRECTO';descripcion='';
  readonly secciones:{valor:SeccionReporte;texto:string}[]=[
    {valor:'PARCELA',texto:'Datos de la parcela'},{valor:'ZONIFICACION',texto:'Zonificación'},
    {valor:'AGUA',texto:'Cobertura de agua'},{valor:'ELECTRICIDAD',texto:'Infraestructura eléctrica'},
    {valor:'FICHA_COMPLEMENTARIA',texto:'Información complementaria'},{valor:'OTRO',texto:'Otro dato'}
  ];
  get descripcionLimpia(){return this.descripcion.trim();}
  get descripcionValida(){const n=this.descripcionLimpia.length;return n>=10&&n<=1000;}
  alternar(){this.abierto=!this.abierto;this.error='';}
  ingresar(){this.areaSolicitada.emit('reportes');}
  async enviar(){
    if(this.ocupado||!this.descripcionValida)return;
    this.ocupado=true;this.error='';
    try{
      await this.reportes.crear({parcelaId:String(this.parcela.id),seccion:this.seccion,tipo:this.tipo,descripcion:this.descripcionLimpia});
      this.enviado=true;this.abierto=false;this.descripcion='';
    }catch(e){this.error=this.api.error(e);}finally{this.ocupado=false;this.cd.markForCheck();}
  }
  nuevo(){this.enviado=false;this.abierto=true;}
}
