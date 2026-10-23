import { Component, ElementRef, HostListener, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map } from 'rxjs/operators';
import { LoteService } from '../../services/lote.service';
import { AsistenteService } from '../../services/asistente.service';
import { TerritorioService } from '../../services/territorio.service';
import { DireccionOficial } from '../../models/territorio.model';

/**
 * Buscador público de parcelas reales: por nomenclatura catastral o por dirección (Georef y direcciones relevadas).
 * El mapa conserva la consulta por coordenadas.
 */
@Component({
  selector: 'app-buscador-ubicacion',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './buscador-ubicacion.component.html',
  styleUrls: ['./buscador-ubicacion.component.css', './buscador-ubicacion-layout.component.css']
})
export class BuscadorUbicacionComponent implements OnDestroy {
  private elementRef = inject(ElementRef);

  modoBusqueda: 'nomenclatura' | 'direccion' = 'nomenclatura';
  nomenclatura = '';
  direccion = '';
  aviso: string | null = null;
  entradaInvalida = false;
  private consultaDelCampo = false;

  sugerencias: DireccionOficial[] = [];
  private advertenciaSugerencias: string | null = null;
  mostrarSugerencias = false;
  indiceActivo = -1;
  buscandoSugerencias = false;

  private direccionInput$ = new Subject<string>();
  private suscripcion: Subscription;

  constructor(private loteService: LoteService, private asistente: AsistenteService, private territorio: TerritorioService) {
    // Cada sugerencia consulta Georef: se espera a que la persona deje de escribir.
    this.suscripcion = this.direccionInput$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(texto => {
        this.buscandoSugerencias = true;
        return this.territorio.sugerirDirecciones(texto).pipe(
          map(r => ({ resultados: r.resultados, advertencia: r.advertencia as string | null })),
          catchError(() => of({ resultados: [] as DireccionOficial[], advertencia: null }))
        );
      })
    ).subscribe(resultado => {
      this.buscandoSugerencias = false;
      this.sugerencias = resultado.resultados;
      this.advertenciaSugerencias = resultado.advertencia;
      this.indiceActivo = -1;
      this.mostrarSugerencias = this.sugerencias.length > 0;
    });
    this.suscripcion.add(this.territorio.busqueda$.subscribe(busqueda => {
      if (!this.consultaDelCampo || busqueda.tipo !== this.modoBusqueda) return;
      if (busqueda.estado === 'sin-resultados') {
        this.aviso = busqueda.tipo === 'nomenclatura' ? 'No se encontraron parcelas con esa nomenclatura'
          : busqueda.punto ? 'No hay parcelas del catastro cerca de esa dirección'
          : 'No encontramos esa dirección en Luján de Cuyo';
      } else if (busqueda.estado === 'error') {
        this.aviso = busqueda.error || 'No se pudo realizar la búsqueda. Intentá nuevamente';
      }
    }));
  }

  ngOnDestroy(): void {
    this.suscripcion.unsubscribe();
  }

  onDireccionEscrita(): void {
    this.onCampoEditado();
    const texto = this.direccion.trim();
    if (texto.length >= 3) {
      this.direccionInput$.next(texto);
    } else {
      this.mostrarSugerencias = false;
      this.sugerencias = [];
      this.indiceActivo = -1;
    }
  }

  onTeclaEnCampo(evento: KeyboardEvent): void {
    if (!this.mostrarSugerencias || this.sugerencias.length === 0) return;
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      this.indiceActivo = (this.indiceActivo + 1) % this.sugerencias.length;
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      this.indiceActivo = this.indiceActivo <= 0 ? this.sugerencias.length - 1 : this.indiceActivo - 1;
    } else if (evento.key === 'Enter' && this.indiceActivo >= 0) {
      evento.preventDefault();
      this.elegirSugerencia(this.sugerencias[this.indiceActivo]);
    } else if (evento.key === 'Escape') {
      this.cerrarSugerencias();
    }
  }

  elegirSugerencia(opcion: DireccionOficial): void {
    this.onCampoEditado();
    this.direccion = opcion.texto || this.direccion;
    this.cerrarSugerencias();
    this.loteService.limpiar();
    this.consultaDelCampo = true;
    this.territorio.elegirDireccion(opcion, this.advertenciaSugerencias);
    this.asistente.activarBusqueda();
  }

  cerrarSugerencias(): void {
    this.mostrarSugerencias = false;
    this.indiceActivo = -1;
  }

  @HostListener('document:click', ['$event'])
  onClickFuera(evento: Event): void {
    if (!this.elementRef.nativeElement.contains(evento.target)) {
      this.cerrarSugerencias();
    }
  }

  buscar(): void {
    this.onCampoEditado();
    this.cerrarSugerencias();
    if (this.modoBusqueda === 'nomenclatura') {
      // Se aceptan espacios, puntos o guiones al pegarla; el catastro la publica solo con dígitos.
      const digitos = this.nomenclatura.replace(/[\s.\-]/g, '');
      if (!/^[0-9]{3,30}$/.test(digitos)) {
        this.aviso = digitos ? 'La nomenclatura lleva solo números: ingresá entre 3 y 30 dígitos' : 'Ingresá la nomenclatura catastral';
        this.entradaInvalida = true;
        return;
      }
      this.nomenclatura = digitos;
      this.loteService.limpiar();
      this.consultaDelCampo = true;
      this.territorio.buscarPorNomenclatura(digitos);
      this.asistente.activarBusqueda();
    } else if (this.direccion.trim().length >= 3) {
      this.loteService.limpiar();
      this.consultaDelCampo = true;
      this.territorio.buscarPorDireccion(this.direccion.trim());
      this.asistente.activarBusqueda();
    } else {
      this.aviso = 'Ingresá al menos 3 caracteres para buscar por dirección';
      this.entradaInvalida = true;
    }
  }

  onCampoEditado(): void {
    this.aviso = null;
    this.entradaInvalida = false;
    this.consultaDelCampo = false;
  }

  cambiarModo(modo: 'nomenclatura' | 'direccion'): void {
    this.onCampoEditado();
    this.cerrarSugerencias();
    this.modoBusqueda = modo;
  }

  limpiar(): void {
    this.onCampoEditado();
    this.nomenclatura = '';
    this.direccion = '';
    this.cerrarSugerencias();
    this.loteService.limpiar();
  }
}
