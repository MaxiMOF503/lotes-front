import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { SesionUsuario } from '../models/admin.model';

/**
 * Fuente única de la sesión activa. El header y el área interna se suscriben
 * acá en vez de guardar cada uno su propia copia, para que un login o logout
 * hecho desde cualquiera de los dos se vea reflejado en el otro sin F5.
 */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private api = inject(ApiService);
  private sesionSubject = new BehaviorSubject<SesionUsuario | null>(null);
  readonly sesion$ = this.sesionSubject.asObservable();

  async cargar(): Promise<SesionUsuario | null> {
    try {
      const sesion = await this.api.get<SesionUsuario>('/me');
      this.sesionSubject.next(sesion);
      return sesion;
    } catch (e) {
      this.sesionSubject.next(null);
      if (!(e instanceof HttpErrorResponse) || e.status !== 401) throw e;
      return null;
    }
  }

  async ingresar(email: string, password: string): Promise<SesionUsuario> {
    const sesion = await this.api.login(email, password);
    this.sesionSubject.next(sesion);
    return sesion;
  }

  async salir(): Promise<void> {
    await this.api.write('POST', '/logout').catch(() => {});
    this.sesionSubject.next(null);
  }
}
