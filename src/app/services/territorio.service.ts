import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subscription, from, catchError, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SesionService } from './sesion.service';
import { ApiService } from './api.service';
import { puntoInterior } from './punto-interior';
import { BusquedaParcelas, CapaResponse, CercanasResponse, ConsultaTerritorial, DireccionOficial, DireccionesResponse,
  ElementoTerritorial, EstadoBusquedaParcelas, EstadoTerritorial, FuenteTerritorial, OrigenConsulta } from '../models/territorio.model';

const BUSQUEDA_VACIA: EstadoBusquedaParcelas = { estado: 'vacio', tipo: 'nomenclatura', texto: '', direcciones: [], items: [],
  distancias: null, punto: null, radioMetros: null, hayMas: false, advertencia: null, error: null };

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
    const base = { ...BUSQUEDA_VACIA, tipo: 'nomenclatura' as const, texto: nomenclatura };
    this.busquedaSubject.next({ ...base, estado: 'cargando' });
    this.busqueda = this.http.get<BusquedaParcelas>('/api/public/v1/territorio/parcelas', { params: { nomenclatura, pagina: 0 } })
      .subscribe({
        next: resultado => {
          if (!resultado.items.length) this.busquedaSubject.next({ ...base, estado: 'sin-resultados' });
          else if (resultado.items.length === 1 && !resultado.hayMas) this.abrirParcela(resultado.items[0]);
          else this.busquedaSubject.next({ ...base, estado: 'opciones', items: resultado.items, hayMas: resultado.hayMas });
        },
        error: error => this.busquedaSubject.next({ ...base, estado: 'error', error: this.api.error(error) })
      });
  }
  /** Sugerencias mientras se escribe: direcciones normalizadas por Georef y relevadas por el equipo. */
  sugerirDirecciones(texto: string) {
    return this.http.get<DireccionesResponse>('/api/public/v1/territorio/direcciones', { params: { texto } });
  }
  /** Busca una dirección (calle y número, o esquina). Una sola coincidencia sigue directo a sus parcelas cercanas. */
  buscarPorDireccion(texto: string): void {
    this.limpiar();
    const base = { ...BUSQUEDA_VACIA, tipo: 'direccion' as const, texto };
    this.busquedaSubject.next({ ...base, estado: 'cargando' });
    this.busqueda = this.sugerirDirecciones(texto).subscribe({
      next: resultado => {
        if (!resultado.resultados.length) this.busquedaSubject.next({ ...base, estado: 'sin-resultados' });
        else if (resultado.resultados.length === 1) this.elegirDireccion(resultado.resultados[0], resultado.advertencia);
        else this.busquedaSubject.next({ ...base, estado: 'direcciones', direcciones: resultado.resultados, advertencia: resultado.advertencia });
      },
      error: error => this.busquedaSubject.next({ ...base, estado: 'error', error: this.api.error(error) })
    });
  }
  /**
   * Una dirección relevada en una ficha ya tiene su parcela. Una de Georef trae un punto aproximado sobre el eje
   * de la calle: se buscan las parcelas cercanas y la persona elige la suya.
   */
  elegirDireccion(direccion: DireccionOficial, advertencia: string | null = null): void {
    this.limpiar();
    const origen: OrigenConsulta = { tipo: 'direccion', texto: direccion.texto };
    const base = { ...BUSQUEDA_VACIA, tipo: 'direccion' as const, texto: direccion.texto, advertencia };
    this.busquedaSubject.next({ ...base, estado: 'cargando' });
    if (direccion.parcelaId) {
      this.busqueda = this.http.get<ElementoTerritorial>('/api/public/v1/territorio/parcelas/' + encodeURIComponent(direccion.parcelaId))
        .subscribe({
          next: parcela => this.abrirParcela(parcela, origen),
          error: error => this.busquedaSubject.next({ ...base, estado: 'error', error: this.api.error(error) })
        });
      return;
    }
    if (direccion.latitud === null || direccion.longitud === null) {
      this.busquedaSubject.next({ ...base, estado: 'error', error: 'La dirección no tiene una ubicación para buscar parcelas.' });
      return;
    }
    const punto = { latitud: direccion.latitud, longitud: direccion.longitud };
    this.busqueda = this.http.get<CercanasResponse>('/api/public/v1/territorio/parcelas/cercanas', { params: { ...punto, radio: 30 } })
      .subscribe({
        next: resultado => {
          const conPunto = { ...base, punto, radioMetros: resultado.radioMetros };
          if (!resultado.parcelas.length) this.busquedaSubject.next({ ...conPunto, estado: 'sin-resultados' });
          else if (resultado.parcelas.length === 1) this.abrirParcela(resultado.parcelas[0].parcela, origen);
          else this.busquedaSubject.next({ ...conPunto, estado: 'opciones', items: resultado.parcelas.map(c => c.parcela),
            distancias: resultado.parcelas.map(c => c.distanciaMetros) });
        },
        error: error => this.busquedaSubject.next({ ...base, estado: 'error', error: this.api.error(error) })
      });
  }
  /** Abre la ficha de una parcela consultando un punto interior, igual que un clic dentro de ella en el mapa. */
  abrirParcela(parcela: ElementoTerritorial, origen?: OrigenConsulta): void {
    const punto = puntoInterior(parcela.geometry);
    const nomenclatura = String(parcela.properties?.['nomenclatu'] ?? parcela.id ?? '');
    if (!punto) {
      this.busquedaSubject.next({ ...BUSQUEDA_VACIA, estado: 'error', texto: nomenclatura,
        error: 'La parcela no tiene una forma válida para ubicarla en el mapa.' });
      return;
    }
    this.consultar(punto.latitud, punto.longitud, origen ?? { tipo: 'nomenclatura', nomenclatura });
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
