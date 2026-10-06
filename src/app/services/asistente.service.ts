import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type EstadoAsistente = 'intro' | 'activo';

const CLAVE_VISTO = 'loteseguro.asistente.visto';
const DURACION_BUSQUEDA_MS = 1800;

/**
 * Estado del pin-asistente: si ya se mostró la introducción (persistido en
 * localStorage, no vuelve a aparecer en cada visita) y si debe mostrar la
 * animación de "buscando" (disparada por el buscador o por el mapa).
 */
@Injectable({ providedIn: 'root' })
export class AsistenteService {
  private estadoSubject = new BehaviorSubject<EstadoAsistente>(this.yaVisto() ? 'activo' : 'intro');
  private buscandoSubject = new BehaviorSubject<boolean>(false);
  private paginaListaSubject = new BehaviorSubject<boolean>(false);
  private timeoutBusqueda?: ReturnType<typeof setTimeout>;

  readonly estado$ = this.estadoSubject.asObservable();
  readonly buscando$ = this.buscandoSubject.asObservable();
  readonly paginaLista$ = this.paginaListaSubject.asObservable();

  /** La intro espera a esto: recién se muestra cuando terminó el splash. */
  marcarPaginaLista(): void {
    this.paginaListaSubject.next(true);
  }

  cerrarIntro(): void {
    this.marcarVisto();
    this.estadoSubject.next('activo');
  }

  /** Dispara unos segundos de animación "buscando" y vuelve sola a la cara normal. */
  activarBusqueda(): void {
    if (this.timeoutBusqueda) {
      clearTimeout(this.timeoutBusqueda);
    }
    this.buscandoSubject.next(true);
    this.timeoutBusqueda = setTimeout(() => this.buscandoSubject.next(false), DURACION_BUSQUEDA_MS);
  }

  private yaVisto(): boolean {
    try {
      return localStorage.getItem(CLAVE_VISTO) === '1';
    } catch {
      return false;
    }
  }

  private marcarVisto(): void {
    try {
      localStorage.setItem(CLAVE_VISTO, '1');
    } catch {
      /* Si localStorage no está disponible, simplemente vuelve a aparecer la próxima vez. */
    }
  }
}
