import {Component,Input,Output,EventEmitter,HostListener,AfterViewInit,OnDestroy,ElementRef,ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {InformeTerritorial} from '../../models/espacio-territorial.model';
import {parcelasInforme,principalesParcela,adicionalesParcela,documentoInforme} from './informe-documento';
@Component({selector:'app-informe-parcelas',standalone:true,imports:[CommonModule],templateUrl:'./informe-parcelas.component.html',styleUrl:'./informe-parcelas.component.css'})
export class InformeParcelasComponent implements AfterViewInit,OnDestroy {
 @Input({required:true}) informes!:InformeTerritorial[];
 @Output() cerrar=new EventEmitter<void>();
 @ViewChild('dialogo') dialogo!:ElementRef<HTMLElement>;
 parcelas=parcelasInforme;filas=principalesParcela;adicionales=adicionalesParcela;error='';
 private foco=document.activeElement as HTMLElement|null;
 ngAfterViewInit(){this.dialogo.nativeElement.focus();}
 ngOnDestroy(){if(this.foco?.isConnected)this.foco.focus();}
 @HostListener('document:keydown',['$event']) teclado(e:KeyboardEvent){
  if(e.key==='Escape'){e.preventDefault();this.cerrar.emit();}
  if(e.key==='Tab'){
   const botones=Array.from(this.dialogo.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],summary'));
   const primero=botones[0],ultimo=botones[botones.length-1];
   if(e.shiftKey && (document.activeElement===primero||document.activeElement===this.dialogo.nativeElement)){e.preventDefault();ultimo?.focus();}
   else if(!e.shiftKey && (document.activeElement===ultimo||document.activeElement===this.dialogo.nativeElement)){e.preventDefault();primero?.focus();}
  }
 }
 descargar(formato:'html'|'json'){
   const contenido=formato==='html'?documentoInforme(this.informes):JSON.stringify(this.informes,null,2);
   const url=URL.createObjectURL(new Blob([contenido],{type:formato==='html'?'text/html;charset=utf-8':'application/json;charset=utf-8'}));
   const enlace=document.createElement('a');enlace.href=url;enlace.download='loteseguro-informe-'+new Date().toISOString().slice(0,10)+'.'+formato;
   enlace.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 imprimir(){
   const url=URL.createObjectURL(new Blob([documentoInforme(this.informes,true)],{type:'text/html;charset=utf-8'}));
   const ventana=window.open(url,'_blank');
   if(!ventana)this.error='El navegador bloqueó la ventana. Permití ventanas emergentes o descargá el informe HTML y abrilo para imprimir.';
   else ventana.opener=null;
   setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
}
