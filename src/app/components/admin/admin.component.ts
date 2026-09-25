import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { LoteEdicion,LoteDetalle,PaginaLotes,Estadisticas,SesionUsuario,nuevoLote } from '../../models/admin.model';
@Component({selector:'app-admin',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./admin.component.html',styleUrl:'./admin.component.css'})
export class AdminComponent implements OnInit {
  private api=inject(ApiService);private cd=inject(ChangeDetectorRef);
  sesion:SesionUsuario|null=null;email='';password='';error='';mensaje='';ocupado=false;iniciando=true;
  tab:'lotes'|'estadisticas'='lotes';id:number|null=null;datos:LoteEdicion=nuevoLote();
  departamentos:{id:number;nombre:string}[]=[];pagina:PaginaLotes={items:[],pagina:0,totalPaginas:0,total:0};
  desde=new Date(Date.now()-6*86400000).toLocaleDateString('en-CA');hasta=new Date().toLocaleDateString('en-CA');
  estadisticas:Estadisticas|null=null;
  secciones=[{key:'procedenciaLote' as const,label:'Datos del lote'},{key:'procedenciaZonificacion' as const,label:'Zonificación'},
    {key:'procedenciaElectricidad' as const,label:'Electricidad'},{key:'procedenciaAgua' as const,label:'Agua'}];
  get esAdmin(){return this.sesion?.rol==='ADMIN';}
  async ngOnInit(){
    try {
      this.sesion=await this.api.get<SesionUsuario>('/me');
      await this.cargar();
    } catch(e) {
      if (!(e instanceof HttpErrorResponse) || e.status!==401) this.error=this.api.error(e);
    } finally {
      this.iniciando=false;
      this.cd.markForCheck();
    }
  }
  async ingresar(){await this.operar(async()=>{this.sesion=await this.api.login(this.email,this.password);this.password='';this.tab='lotes';await this.cargar();});this.password='';}
  async salir(){await this.operar(async()=>{await this.api.write('POST','/logout');this.sesion=null;this.tab='lotes';this.nuevo();this.estadisticas=null;});}
  async cargar(pagina=0){
    [this.pagina,this.departamentos]=await Promise.all([this.api.get<PaginaLotes>('/admin/lotes?pagina='+pagina),this.api.get<{id:number;nombre:string}[]>('/admin/departamentos')]);
  }
  async cambiarPagina(pagina:number){await this.operar(()=>this.cargar(pagina));}
  nuevo(){if(this.sesion && !this.esAdmin)return;this.id=null;this.datos=nuevoLote();this.mensaje='';this.error='';}
  async editar(id:number){await this.operar(async()=>{const lote=await this.api.get<LoteDetalle>('/admin/lotes/'+id);this.id=lote.id;this.datos=lote.datos;});}
  async guardar(){if(!this.esAdmin)return;await this.operar(async()=>{const lote=await this.api.write<LoteDetalle>(this.id===null?'POST':'PUT','/admin/lotes'+(this.id===null?'':'/'+this.id),this.datos);
    this.id=lote.id;this.datos=lote.datos;this.mensaje='Lote guardado. Los cambios ya están disponibles en la ficha pública.';await this.cargar(this.pagina.pagina);});}
  async consultarEstadisticas(){if(!this.esAdmin)return;this.estadisticas=null;await this.operar(async()=>{this.estadisticas=await this.api.get<Estadisticas>('/admin/estadisticas?desde='+encodeURIComponent(this.desde)+'&hasta='+encodeURIComponent(this.hasta));});}
  exitosasTotales(estadisticas:Estadisticas){return estadisticas.dias.reduce((total,dia)=>total+dia.exitosas,0);}
  private async operar(accion:()=>Promise<unknown>){if(this.ocupado)return;this.ocupado=true;this.error='';this.mensaje='';try{await accion();}catch(e){this.error=this.api.error(e);}finally{this.ocupado=false;this.cd.markForCheck();}}
}
