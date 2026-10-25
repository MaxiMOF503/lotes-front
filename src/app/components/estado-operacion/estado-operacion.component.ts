import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type TipoEstadoOperacion = 'cargando' | 'vacio' | 'error' | 'exito' | 'aviso';

@Component({
  selector: 'app-estado-operacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estado-operacion.component.html',
  styleUrl: './estado-operacion.component.css'
})
export class EstadoOperacionComponent {
  @Input() tipo: TipoEstadoOperacion = 'aviso';
  @Input() titulo = '';
  @Input() mensaje = '';
  @Input() detalle = '';
  @Input() accion = '';
  @Input() compacto = false;
  @Output() accionSolicitada = new EventEmitter<void>();

  get icono(): string {
    return { cargando: '', vacio: '○', error: '!', exito: '✓', aviso: 'i' }[this.tipo];
  }

  get rol(): 'alert' | 'status' {
    return this.tipo === 'error' ? 'alert' : 'status';
  }
}
