import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ApiService } from './api.service';
import { CapaResponse, ConsultaTerritorial, EstadoTerritorial, FuenteTerritorial } from '../models/territorio.model';

@Injectable({ providedIn: 'root' })
export class TerritorioService {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  private consulta?: Subscription;
  private ultimoPunto?: { latitud: number; longitud: number };
  private estadoSubject = new BehaviorSubject<EstadoTerritorial>({ estado: 'vacio', datos: null, error: null });
  readonly estado$ = this.estadoSubject.asObservable();

  fuentes() { return this.http.get<FuenteTerritorial[]>('/api/public/v1/territorio/fuentes'); }
  capa(id: string, oeste: number, sur: number, este: number, norte: number, zoom: number) {
    return this.http.get<CapaResponse>('/api/public/v1/territorio/capas/' + id,
      { params: { oeste, sur, este, norte, zoom, limite: 700 } });
  }
  consultar(latitud: number, longitud: number): void {
    this.ultimoPunto = { latitud, longitud };
    this.consulta?.unsubscribe();
    this.estadoSubject.next({ estado: 'cargando', datos: null, error: null });
    this.consulta = this.http.get<ConsultaTerritorial>('/api/public/v1/territorio/consulta',
      { params: { latitud, longitud } }).subscribe({
        next: datos => this.estadoSubject.next({ estado: 'cargado', datos, error: null }),
        error: error => this.estadoSubject.next({ estado: 'error', datos: null, error: this.api.error(error) })
      });
  }
  reintentar(): void { if (this.ultimoPunto) this.consultar(this.ultimoPunto.latitud, this.ultimoPunto.longitud); }
  limpiar(): void {
    this.consulta?.unsubscribe();
    this.estadoSubject.next({ estado: 'vacio', datos: null, error: null });
  }
}
