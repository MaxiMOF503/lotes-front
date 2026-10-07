import { Component, OnInit, inject, ChangeDetectorRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { SesionService } from '../../services/sesion.service';
import { LoteEdicion,LoteDetalle,PaginaLotes,Estadisticas,SesionUsuario,nuevoLote } from '../../models/admin.model';
@Component({selector:'app-admin',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./admin.component.html',styleUrls:['./admin.component.css','./admin-modern.component.css']})
export class AdminComponent implements OnInit {
  private api=inject(ApiService);private cd=inject(ChangeDetectorRef);private sesionService=inject(SesionService);
  @ViewChild('form') editorForm?:NgForm;
  sesion:SesionUsuario|null=null;email='';password='';error='';mensaje='';ocupado=false;iniciando=true;
  modoAcceso:'ingreso'|'registro'='ingreso';
  registroNombre='';registroEmail='';registroPassword='';registroConfirmacion='';
  guardarIntentado=false;guardarError='';erroresCampo:Record<string,string>={};
  accionPendiente:(()=>void)|null=null;
  loteAEliminar:{id:number;identificador:string}|null=null;eliminarError='';
  private datosGuardados=JSON.stringify(nuevoLote());
  tab:'lotes'|'estadisticas'='lotes';id:number|null=null;datos:LoteEdicion=nuevoLote();
  departamentos:{id:number;nombre:string}[]=[];pagina:PaginaLotes={items:[],pagina:0,totalPaginas:0,total:0};
  desde=new Date(Date.now()-6*86400000).toLocaleDateString('en-CA');hasta=new Date().toLocaleDateString('en-CA');
  estadisticas:Estadisticas|null=null;
  secciones=[{key:'procedenciaLote' as const,label:'Datos del lote'},{key:'procedenciaZonificacion' as const,label:'Zonificación'},
    {key:'procedenciaElectricidad' as const,label:'Electricidad'},{key:'procedenciaAgua' as const,label:'Agua'}];
  get esAdmin(){return this.sesion?.rol==='ADMIN';}
  get hayCambios(){return this.esAdmin && JSON.stringify(this.datos)!==this.datosGuardados;}
  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeSalir(event:BeforeUnloadEvent){if(this.hayCambios){event.preventDefault();event.returnValue='';}}
  @HostListener('document:keydown.escape')
  cerrarConfirmacionConEscape(){if(this.loteAEliminar)this.cancelarEliminacion();else if(this.accionPendiente)this.cancelarDescarte();}
  ngOnInit(){
    this.sesionService.sesion$.subscribe(s => { this.sesion=s; this.cd.markForCheck(); });
    this.inicializar();
  }
  private async inicializar(){
    try {
      await this.sesionService.cargar();
      if(this.sesion) await this.cargar();
    } catch(e) {
      if (!(e instanceof HttpErrorResponse) || e.status!==401) this.error=this.api.error(e);
    } finally {
      this.iniciando=false;
      this.cd.markForCheck();
    }
  }
  async ingresar(){await this.operar(async()=>{await this.sesionService.ingresar(this.email,this.password);this.password='';this.tab='lotes';await this.cargar();});this.password='';}
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
  salir(){this.solicitarDescarte(()=>{void this.operar(async()=>{await this.sesionService.salir();this.tab='lotes';this.reiniciarEditor();this.estadisticas=null;});});}
  async cargar(pagina=0){
    [this.pagina,this.departamentos]=await Promise.all([this.api.get<PaginaLotes>('/admin/lotes?pagina='+pagina),this.api.get<{id:number;nombre:string}[]>('/admin/departamentos')]);
  }
  async cambiarPagina(pagina:number){await this.operar(()=>this.cargar(pagina));}
  nuevo(){if(!this.esAdmin)return;this.solicitarDescarte(()=>this.reiniciarEditor());}
  editar(id:number){if(id===this.id)return;this.solicitarDescarte(()=>{void this.operar(async()=>{const lote=await this.api.get<LoteDetalle>('/admin/lotes/'+id);this.id=lote.id;this.datos=lote.datos;this.marcarGuardado();this.limpiarEstadoEditor();});});}
  cambiarTab(tab:'lotes'|'estadisticas'){if(tab===this.tab)return;this.solicitarDescarte(()=>{if(tab==='estadisticas' && this.hayCambios)this.reiniciarEditor();this.tab=tab;});}
  confirmarDescarte(){const accion=this.accionPendiente;this.accionPendiente=null;accion?.();}
  cancelarDescarte(){this.accionPendiente=null;}
  confirmarNavegacion(accion:()=>void){this.solicitarDescarte(accion);}
  private solicitarDescarte(accion:()=>void){if(this.ocupado)return;if(this.hayCambios){this.accionPendiente=accion;return;}accion();}
  private reiniciarEditor(){this.id=null;this.datos=nuevoLote();this.marcarGuardado();this.limpiarEstadoEditor();this.mensaje='';this.error='';}
  private marcarGuardado(){this.datosGuardados=JSON.stringify(this.datos);}
  private limpiarEstadoEditor(){this.guardarIntentado=false;this.guardarError='';this.erroresCampo={};this.editorForm?.form.markAsPristine();this.editorForm?.form.markAsUntouched();}
  alEditar(){if(this.mensaje)this.mensaje='';}
  limpiarErrorCampo(campo:string){if(this.erroresCampo[campo])delete this.erroresCampo[campo];}
  mensajeCampo(campo:string,control:NgModel):string {
    if(this.erroresCampo[campo])return this.erroresCampo[campo];
    if(!control.invalid || !(control.touched || this.guardarIntentado))return '';
    const etiqueta:Record<string,string>={identificador:'el identificador',latitud:'la latitud',longitud:'la longitud',zonificacion:'la zonificación'};
    const nombre=etiqueta[campo] || (campo.endsWith('fuente')?'la fuente':campo.endsWith('referencia')?'la referencia documental':'este campo');
    if(control.errors?.['required'])return `Completá ${nombre}.`;
    if(control.errors?.['min'])return 'Ingresá un valor igual o mayor que '+control.errors['min'].min+'.';
    if(control.errors?.['max'])return 'Ingresá un valor igual o menor que '+control.errors['max'].max+'.';
    if(control.errors?.['maxlength'])return 'Usá como máximo '+control.errors['maxlength'].requiredLength+' caracteres.';
    return 'Revisá el valor ingresado.';
  }
  private validarDatosLocales(){
    if(!this.datos.identificador.trim())this.erroresCampo['identificador']='Ingresá un identificador que no esté vacío.';
    if(this.datos.zonificacionVerificada){
      if(!this.datos.zonificacion?.trim())this.erroresCampo['zonificacion']='Describí la zonificación antes de marcarla como verificada.';
      if(this.datos.procedenciaZonificacion.tipo!=='OFICIAL')this.erroresCampo['procedenciaZonificacion.tipo']='Elegí procedencia Oficial para una zonificación verificada.';
    }
    for(const seccion of this.secciones){
      const valor=this.datos[seccion.key];
      if(!valor.fuente.trim())this.erroresCampo[seccion.key+'.fuente']='Indicá la fuente de '+seccion.label.toLowerCase()+'.';
      if(valor.tipo==='OFICIAL' && !valor.referencia?.trim())this.erroresCampo[seccion.key+'.referencia']='Agregá una referencia documental para los datos oficiales.';
    }
  }
  async guardar(form:NgForm){
    if(!this.esAdmin || this.ocupado)return;
    this.guardarIntentado=true;this.guardarError='';this.erroresCampo={};
    this.validarDatosLocales();
    if(form.invalid || Object.keys(this.erroresCampo).length){this.guardarError='Revisá los campos señalados antes de guardar.';this.cd.markForCheck();return;}
    this.ocupado=true;this.error='';this.mensaje='';
    try {
      const lote=await this.api.write<LoteDetalle>(this.id===null?'POST':'PUT','/admin/lotes'+(this.id===null?'':'/'+this.id),this.datos);
      this.id=lote.id;this.datos=lote.datos;this.marcarGuardado();this.limpiarEstadoEditor();
      this.mensaje='Lote '+lote.datos.identificador+' guardado. Los cambios ya están disponibles en la ficha pública.';
      try{await this.cargar(this.pagina.pagina);}catch{this.error='El lote se guardó, pero no se pudo actualizar el listado. Podés recargar la página.';}
    }catch(e){this.mostrarErrorGuardado(e);}
    finally{this.ocupado=false;this.cd.markForCheck();}
  }
  private mostrarErrorGuardado(e:unknown){
    if(!(e instanceof HttpErrorResponse)){this.guardarError='No se pudo guardar el lote. Conservamos lo que escribiste; intentá de nuevo.';return;}
    if(e.status===0 || e.status>=500){this.guardarError='No se pudo conectar con el servidor. Tus datos siguen en el formulario; revisá la conexión e intentá guardar otra vez.';return;}
    if(e.status===401 || e.status===403){this.guardarError='Tu sesión terminó o no tenés permiso para guardar lotes. Conservamos los datos escritos en esta pantalla.';return;}
    if(e.status===409){
      if(e.error?.codigo==='IDENTIFICADOR_DUPLICADO')this.erroresCampo['identificador']='Ese identificador ya existe. Elegí uno distinto.';
      this.guardarError=this.erroresCampo['identificador']?'El identificador está repetido. Corregilo y volvé a guardar.':'Los datos entraron en conflicto con otro registro. Revisá el identificador y volvé a guardar.';
      return;
    }
    if(e.status===400){
      if(e.error?.codigo==='DEPARTAMENTO_INVALIDO')this.erroresCampo['departamentoId']='Ese departamento ya no está disponible. Elegí otro o dejalo sin asignar.';
      for(const detalle of e.error?.errores ?? [])if(detalle.campo && detalle.mensaje){
        const campo=detalle.campo.replace(/\.referenciaValida$/,'.referencia').replace(/^zonificacionConsistente$/,'zonificacion').replace(/^distanciaFinita$/,'distanciaRedElectricaMts');
        this.erroresCampo[campo]=detalle.mensaje;
      }
      this.guardarError=Object.keys(this.erroresCampo).length?'Revisá los campos señalados y volvé a guardar.':(e.error?.mensaje || 'Revisá los datos del lote y volvé a guardar.');
      return;
    }
    this.guardarError=this.api.error(e)+' Tus datos siguen en el formulario.';
  }
  abrirEliminacion(){
    if(!this.esAdmin || this.id===null || this.ocupado)return;
    const guardado=JSON.parse(this.datosGuardados) as LoteEdicion;
    this.loteAEliminar={id:this.id,identificador:guardado.identificador};
    this.eliminarError='';
  }
  cancelarEliminacion(){if(this.ocupado)return;this.loteAEliminar=null;this.eliminarError='';}
  async confirmarEliminacion(){
    const lote=this.loteAEliminar;
    if(!lote || !this.esAdmin || this.ocupado)return;
    this.ocupado=true;this.eliminarError='';this.error='';this.mensaje='';
    try {
      await this.api.write<void>('DELETE','/admin/lotes/'+lote.id);
      this.loteAEliminar=null;
      const paginaAnterior=this.pagina.pagina;
      this.reiniciarEditor();
      try {
        await this.cargar(paginaAnterior);
        if(this.pagina.items.length===0 && paginaAnterior>0)await this.cargar(paginaAnterior-1);
      }catch{this.error='El lote se eliminó, pero no se pudo actualizar el listado. Recargá la página para verlo.';}
      this.mensaje='Lote '+lote.identificador+' eliminado. Ya no aparecerá en la consulta pública.';
    }catch(e){
      if(e instanceof HttpErrorResponse && e.status===404)this.eliminarError='El lote ya no existe. Cerrá esta ventana y actualizá el listado.';
      else if(e instanceof HttpErrorResponse && (e.status===401 || e.status===403))this.eliminarError='Tu sesión terminó o no tenés permiso para eliminar lotes.';
      else if(e instanceof HttpErrorResponse && (e.status===0 || e.status>=500))this.eliminarError='No pudimos confirmar la eliminación. Revisá la conexión y el listado antes de intentarlo de nuevo.';
      else this.eliminarError=this.api.error(e);
    }finally{this.ocupado=false;this.cd.markForCheck();}
  }
  async consultarEstadisticas(){if(!this.esAdmin)return;this.estadisticas=null;await this.operar(async()=>{this.estadisticas=await this.api.get<Estadisticas>('/admin/estadisticas?desde='+encodeURIComponent(this.desde)+'&hasta='+encodeURIComponent(this.hasta));});}
  exitosasTotales(estadisticas:Estadisticas){return estadisticas.dias.reduce((total,dia)=>total+dia.exitosas,0);}
  private async operar(accion:()=>Promise<unknown>){if(this.ocupado)return;this.ocupado=true;this.error='';this.mensaje='';try{await accion();}catch(e){this.error=this.api.error(e);}finally{this.ocupado=false;this.cd.markForCheck();}}
}
