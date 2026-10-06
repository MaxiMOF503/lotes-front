import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Subscription } from 'rxjs';
import { BusquedaDireccionResponse, FichaLoteResponse, EstadoConsulta } from '../models/ficha-lote.model';
import { ApiService } from './api.service';
@Injectable({providedIn:'root'})
export class LoteService {
  private http=inject(HttpClient);private api=inject(ApiService);private request?:Subscription;
  private fichaSubject=new BehaviorSubject<FichaLoteResponse|null>(null);
  private opcionesSubject=new BehaviorSubject<BusquedaDireccionResponse|null>(null);
  private estadoSubject=new BehaviorSubject<EstadoConsulta>('vacio');
  private errorSubject=new BehaviorSubject<string|null>(null);
  readonly ficha$=this.fichaSubject.asObservable();readonly opciones$=this.opcionesSubject.asObservable();readonly estado$=this.estadoSubject.asObservable();readonly error$=this.errorSubject.asObservable();
  consultarPorIdentificador(identificador:string) {this.consultar({identificador});}
  consultarPorCoordenadas(latitud:number,longitud:number) {this.consultar({latitud,longitud});}
  consultarPorDireccion(direccion:string) {
    this.iniciarConsulta();
    this.request=this.http.get<BusquedaDireccionResponse>('/api/public/v1/lotes/opciones',{params:{direccion}}).subscribe({
      next:resultado=>{
        if(resultado.opciones.length===1) this.consultar({direccion});
        else if(resultado.opciones.length>1) {this.opcionesSubject.next(resultado);this.estadoSubject.next('opciones');}
        else this.estadoSubject.next('sin-resultados');
      },
      error:(e:HttpErrorResponse)=>this.registrarError(e)
    });
  }
  seleccionarOpcion(identificador:string) {this.consultar({identificador});}
  private consultar(params:Record<string,string|number>) {
    this.iniciarConsulta();
    this.request=this.http.get<FichaLoteResponse>('/api/public/v1/lotes/ficha',{params}).subscribe({
      next:ficha=>{this.fichaSubject.next(ficha);this.estadoSubject.next('cargado');},
      error:(e:HttpErrorResponse)=>this.registrarError(e)
    });
  }
  private iniciarConsulta(){this.request?.unsubscribe();this.fichaSubject.next(null);this.opcionesSubject.next(null);this.errorSubject.next(null);this.estadoSubject.next('cargando');}
  private registrarError(e:HttpErrorResponse){this.errorSubject.next(this.api.error(e));this.estadoSubject.next(e.status===404?'sin-resultados':'error');}
  limpiar(){this.request?.unsubscribe();this.fichaSubject.next(null);this.opcionesSubject.next(null);this.estadoSubject.next('vacio');this.errorSubject.next(null);}
}
