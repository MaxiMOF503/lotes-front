import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoteService } from '../../services/lote.service';

/**
 * Buscador con dos modos: por identificador o por coordenadas.
 * Llama directamente al LoteService para realizar la consulta.
 */
@Component({
  selector: 'app-buscador-ubicacion',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './buscador-ubicacion.component.html',
  styleUrl: './buscador-ubicacion.component.css'
})
export class BuscadorUbicacionComponent {

  modoBusqueda: 'identificador' | 'coordenadas' = 'identificador';
  identificador = '';
  latitud = '';
  longitud = '';

  constructor(private loteService: LoteService) {}

  buscar(): void {
    if (this.modoBusqueda === 'identificador') {
      const id = this.identificador.trim();
      if (id) {
        this.loteService.consultarPorIdentificador(id);
      }
    } else {
      const lat = parseFloat(this.latitud);
      const lng = parseFloat(this.longitud);
      if (!isNaN(lat) && !isNaN(lng)) {
        this.loteService.consultarPorCoordenadas(lat, lng);
      }
    }
  }

  limpiar(): void {
    this.identificador = '';
    this.latitud = '';
    this.longitud = '';
    this.loteService.limpiar();
  }
}
