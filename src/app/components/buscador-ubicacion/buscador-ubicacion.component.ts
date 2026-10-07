import { Component, ElementRef, HostListener, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { LoteService } from '../../services/lote.service';
import { AsistenteService } from '../../services/asistente.service';
import { OpcionDireccion } from '../../models/ficha-lote.model';

/**
 * Buscador público por identificador o dirección. El mapa conserva la consulta por coordenadas.
 * Llama directamente al LoteService para realizar la consulta.
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

  modoBusqueda: 'identificador' | 'direccion' = 'identificador';
  identificador = '';
  direccion = '';

  sugerencias: OpcionDireccion[] = [];
  hayMasSugerencias = false;
  mostrarSugerencias = false;
  indiceActivo = -1;
  buscandoSugerencias = false;

  private direccionInput$ = new Subject<string>();
  private suscripcion: Subscription;

  constructor(private loteService: LoteService, private asistente: AsistenteService) {
    this.suscripcion = this.direccionInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(texto => {
        this.buscandoSugerencias = true;
        return this.loteService.sugerirDirecciones(texto).pipe(
          catchError(() => of({ opciones: [], hayMas: false }))
        );
      })
    ).subscribe(resultado => {
      this.buscandoSugerencias = false;
      this.sugerencias = resultado.opciones;
      this.hayMasSugerencias = resultado.hayMas;
      this.indiceActivo = -1;
      this.mostrarSugerencias = this.sugerencias.length > 0;
    });
  }

  ngOnDestroy(): void {
    this.suscripcion.unsubscribe();
  }

  onDireccionEscrita(): void {
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

  elegirSugerencia(opcion: OpcionDireccion): void {
    this.direccion = opcion.direccionAproximada || this.direccion;
    this.cerrarSugerencias();
    this.loteService.seleccionarOpcion(opcion.identificador);
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
    this.cerrarSugerencias();
    if (this.modoBusqueda === 'identificador') {
      const id = this.identificador.trim();
      if (id) {
        this.loteService.consultarPorIdentificador(id);
        this.asistente.activarBusqueda();
      }
    } else if (this.direccion.trim().length >= 3) {
      this.loteService.consultarPorDireccion(this.direccion.trim());
      this.asistente.activarBusqueda();
    }
  }

  limpiar(): void {
    this.identificador = '';
    this.direccion = '';
    this.cerrarSugerencias();
    this.loteService.limpiar();
  }
}