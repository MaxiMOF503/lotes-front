import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoteService } from '../../services/lote.service';
import { BadgeProcedenciaComponent } from '../badge-procedencia/badge-procedencia.component';

/**
 * Panel lateral que muestra la ficha demostrativa del lote.
 * Se suscribe al LoteService vía observables y usa el pipe async.
 */
@Component({
  selector: 'app-ficha-lote',
  standalone: true,
  imports: [CommonModule, BadgeProcedenciaComponent],
  templateUrl: './ficha-lote.component.html',
  styleUrls: ['./ficha-lote.component.css', './ficha-lote-opciones.component.css']
})
export class FichaLoteComponent {
  private loteService = inject(LoteService);

  readonly ficha$ = this.loteService.ficha$;
  readonly opciones$ = this.loteService.opciones$;
  readonly estado$ = this.loteService.estado$;
  readonly error$ = this.loteService.error$;

  seleccionarOpcion(identificador: string): void {
    this.loteService.seleccionarOpcion(identificador);
  }
}
