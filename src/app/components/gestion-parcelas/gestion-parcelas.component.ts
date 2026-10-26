import {Component,Input,Output,EventEmitter,OnInit,OnDestroy,inject,ChangeDetectorRef,HostListener} from '@angular/core';
import {CommonModule} from '@angular/common';
import {InformeParcelasComponent} from '../informe-parcelas/informe-parcelas.component';
import {FocoModalDirective} from '../../directives/foco-modal.directive';
import {EstadoOperacionComponent} from '../estado-operacion/estado-operacion.component';
import {InformeTerritorial} from '../../models/espacio-territorial.model';
import {FormsModule,NgForm} from '@angular/forms';
import {Subscription} from 'rxjs';
import {EspacioTerritorialService} from '../../services/espacio-territorial.service';
import {ApiService} from '../../services/api.service';
import {ElementoTerritorial} from '../../models/territorio.model';
import {Guardada,FichaComplementaria,PaginaEspacio,SeleccionParcela} from '../../models/espacio-territorial.model';

@Component({selector:'app-gestion-parcelas',standalone:true,imports:[CommonModule,FormsModule,InformeParcelasComponent,EstadoOperacionComponent,FocoModalDirective],
 templateUrl:'./gestion-parcelas.component.html',styleUrl:'./gestion-parcelas.component.css'})
export class GestionParcelasComponent implements OnInit,OnDestroy {
 @Input() modo:'gestion'|'guardadas'='gestion';
 @Output() mapaSolicitado=new EventEmitter<{latitud:number;longitud:number}|null>();
 private espacio=inject(EspacioTerritorialService);private api=inject(ApiService);private cd=inject(ChangeDetectorRef);
 consulta='';busquedaActiva='';resultados:ElementoTerritorial[]=[];paginaBusqueda=0;hayMas=false;busco=false;
 guardadas:PaginaEspacio<Guardada>={items:[],pagina:0,totalPaginas:0,total:0};
 recientes:PaginaEspacio<FichaComplementaria>={items:[],pagina:0,totalPaginas:0,total:0};
 parcela:ElementoTerritorial|null=null;ficha:FichaComplementaria|null=null;
 ocupado=false;cargando=true;error='';mensaje='';etiqueta='';
 pendiente:(()=>void)|null=null;quitarPendiente:Guardada|null=null;
 informes:InformeTerritorial[]|null=null;
 private origenInforme:HTMLElement|null=null;
 cerrarInforme(){this.informes=null;const o=this.origenInforme;this.origenInforme=null;setTimeout(()=>{if(o?.isConnected)o.focus();});}
 async abrirInforme(g:Guardada){if(this.ocupado)return;this.origenInforme=document.activeElement as HTMLElement|null;this.ocupado=true;this.error='';try{this.informes=[await this.espacio.informeGuardada(g.id)];}catch(e){this.error=this.api.error(e);}finally{this.ocupado=false;if(!this.destruido)this.cd.markForCheck();}}
 private original='';private subscription?:Subscription;private destruido=false;
 @HostListener('document:keydown.escape') cancelarDialogo(){if(!this.ocupado){this.pendiente=null;this.quitarPendiente=null;}}
 get hayCambios(){return this.modo==='gestion' && !!this.ficha && JSON.stringify(this.ficha)!==this.original;}
 async ngOnInit(){
   if(this.modo==='gestion'){
     this.subscription=this.espacio.seleccion.subscribe(s=>{if(s)void this.seleccionar(s.id);});
   }
   await this.cargarLista();
 }
 ngOnDestroy(){this.destruido=true;this.subscription?.unsubscribe();}
 descartarCambios(){if(this.original)this.ficha=JSON.parse(this.original);this.pendiente=null;}
 confirmar(){const accion=this.pendiente;this.pendiente=null;this.descartarCambios();accion?.();}
 private continuar(accion:()=>void){if(this.ocupado)return;if(this.hayCambios)this.pendiente=accion;else accion();}
 valor(campo:string){return this.parcela?.properties?.[campo] ?? 'Sin información';}
 async cargarLista(pagina=0){
   this.cargando=true;this.error='';
   try{if(this.modo==='gestion')this.recientes=await this.espacio.fichas(pagina);
     else this.guardadas=await this.espacio.guardadas(pagina);}
   catch(e){this.error=this.api.error(e);}
   finally{this.cargando=false;this.cd.markForCheck();}
 }
 async buscar(pagina=0){
   if(this.ocupado)return;
   if(pagina===0){if(!/^\d{3,30}$/.test(this.consulta.trim())){this.error='Ingresá entre 3 y 30 dígitos de la nomenclatura.';return;}this.busquedaActiva=this.consulta.trim();}
   this.ocupado=true;this.error='';
   try{const r=await this.espacio.buscar(this.busquedaActiva,pagina);this.resultados=r.items;this.paginaBusqueda=r.pagina;this.hayMas=r.hayMas;this.busco=true;}
   catch(e){this.error=this.api.error(e);}
   finally{this.ocupado=false;this.cd.markForCheck();}
 }
 seleccionar(id:string){
   if(String(this.parcela?.id)===id)return;
   this.continuar(()=>{void this.cargarParcela(id);});
 }
 private async cargarParcela(id:string){
   this.ocupado=true;this.error='';this.mensaje='';
   try{const [parcela,ficha]=await Promise.all([this.espacio.parcela(id),this.espacio.ficha(id)]);
     if(this.destruido)return;
     this.parcela=parcela;this.ficha=ficha;this.original=JSON.stringify(ficha);}
   catch(e){this.error=this.api.error(e);}
   finally{this.ocupado=false;this.cd.markForCheck();}
 }
 async guardar(form:NgForm){
   if(this.ocupado || !this.ficha)return;
   if(form.invalid || !this.ficha.fuente?.trim() || !this.ficha.referencia?.trim()){
     form.form.markAllAsTouched();this.error='Indicá la fuente y la referencia documental del aporte.';return;}
   this.ocupado=true;this.error='';this.mensaje='';
   try{this.ficha=await this.espacio.guardarFicha(this.ficha);this.original=JSON.stringify(this.ficha);
     this.mensaje='Ficha complementaria guardada. Ya puede consultarse desde el mapa.';
     await this.cargarLista(this.recientes.pagina);}
   catch(e){this.error=this.api.error(e)+' Conservamos lo que escribiste.';}
   finally{this.ocupado=false;this.cd.markForCheck();}
 }
 recargarFicha(){if(this.parcela)this.continuar(()=>{void this.cargarParcela(String(this.parcela!.id));});}
 irAlMapa(){
   this.continuar(()=>this.mapaSolicitado.emit(this.puntoParcela()));
 }
 private puntoParcela():{latitud:number;longitud:number}|null{
   if(this.parcela?.geometry.type!=='MultiPolygon')return null;
   const [longitud,latitud]=this.parcela.geometry.coordinates[0][0][0];
   return {latitud,longitud};
 }
 abrirGuardada(g:Guardada){this.mapaSolicitado.emit({latitud:g.latitud,longitud:g.longitud});}
 async confirmarQuitar(){
   const g=this.quitarPendiente;if(!g || this.ocupado)return;this.ocupado=true;this.error='';
   try{await this.espacio.quitar(g.id);this.quitarPendiente=null;
     await this.cargarLista(this.guardadas.pagina);
     if(!this.guardadas.items.length && this.guardadas.pagina>0)await this.cargarLista(this.guardadas.pagina-1);
     this.mensaje='Consulta quitada de tus guardadas. La parcela sigue disponible en el mapa.';}
   catch(e){this.error=this.api.error(e);}
   finally{this.ocupado=false;this.cd.markForCheck();}
 }
 get contorno():string{
   if(this.parcela?.geometry.type!=='MultiPolygon')return '';
   const polys=this.parcela.geometry.coordinates;
   const points=polys.flat(2);const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
   const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
   // Compensa la escala longitudinal de Mendoza y conserva la forma del dato real.
   const factor=Math.cos((minY+maxY)/2*Math.PI/180);
   const escala=Math.min(260/Math.max((maxX-minX)*factor,1e-10),150/Math.max(maxY-minY,1e-10));
   const offX=(300-(maxX-minX)*factor*escala)/2,offY=(190-(maxY-minY)*escala)/2;
   return polys.flatMap(p=>p.map(r=>r.map(([x,y],i)=>(i?'L':'M')+(offX+(x-minX)*factor*escala).toFixed(2)+' '+(offY+(maxY-y)*escala).toFixed(2)).join(' ')+' Z')).join(' ');
 }
}
