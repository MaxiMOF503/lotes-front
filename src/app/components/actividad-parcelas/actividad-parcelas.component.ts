import {Component,Input,Output,EventEmitter,OnInit,OnDestroy,inject,ChangeDetectorRef,HostListener} from '@angular/core';
import {CommonModule} from '@angular/common';
import {EspacioTerritorialService} from '../../services/espacio-territorial.service';
import {ApiService} from '../../services/api.service';
import {Guardada,ConsultaHistorial,PaginaEspacio,InformeTerritorial} from '../../models/espacio-territorial.model';
import {InformeParcelasComponent} from '../informe-parcelas/informe-parcelas.component';
import {parcelasInforme} from '../informe-parcelas/informe-documento';
import {EstadoOperacionComponent} from '../estado-operacion/estado-operacion.component';
@Component({selector:'app-actividad-parcelas',standalone:true,imports:[CommonModule,InformeParcelasComponent,EstadoOperacionComponent],templateUrl:'./actividad-parcelas.component.html',styleUrl:'./actividad-parcelas.component.css'})
export class ActividadParcelasComponent implements OnInit,OnDestroy {
 @Input() modo:'historial'|'comparar'='historial';
 @Output() mapaSolicitado=new EventEmitter<{latitud:number;longitud:number}>();
 private espacio=inject(EspacioTerritorialService);private api=inject(ApiService);private cd=inject(ChangeDetectorRef);private destruido=false;
 historial:PaginaEspacio<ConsultaHistorial>={items:[],pagina:0,totalPaginas:0,total:0};
 guardadas:PaginaEspacio<Guardada>={items:[],pagina:0,totalPaginas:0,total:0};
 elegidas:Guardada[]=[];comparacion:InformeTerritorial[]=[];informes:InformeTerritorial[]|null=null;
 cargando=false;ocupado=false;error='';mensaje='';quitar:ConsultaHistorial|null=null;
 readonly campos=[{key:'nomenclatu',label:'Nomenclatura'},{key:'zonificaci',label:'Zonificación publicada'},{key:'suptotal',label:'Superficie publicada (m²)'},{key:'frenmetros',label:'Frente publicado (m)'},{key:'fos_max',label:'FOS máximo'},{key:'ordenanza',label:'Ordenanza'}];
 ngOnInit(){void this.cargar();}ngOnDestroy(){this.destruido=true;}
 @HostListener('document:keydown.escape') cancelar(){if(!this.ocupado)this.quitar=null;}
 async cargar(pagina=0){this.cargando=true;this.error='';try{if(this.modo==='historial')this.historial=await this.espacio.historial(pagina);else this.guardadas=await this.espacio.guardadas(pagina);}catch(e){this.error=this.api.error(e);}finally{this.cargando=false;if(!this.destruido)this.cd.markForCheck();}}
 seleccionada(g:Guardada){return this.elegidas.some(e=>e.id===g.id);}
 elegir(g:Guardada){if(this.ocupado)return;this.error='';this.comparacion=[];if(this.seleccionada(g))this.elegidas=this.elegidas.filter(e=>e.id!==g.id);else if(this.elegidas.length<3)this.elegidas=[...this.elegidas,g];else this.error='Podés comparar hasta tres parcelas. Quitá una de la selección para agregar otra.';}
 async comparar(){if(this.elegidas.length<2 || this.ocupado)return;this.ocupado=true;this.error='';this.comparacion=[];try{this.comparacion=await this.espacio.comparar(this.elegidas.map(g=>g.id));}catch(e){this.error=this.api.error(e);}finally{this.ocupado=false;if(!this.destruido)this.cd.markForCheck();}}
 async abrirInforme(h:ConsultaHistorial){if(this.ocupado)return;this.ocupado=true;this.error='';try{this.informes=[await this.espacio.informeHistorico(h.id)];}catch(e){this.error=this.api.error(e);}finally{this.ocupado=false;if(!this.destruido)this.cd.markForCheck();}}
 async confirmarQuitar(){const h=this.quitar;if(!h||this.ocupado)return;this.ocupado=true;this.error='';try{await this.espacio.quitarHistorial(h.id);this.quitar=null;await this.cargar(this.historial.pagina);if(!this.historial.items.length&&this.historial.pagina>0)await this.cargar(this.historial.pagina-1);this.mensaje='Consulta quitada del historial. Tus parcelas guardadas se conservan.';}catch(e){this.error=this.api.error(e);}finally{this.ocupado=false;if(!this.destruido)this.cd.markForCheck();}}
 valor(i:InformeTerritorial,key:string){const p=parcelasInforme(i)[0];return p?.properties[key]??'Sin información publicada';}
 direccion(i:InformeTerritorial){return i.aportes.find(a=>a.parcelaId===i.parcelaId)?.ficha.direccion||'Sin dirección relevada';}
 volver(h:ConsultaHistorial){this.mapaSolicitado.emit({latitud:h.latitud,longitud:h.longitud});}
}
