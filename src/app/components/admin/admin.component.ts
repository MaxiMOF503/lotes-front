import { GestionParcelasComponent } from '../gestion-parcelas/gestion-parcelas.component';
import { ActividadParcelasComponent } from '../actividad-parcelas/actividad-parcelas.component';
import { Output, EventEmitter, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject, ChangeDetectorRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { SesionService } from '../../services/sesion.service';
import { Estadisticas,SesionUsuario } from '../../models/admin.model';
@Component({selector:'app-admin',standalone:true,imports:[CommonModule,FormsModule,GestionParcelasComponent,ActividadParcelasComponent],templateUrl:'./admin.component.html',styleUrls:['./admin.component.css','./admin-modern.component.css']})
export class AdminComponent implements OnInit {
  @Output() mapaSolicitado=new EventEmitter<{latitud:number;longitud:number}|null>();
  @ViewChild(GestionParcelasComponent) gestionParcelas?:GestionParcelasComponent;
  private destroyRef=inject(DestroyRef);

  private api=inject(ApiService);private cd=inject(ChangeDetectorRef);private sesionService=inject(SesionService);
  sesion:SesionUsuario|null=null;email='';password='';error='';mensaje='';ocupado=false;iniciando=true;
  modoAcceso:'ingreso'|'registro'='ingreso';
  registroNombre='';registroEmail='';registroPassword='';registroConfirmacion='';
  accionPendiente:(()=>void)|null=null;
  tab:'parcelas'|'guardadas'|'historial'|'comparar'|'estadisticas'='parcelas';
  desde=new Date(Date.now()-6*86400000).toLocaleDateString('en-CA');hasta=new Date().toLocaleDateString('en-CA');
  estadisticas:Estadisticas|null=null;
  get esAdmin(){return this.sesion?.rol==='ADMIN';}
  get hayCambios(){return this.esAdmin && !!this.gestionParcelas?.hayCambios;}
  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeSalir(event:BeforeUnloadEvent){if(this.hayCambios){event.preventDefault();event.returnValue='';}}
  @HostListener('document:keydown.escape')
  cerrarConfirmacionConEscape(){if(this.accionPendiente)this.cancelarDescarte();}
  ngOnInit(){
    this.sesionService.sesion$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => { this.sesion=s; this.cd.markForCheck(); });
    this.inicializar();
  }
  private async inicializar(){
    try {
      await this.sesionService.cargar();
      if(this.sesion){this.tab=this.esAdmin?'parcelas':'guardadas';}
    } catch(e) {
      if (!(e instanceof HttpErrorResponse) || e.status!==401) this.error=this.api.error(e);
    } finally {
      this.iniciando=false;
      this.cd.markForCheck();
    }
  }
  async ingresar(){await this.operar(async()=>{await this.sesionService.ingresar(this.email,this.password);this.password='';this.tab=this.esAdmin?'parcelas':'guardadas';});this.password='';}
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
  cambiarTab(tab:'parcelas'|'guardadas'|'historial'|'comparar'|'estadisticas'){if(!this.esAdmin && (tab==='parcelas'||tab==='estadisticas'))return;if(tab===this.tab)return;this.solicitarDescarte(()=>{this.tab=tab;});}
  confirmarDescarte(){const accion=this.accionPendiente;this.accionPendiente=null;this.gestionParcelas?.descartarCambios();accion?.();}
  cancelarDescarte(){this.accionPendiente=null;}
  abrirMapa(punto:{latitud:number;longitud:number}|null){this.solicitarDescarte(()=>this.mapaSolicitado.emit(punto));}
  confirmarNavegacion(accion:()=>void){this.solicitarDescarte(accion);}
  private solicitarDescarte(accion:()=>void){if(this.ocupado)return;if(this.hayCambios){this.accionPendiente=accion;return;}accion();}
  async consultarEstadisticas(){if(!this.esAdmin)return;this.estadisticas=null;await this.operar(async()=>{this.estadisticas=await this.api.get<Estadisticas>('/admin/estadisticas?desde='+encodeURIComponent(this.desde)+'&hasta='+encodeURIComponent(this.hasta));});}
  exitosasTotales(estadisticas:Estadisticas){return estadisticas.dias.reduce((total,dia)=>total+dia.exitosas,0);}
  private async operar(accion:()=>Promise<unknown>){if(this.ocupado)return;this.ocupado=true;this.error='';this.mensaje='';try{await accion();}catch(e){this.error=this.api.error(e);}finally{this.ocupado=false;this.cd.markForCheck();}}
}
