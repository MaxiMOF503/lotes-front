import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoteService } from '../../services/lote.service';

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
export class BuscadorUbicacionComponent {

  modoBusqueda: 'identificador' | 'direccion' = 'identificador';
  identificador = '';
  direccion = '';

  constructor(private loteService: LoteService) {}

  buscar(): void {
    if (this.modoBusqueda === 'identificador') {
      const id = this.identificador.trim();
      if (id) {
        this.loteService.consultarPorIdentificador(id);
      }
    } else if (this.direccion.trim().length >= 3) {
      this.loteService.consultarPorDireccion(this.direccion.trim());
    }
  }

  limpiar(): void {
    this.identificador = '';
    this.direccion = '';
    this.loteService.limpiar();
  }
}
