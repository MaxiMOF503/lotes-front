import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EstadoReporte, Pagina, ReporteDato, SeccionReporte, TipoReporte } from '../../models/reporte-dato.model';
import { ApiService } from '../../services/api.service';
import { EspacioTerritorialService } from '../../services/espacio-territorial.service';
import { puntoInterior } from '../../services/punto-interior';
import { ReportesDatosService } from '../../services/reportes-datos.service';
import { EstadoOperacionComponent } from '../estado-operacion/estado-operacion.component';

type Filtro = EstadoReporte | null;
type EstadoRespuesta = 'PENDIENTE' | 'EN_REVISION' | 'RESUELTO' | 'DESCARTADO';

/** Bandeja de reportes de datos para el administrador: filtrar, ver la parcela, corregir la ficha y responder. */
@Component({
  selector: 'app-bandeja-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, EstadoOperacionComponent],
  templateUrl: './bandeja-reportes.component.html',
  styleUrl: './bandeja-reportes.component.css'
})
export class BandejaReportesComponent implements OnInit, OnDestroy {
  @Output() verParcela = new EventEmitter<{ latitud: number; longitud: number }>();
  @Output() corregirFicha = new EventEmitter<string>();
  private reportes = inject(ReportesDatosService);
  private espacio = inject(EspacioTerritorialService);
  private api = inject(ApiService);
  private cd = inject(ChangeDetectorRef);
  private destruido = false;

  readonly filtros: { valor: Filtro; texto: string }[] = [
    { valor: 'PENDIENTE', texto: 'Pendientes' }, { valor: 'EN_REVISION', texto: 'En revisión' },
    { valor: 'RESUELTO', texto: 'Resueltos' }, { valor: 'DESCARTADO', texto: 'Descartados' }, { valor: null, texto: 'Todos' }
  ];
  readonly opciones: { valor: EstadoRespuesta; texto: string }[] = [
    { valor: 'EN_REVISION', texto: 'En revisión' }, { valor: 'RESUELTO', texto: 'Resuelto' },
    { valor: 'DESCARTADO', texto: 'Descartado (no corresponde)' }, { valor: 'PENDIENTE', texto: 'Volver a pendiente' }
  ];
  filtro: Filtro = 'PENDIENTE';
  pagina: Pagina<ReporteDato> | null = null;
  cargando = true;
  error = '';
  mensaje = '';
  abierto: number | null = null;
  estadoNuevo: EstadoRespuesta = 'EN_REVISION';
  respuesta = '';
  guardando = false;
  errorRespuesta = '';
  buscandoParcela: number | null = null;
  errorParcela = '';

  ngOnInit(): void { void this.cargar(0); }
  ngOnDestroy(): void { this.destruido = true; }

  elegirFiltro(valor: Filtro): void {
    if (valor === this.filtro || this.cargando || this.guardando) return;
    this.filtro = valor;
    this.cerrar();
    this.mensaje = '';
    void this.cargar(0);
  }

  async cargar(numero: number): Promise<void> {
    if (numero < 0) return;
    this.cargando = true; this.error = ''; this.errorParcela = '';
    try {
      const pagina = await this.reportes.administrar(this.filtro, numero);
      if (!pagina.items.length && numero > 0) { await this.cargar(numero - 1); return; }
      this.pagina = pagina;
      if (this.filtro === 'PENDIENTE') void this.reportes.refrescarPendientes();
    } catch (e) { this.error = this.api.error(e); }
    finally { this.cargando = false; this.avisar(); }
  }

  abrir(reporte: ReporteDato): void {
    if (this.guardando) return;
    if (this.abierto === reporte.id) { this.cerrar(); return; }
    this.abierto = reporte.id;
    this.estadoNuevo = reporte.estado === 'PENDIENTE' ? 'EN_REVISION' : reporte.estado;
    this.respuesta = reporte.respuesta ?? '';
    this.errorRespuesta = '';
  }
  cerrar(): void { if (!this.guardando) { this.abierto = null; this.errorRespuesta = ''; } }

  get requiereRespuesta(): boolean { return this.estadoNuevo === 'RESUELTO' || this.estadoNuevo === 'DESCARTADO'; }
  get respuestaValida(): boolean { return !this.requiereRespuesta || this.respuesta.trim().length >= 10; }

  async guardar(reporte: ReporteDato): Promise<void> {
    if (this.guardando) return;
    if (!this.respuestaValida) { this.errorRespuesta = 'Para resolver o descartar, escribí una respuesta de al menos 10 caracteres.'; return; }
    this.guardando = true; this.errorRespuesta = ''; this.mensaje = '';
    try {
      const actualizado = await this.reportes.actualizar(reporte.id, { estado: this.estadoNuevo, respuesta: this.respuesta.trim() || null });
      this.abierto = null;
      this.mensaje = 'Reporte #' + actualizado.id + ': ' + this.estado(actualizado.estado).toLowerCase() + '.';
      await this.cargar(this.pagina?.pagina ?? 0);
      void this.reportes.refrescarPendientes();
    } catch (e) { this.errorRespuesta = this.api.error(e); }
    finally { this.guardando = false; this.avisar(); }
  }

  /** La bandeja guarda el id original; si la parcela es una copia se abre su representante visible. */
  private idVisible(reporte: ReporteDato): string { return reporte.parcelaIdCanonico || reporte.parcelaId; }

  async verEnMapa(reporte: ReporteDato): Promise<void> {
    if (this.buscandoParcela !== null) return;
    this.buscandoParcela = reporte.id; this.errorParcela = '';
    try {
      const parcela = await this.espacio.parcela(this.idVisible(reporte));
      const punto = puntoInterior(parcela.geometry);
      if (!punto) this.errorParcela = 'Esta parcela no tiene una forma válida para ubicarla en el mapa.';
      else this.verParcela.emit(punto);
    } catch (e) { this.errorParcela = this.api.error(e); }
    finally { this.buscandoParcela = null; this.avisar(); }
  }

  corregir(reporte: ReporteDato): void { this.corregirFicha.emit(this.idVisible(reporte)); }

  seccion(valor: SeccionReporte): string {
    return ({ PARCELA: 'Datos de la parcela', ZONIFICACION: 'Zonificación', AGUA: 'Cobertura de agua', ELECTRICIDAD: 'Infraestructura eléctrica',
      FICHA_COMPLEMENTARIA: 'Información complementaria', OTRO: 'Otro dato' } as Record<SeccionReporte, string>)[valor] ?? valor;
  }
  tipo(valor: TipoReporte): string { return valor === 'INCORRECTO' ? 'Dato incorrecto' : 'Información faltante'; }
  estado(valor: EstadoReporte): string {
    return ({ PENDIENTE: 'Pendiente', EN_REVISION: 'En revisión', RESUELTO: 'Resuelto', DESCARTADO: 'Descartado' } as Record<EstadoReporte, string>)[valor] ?? valor;
  }
  get vacio(): string {
    const f = this.filtros.find(x => x.valor === this.filtro);
    return this.filtro === null ? 'Todavía no hay reportes.' : 'No hay reportes en estado “' + (f?.texto.toLowerCase() ?? '') + '”.';
  }
  private avisar(): void { if (!this.destruido) this.cd.markForCheck(); }
}
