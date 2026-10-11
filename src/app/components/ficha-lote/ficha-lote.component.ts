import { AccionesParcelaComponent } from '../acciones-parcela/acciones-parcela.component';
import { TerritorioService } from '../../services/territorio.service';
import { ElementoTerritorial } from '../../models/territorio.model';
import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoteService } from '../../services/lote.service';
import { BadgeProcedenciaComponent } from '../badge-procedencia/badge-procedencia.component';

/**
 * Panel lateral de consulta de lotes registrados y parcelas reales.
 * Se suscribe al LoteService vía observables y usa el pipe async.
 */
@Component({
  selector: 'app-ficha-lote',
  standalone: true,
  imports: [CommonModule, BadgeProcedenciaComponent, AccionesParcelaComponent],
  templateUrl: './ficha-lote.component.html',
  styleUrls: ['./ficha-lote.component.css', './ficha-lote-opciones.component.css', './ficha-territorial.component.css']
})
export class FichaLoteComponent {
  @Output() areaSolicitada = new EventEmitter<void>();
  private loteService = inject(LoteService);
  private territorio = inject(TerritorioService);
  readonly territorial$ = this.territorio.estado$;
  reintentarTerritorio(): void { this.territorio.reintentar(); }
  valorParcela(parcela: ElementoTerritorial, campo: string): string {
    const valor = parcela.properties?.[campo];
    return valor === null || valor === undefined || String(valor).trim() === '' ? 'Sin información' : String(valor);
  }

  readonly ficha$ = this.loteService.ficha$;
  readonly opciones$ = this.loteService.opciones$;
  readonly estado$ = this.loteService.estado$;
  readonly error$ = this.loteService.error$;

  seleccionarOpcion(identificador: string): void {
    this.loteService.seleccionarOpcion(identificador);
  }
}
