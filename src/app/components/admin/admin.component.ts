import { GestionParcelasComponent } from '../gestion-parcelas/gestion-parcelas.component';
import { ActividadParcelasComponent } from '../actividad-parcelas/actividad-parcelas.component';
import { Output, EventEmitter, DestroyRef, Input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject, ChangeDetectorRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { SesionService } from '../../services/sesion.service';
import { Estadisticas,SesionUsuario } from '../../models/admin.model';
import { EstadoOperacionComponent } from '../estado-operacion/estado-operacion.component';
import { CalidadDatosComponent } from '../calidad-datos/calidad-datos.component';
import { MisReportesComponent } from '../mis-reportes/mis-reportes.component';
import { BandejaReportesComponent } from '../bandeja-reportes/bandeja-reportes.component';
import { ReportesDatosService } from '../../services/reportes-datos.service';
import { EspacioTerritorialService } from '../../services/espacio-territorial.service';
export type TabAreaInterna='parcelas'|'guardadas'|'historial'|'comparar'|'reportes'|'bandeja'|'calidad'|'estadisticas';
@Component({selector:'app-admin',standalone:true,imports:[CommonModule,FormsModule,GestionParcelasComponent,ActividadParcelasComponent,EstadoOperacionComponent,CalidadDatosComponent,MisReportesComponent,BandejaReportesComponent],templateUrl:'./admin.component.html',styleUrls:['./admin.component.css','./admin-modern.component.css']})
export class AdminComponent implements OnInit {
  @Input() tabInicial:TabAreaInterna|null=null;
  @Output() mapaSolicitado=new EventEmitter<{latitud:number;longitud:number}|null>();
  @ViewChild(GestionParcelasComponent) gestionParcelas?:GestionParcelasComponent;
  private destroyRef=inject(DestroyRef);

  private api=inject(ApiService);private cd=inject(ChangeDetectorRef);private sesionService=inject(SesionService);private reportes=inject(ReportesDatosService);private espacio=inject(EspacioTerritorialService);
  pendientes:number|null=null;
  sesion:SesionUsuario|null=null;email='';password='';error='';mensaje='';ocupado=false;iniciando=true;
  modoAcceso:'ingreso'|'registro'='ingreso';
  registroNombre='';registroEmail='';registroPassword='';registroConfirmacion='';
  accionPendiente:(()=>void)|null=null;
  retornoTrasIngreso=false;
  tab:TabAreaInterna='parcelas';
  desde=new Date(Date.now()-6*86400000).toLocaleDateString('en-CA');hasta=new Date().toLocaleDateString('en-CA');
  estadisticas:Estadisticas|null=null;
  get esAdmin(){return this.sesion?.rol==='ADMIN';}
  get hayCambios(){return this.esAdmin && !!this.gestionParcelas?.hayCambios;}
  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeSalir(event:BeforeUnloadEvent){if(this.hayCambios){event.preventDefault();event.returnValue='';}}
  @HostListener('document:keydown.escape')
  cerrarConfirmacionConEscape(){if(this.accionPendiente)this.cancelarDescarte();}
  ngOnInit(){
    this.sesionService.sesion$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => {
      if(this.sesion && !s)this.retornoTrasIngreso=true;
      this.sesion=s;
      if(s?.rol==='ADMIN')void this.reportes.refrescarPendientes();else this.reportes.limpiarPendientes();
      this.cd.markForCheck();
    });
    this.reportes.pendientes$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(n => { this.pendientes=n; this.cd.markForCheck(); });
    this.inicializar();
  }
  private async inicializar(){
    try {
      await this.sesionService.cargar();
      if(this.sesion){this.tab=this.tabPermitida(this.tabInicial) ? this.tabInicial! : (this.esAdmin?'parcelas':'guardadas');}
    } catch(e) {
      if (!(e instanceof HttpErrorResponse) || e.status!==401) this.error=this.api.error(e);
    } finally {
      this.iniciando=false;
      this.cd.markForCheck();
    }
  }
  async ingresar(){await this.operar(async()=>{await this.sesionService.ingresar(this.email,this.password);this.password='';
    if(this.tabPermitida(this.tabInicial))this.tab=this.tabInicial!;
    else if(!this.retornoTrasIngreso || (!this.esAdmin && (this.tab==='parcelas'||this.tab==='bandeja'||this.tab==='calidad'||this.tab==='estadisticas')))this.tab=this.esAdmin?'parcelas':'guardadas';
    this.retornoTrasIngreso=false;});this.password='';}
  mostrarRegistro(){this.modoAcceso='registro';this.error='';this.mensaje='';this.password='';}
  mostrarIngreso(){this.modoAcceso='ingreso';this.error='';this.registroPassword='';this.registroConfirmacion='';}
  async registrar(){
    if(this.registroPassword!==this.registroConfirmacion){this.error='Las contraseñas no coinciden.';return;}
    await this.operar(async()=>{
      await this.api.write<void>('POST','/public/v1/usuarios',{
        nombre:this.registroNombre.trim(),email:this.registroEmail.trim().toLowerCase(),password:this.registroPassword
      });
      this.email=this.registroEmail.trim().toLowerCase();
      this.registroNombre='';this.registroEmail='';this.registroPassword='';this.registroConfirmacion='';
      this.modoAcceso='ingreso';
      this.mensaje='Cuenta creada. Ya podés iniciar sesión con tu correo y contraseña.';
    });
  }
  salir(){this.solicitarDescarte(()=>{void this.operar(async()=>{await this.sesionService.salir();this.tab='parcelas';this.estadisticas=null;});});}
  cambiarTab(tab:TabAreaInterna){if(!this.esAdmin && (tab==='parcelas'||tab==='bandeja'||tab==='calidad'||tab==='estadisticas'))return;if(tab===this.tab)return;this.solicitarDescarte(()=>{this.tab=tab;});}
  private tabPermitida(tab:TabAreaInterna|null):boolean{return !!tab&&(this.esAdmin||!['parcelas','bandeja','calidad','estadisticas'].includes(tab));}
  confirmarDescarte(){const accion=this.accionPendiente;this.accionPendiente=null;this.gestionParcelas?.descartarCambios();accion?.();}
  cancelarDescarte(){this.accionPendiente=null;}
  /** Desde la bandeja de reportes: abre la ficha complementaria de la parcela en "Parcelas reales". */
  corregirFicha(parcelaId:string){this.espacio.seleccion.next({id:parcelaId});this.cambiarTab('parcelas');}
  abrirMapa(punto:{latitud:number;longitud:number}|null){this.solicitarDescarte(()=>this.mapaSolicitado.emit(punto));}
  confirmarNavegacion(accion:()=>void){this.solicitarDescarte(accion);}
  private solicitarDescarte(accion:()=>void){if(this.ocupado)return;if(this.hayCambios){this.accionPendiente=accion;return;}accion();}
  async consultarEstadisticas(){if(!this.esAdmin)return;this.estadisticas=null;await this.operar(async()=>{this.estadisticas=await this.api.get<Estadisticas>('/admin/estadisticas?desde='+encodeURIComponent(this.desde)+'&hasta='+encodeURIComponent(this.hasta));});}
  exitosasTotales(estadisticas:Estadisticas){return estadisticas.dias.reduce((total,dia)=>total+dia.exitosas,0);}
  private async operar(accion:()=>Promise<unknown>){if(this.ocupado)return;this.ocupado=true;this.error='';this.mensaje='';try{await accion();}catch(e){this.error=this.api.error(e);}finally{this.ocupado=false;this.cd.markForCheck();}}
}
