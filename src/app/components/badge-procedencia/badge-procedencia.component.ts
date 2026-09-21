import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcedenciaResponse } from '../../models/ficha-lote.model';

/**
 * Badge visual que indica la procedencia de un dato.
 * Muestra una etiqueta naranja "DATO SIMULADO" cuando
 * procedencia.oficial === false, para cumplir con el
 * criterio de aceptación de distinguir datos demostrativos.
 */
@Component({
  selector: 'app-badge-procedencia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge-procedencia.component.html',
  styleUrl: './badge-procedencia.component.css'
})
export class BadgeProcedenciaComponent {
  @Input({ required: true }) procedencia!: ProcedenciaResponse;
}
