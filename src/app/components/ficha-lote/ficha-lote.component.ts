import { AccionesParcelaComponent } from '../acciones-parcela/acciones-parcela.component';
import { TerritorioService } from '../../services/territorio.service';
import { ConsultaTerritorial, DireccionOficial, ElementoTerritorial, EstadoBusquedaParcelas, OrigenConsulta } from '../../models/territorio.model';
import { ProcedenciaResponse } from '../../models/ficha-lote.model';
import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeProcedenciaComponent } from '../badge-procedencia/badge-procedencia.component';

/**
 * Panel lateral de consulta de parcelas reales del catastro.
 * Se suscribe al TerritorioService vía observables y usa el pipe async.
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
  private territorio = inject(TerritorioService);
  readonly territorial$ = this.territorio.estado$;
  readonly busquedaParcelas$ = this.territorio.busqueda$;
  readonly origen$ = this.territorio.origen$;
  reintentarTerritorio(): void { this.territorio.reintentar(); }
  abrirParcela(parcela: ElementoTerritorial, busqueda?: EstadoBusquedaParcelas): void {
    this.territorio.abrirParcela(parcela, busqueda?.tipo === 'direccion' ? { tipo: 'direccion', texto: busqueda.texto } : undefined);
  }
  elegirDireccion(direccion: DireccionOficial, advertencia: string | null): void { this.territorio.elegirDireccion(direccion, advertencia); }
  valorParcela(parcela: ElementoTerritorial, campo: string): string {
    const valor = parcela.properties?.[campo];
    return valor === null || valor === undefined || String(valor).trim() === '' ? 'Sin información' : String(valor);
  }
  conUnidad(parcela: ElementoTerritorial, campo: string, unidad: string): string {
    const valor = this.valorParcela(parcela, campo);
    return valor === 'Sin información' ? valor : valor + ' ' + unidad;
  }
  criterio(origen: OrigenConsulta, datos: ConsultaTerritorial): string {
    if (origen.tipo === 'nomenclatura') return 'Nomenclatura ' + origen.nomenclatura;
    if (origen.tipo === 'direccion') return origen.texto + ' (ubicación aproximada)';
    return `Punto del mapa (${datos.latitud.toFixed(5)}, ${datos.longitud.toFixed(5)})`;
  }
  /** Las capas territoriales son publicaciones oficiales; la fuente sale de la importación consultada. */
  procedencia(datos: ConsultaTerritorial, capa: string): ProcedenciaResponse {
    return { tipo: 'OFICIAL', fuente: datos.fuentes.find(f => f.capa === capa)?.fuente ?? null, oficial: true };
  }
}
