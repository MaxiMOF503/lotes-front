import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  FichaLoteResponse,
  EstadoConsulta
} from '../models/ficha-lote.model';
import { LOTES_MOCK } from '../mocks/lotes-data.mock';

/**
 * Servicio que gestiona la consulta de fichas de lotes.
 *
 * DECISIÓN DE DISEÑO: Este servicio encapsula el acceso a datos
 * detrás de métodos con firma estable. Actualmente resuelve
 * desde datos mock locales. Para integrar la API real del backend
 * (GET /api/public/v1/lotes/ficha), solo se reemplaza la
 * implementación interna por HttpClient.get() sin modificar
 * ningún componente consumidor.
 */
@Injectable({ providedIn: 'root' })
export class LoteService {

  private fichaSubject = new BehaviorSubject<FichaLoteResponse | null>(null);
  private estadoSubject = new BehaviorSubject<EstadoConsulta>('vacio');
  private errorSubject = new BehaviorSubject<string | null>(null);

  /** Ficha del lote actualmente consultado (null si no hay consulta activa) */
  readonly ficha$: Observable<FichaLoteResponse | null> = this.fichaSubject.asObservable();

  /** Estado actual de la consulta */
  readonly estado$: Observable<EstadoConsulta> = this.estadoSubject.asObservable();

  /** Mensaje de error cuando estado === 'error' */
  readonly error$: Observable<string | null> = this.errorSubject.asObservable();

  /**
   * Consulta una ficha por identificador de lote.
   * Ej: consultarPorIdentificador('LOT-DEMO-001')
   *
   * Para integrar la API real:
   *   return this.http.get<FichaLoteResponse>(
   *     `${API_URL}/api/public/v1/lotes/ficha`,
   *     { params: { identificador } }
   *   );
   */
  consultarPorIdentificador(identificador: string): void {
    this.estadoSubject.next('cargando');
    this.errorSubject.next(null);

    // Simula latencia de red
    setTimeout(() => {
      const ficha = LOTES_MOCK.find(
        (l) => l.lote.identificador.toLowerCase() === identificador.toLowerCase()
      );

      if (ficha) {
        const fichaConCriterio: FichaLoteResponse = {
          ...ficha,
          criterioConsulta: {
            tipo: 'IDENTIFICADOR',
            identificador: identificador,
            latitud: null,
            longitud: null
          }
        };
        this.fichaSubject.next(fichaConCriterio);
        this.estadoSubject.next('cargado');
      } else {
        this.fichaSubject.next(null);
        this.estadoSubject.next('sin-resultados');
      }
    }, 400);
  }

  /**
   * Consulta una ficha por coordenadas geográficas.
   *
   * Para integrar la API real:
   *   return this.http.get<FichaLoteResponse>(
   *     `${API_URL}/api/public/v1/lotes/ficha`,
   *     { params: { latitud, longitud } }
   *   );
   */
  consultarPorCoordenadas(latitud: number, longitud: number): void {
    this.estadoSubject.next('cargando');
    this.errorSubject.next(null);

    // Simula latencia de red
    setTimeout(() => {
      // Busca lote cercano (tolerancia de ~100m para demo)
      const TOLERANCIA = 0.001;
      const ficha = LOTES_MOCK.find((l) => {
        const dLat = Math.abs(l.lote.coordenadas.latitud - latitud);
        const dLng = Math.abs(l.lote.coordenadas.longitud - longitud);
        return dLat < TOLERANCIA && dLng < TOLERANCIA;
      });

      if (ficha) {
        const fichaConCriterio: FichaLoteResponse = {
          ...ficha,
          criterioConsulta: {
            tipo: 'COORDENADAS',
            identificador: null,
            latitud,
            longitud
          }
        };
        this.fichaSubject.next(fichaConCriterio);
        this.estadoSubject.next('cargado');
      } else {
        this.fichaSubject.next(null);
        this.estadoSubject.next('sin-resultados');
      }
    }, 400);
  }

  /** Limpia la consulta actual */
  limpiar(): void {
    this.fichaSubject.next(null);
    this.estadoSubject.next('vacio');
    this.errorSubject.next(null);
  }
}
