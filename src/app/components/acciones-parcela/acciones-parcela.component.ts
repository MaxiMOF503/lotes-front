import {Component,Input,Output,EventEmitter,OnChanges,OnDestroy,inject,ChangeDetectorRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {Subscription} from 'rxjs';
import {ElementoTerritorial,ConsultaTerritorial} from '../../models/territorio.model';
import {FichaPublica} from '../../models/espacio-territorial.model';
import {EspacioTerritorialService} from '../../services/espacio-territorial.service';
import {SesionService} from '../../services/sesion.service';
import {ApiService} from '../../services/api.service';
import {EstadoOperacionComponent} from '../estado-operacion/estado-operacion.component';

@Component({selector:'app-acciones-parcela',standalone:true,imports:[CommonModule,EstadoOperacionComponent],
 templateUrl:'./acciones-parcela.component.html',styleUrl:'./acciones-parcela.component.css'})
export class AccionesParcelaComponent implements OnChanges,OnDestroy {
 @Input({required:true}) parcela!:ElementoTerritorial;
 @Input({required:true}) consulta!:ConsultaTerritorial;
 @Output() areaSolicitada=new EventEmitter<void>();
 private espacio=inject(EspacioTerritorialService); private sesion=inject(SesionService);
 private api=inject(ApiService);private http=inject(HttpClient);private cd=inject(ChangeDetectorRef);
 readonly sesion$=this.sesion.sesion$;
 ficha:FichaPublica|null=null;cargando=true;errorFicha='';error='';mensaje='';ocupado=false;
 private request?:Subscription;private revision=0;
 ngOnChanges(){
   this.revision++;this.mensaje='';this.error='';this.ficha=null;this.cargando=true;this.errorFicha='';
   this.cargarFicha();
 }
 cargarFicha(){
   this.cargando=true;this.errorFicha='';
   this.request?.unsubscribe();
   this.request=this.http.get<FichaPublica|null>('/api/public/v1/territorio/parcelas/'+encodeURIComponent(String(this.parcela.id))+'/ficha').subscribe({
     next:f=>{this.ficha=f;this.cargando=false;this.cd.markForCheck();},
     error:e=>{this.errorFicha=this.api.error(e);this.cargando=false;this.cd.markForCheck();}
   });
 }
 ngOnDestroy(){this.revision++;this.request?.unsubscribe();}
 async guardar(){
   if(this.ocupado)return;this.ocupado=true;this.error='';const revision=this.revision;
   try{await this.espacio.guardar(String(this.parcela.id),this.consulta.latitud,this.consulta.longitud);
     if(revision===this.revision)this.mensaje='Consulta guardada en tu espacio personal.';}
   catch(e){if(revision===this.revision)this.error=this.api.error(e);}
   finally{this.ocupado=false;this.cd.markForCheck();}
 }
 gestionar(){
   this.espacio.seleccion.next({id:String(this.parcela.id),latitud:this.consulta.latitud,longitud:this.consulta.longitud});
   this.areaSolicitada.emit();
 }
}
