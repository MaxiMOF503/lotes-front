import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subscription, from, catchError, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SesionService } from './sesion.service';
import { ApiService } from './api.service';
import { puntoInterior } from './punto-interior';
import { BusquedaParcelas, CapaResponse, ConsultaTerritorial, ElementoTerritorial, EstadoBusquedaParcelas,
  EstadoTerritorial, FuenteTerritorial, OrigenConsulta } from '../models/territorio.model';

const BUSQUEDA_VACIA: EstadoBusquedaParcelas = { estado: 'vacio', nomenclatura: '', items: [], hayMas: false, error: null };

@Injectable({ providedIn: 'root' })
export class TerritorioService {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  private sesion = inject(SesionService);
  private consulta?: Subscription;
  private busqueda?: Subscription;
  private ultimoPunto?: { latitud: number; longitud: number; origen: OrigenConsulta };
  private estadoSubject = new BehaviorSubject<EstadoTerritorial>({ estado: 'vacio', datos: null, error: null });
  private busquedaSubject = new BehaviorSubject<EstadoBusquedaParcelas>(BUSQUEDA_VACIA);
  private origenSubject = new BehaviorSubject<OrigenConsulta>({ tipo: 'mapa' });
  readonly estado$ = this.estadoSubject.asObservable();
  readonly busqueda$ = this.busquedaSubject.asObservable();
  readonly origen$ = this.origenSubject.asObservable();

  fuentes() { return this.http.get<FuenteTerritorial[]>('/api/public/v1/territorio/fuentes'); }
  capa(id: string, oeste: number, sur: number, este: number, norte: number, zoom: number) {
    return this.http.get<CapaResponse>('/api/public/v1/territorio/capas/' + id,
      { params: { oeste, sur, este, norte, zoom, limite: 700 } });
  }
  consultar(latitud: number, longitud: number, origen: OrigenConsulta = { tipo: 'mapa' }): void {
    this.ultimoPunto = { latitud, longitud, origen };
    this.consulta?.unsubscribe();
    this.cerrarBusqueda();
    this.origenSubject.next(origen);
    this.estadoSubject.next({ estado: 'cargando', datos: null, error: null });
    const publica = this.http.get<ConsultaTerritorial>('/api/public/v1/territorio/consulta', { params: { latitud, longitud } });
    const peticion = this.sesion.actual
      ? from(this.api.write<ConsultaTerritorial>('POST','/mi-espacio/consultas',{latitud,longitud})).pipe(
          catchError(error => error instanceof HttpErrorResponse && error.status===401 ? publica : throwError(()=>error)))
      : publica;
    this.consulta = peticion.subscribe({
        next: datos => this.estadoSubject.next({ estado: 'cargado', datos, error: null }),
        error: error => this.estadoSubject.next({ estado: 'error', datos: null, error: this.api.error(error) })
      });
  }
  /** Busca parcelas del catastro cuya nomenclatura empieza con los dígitos indicados. Una sola coincidencia abre su ficha. */
  buscarPorNomenclatura(nomenclatura: string): void {
    this.limpiar();
    this.busquedaSubject.next({ ...BUSQUEDA_VACIA, estado: 'cargando', nomenclatura });
    this.busqueda = this.http.get<BusquedaParcelas>('/api/public/v1/territorio/parcelas', { params: { nomenclatura, pagina: 0 } })
      .subscribe({
        next: resultado => {
          if (!resultado.items.length) this.busquedaSubject.next({ ...BUSQUEDA_VACIA, estado: 'sin-resultados', nomenclatura });
          else if (resultado.items.length === 1 && !resultado.hayMas) this.abrirParcela(resultado.items[0]);
          else this.busquedaSubject.next({ estado: 'opciones', nomenclatura, items: resultado.items, hayMas: resultado.hayMas, error: null });
        },
        error: error => this.busquedaSubject.next({ ...BUSQUEDA_VACIA, estado: 'error', nomenclatura, error: this.api.error(error) })
      });
  }
  /** Abre la ficha de una parcela consultando un punto interior, igual que un clic dentro de ella en el mapa. */
  abrirParcela(parcela: ElementoTerritorial): void {
    const punto = puntoInterior(parcela.geometry);
    const nomenclatura = String(parcela.properties?.['nomenclatu'] ?? parcela.id ?? '');
    if (!punto) {
      this.busquedaSubject.next({ ...BUSQUEDA_VACIA, estado: 'error', nomenclatura,
        error: 'La parcela no tiene una forma válida para ubicarla en el mapa.' });
      return;
    }
    this.consultar(punto.latitud, punto.longitud, { tipo: 'nomenclatura', nomenclatura });
  }
  reintentar(): void {
    if (this.ultimoPunto) this.consultar(this.ultimoPunto.latitud, this.ultimoPunto.longitud, this.ultimoPunto.origen);
  }
  limpiar(): void {
    this.consulta?.unsubscribe();
    this.cerrarBusqueda();
    this.estadoSubject.next({ estado: 'vacio', datos: null, error: null });
  }
  private cerrarBusqueda(): void {
    this.busqueda?.unsubscribe();
    if (this.busquedaSubject.value.estado !== 'vacio') this.busquedaSubject.next(BUSQUEDA_VACIA);
  }
}
