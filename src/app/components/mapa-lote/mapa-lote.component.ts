import { Component, AfterViewInit, OnDestroy, Input, Output, EventEmitter, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { TerritorioService } from '../../services/territorio.service';
import { AsistenteService } from '../../services/asistente.service';

const ESPERA_ASISTENTE_MS = 5000;
const iconSeleccion = L.divIcon({ className: 'territory-marker', html: '<span class="marker-body" aria-hidden="true"><i class="marker-face"><b></b></i></span>', iconSize: [46, 58], iconAnchor: [23, 56], popupAnchor: [0, -52] });
type EstadoCapa = 'idle' | 'loading' | 'active' | 'error';
interface CapaTerritorial { id: string; nombre: string; detalle: string; archivo?: string; color: string; estado: EstadoCapa; disponible: boolean; nota?: string; remota?: boolean; seleccionada?: boolean; aviso?: string; request?: Subscription; layer?: L.GeoJSON; }

@Component({ selector: 'app-mapa-lote', standalone: true, imports: [CommonModule], templateUrl: './mapa-lote.component.html', styleUrl: './mapa-lote.component.css' })
export class MapaLoteComponent implements AfterViewInit, OnDestroy {
  @Input() puntoInicial:{latitud:number;longitud:number}|null=null;
  @Output() ubicacionSeleccionada = new EventEmitter<{ lat: number; lng: number }>();
  @ViewChild('mapaContainer', { static: true }) mapaContainer!: ElementRef<HTMLDivElement>;
  panelCapasAbierto = false;
  capas: CapaTerritorial[] = [
    { id: 'zonificacion', nombre: 'Zonificación', detalle: '143 zonas urbanísticas', archivo: 'assets/datasets/zonificacion.geojson', color: '#f5b700', estado: 'idle', disponible: true },
    { id: 'loteos', nombre: 'Loteos y barrios', detalle: '731 polígonos registrados', archivo: 'assets/datasets/loteos.geojson', color: '#ff7a18', estado: 'idle', disponible: true },
    { id: 'renabap', nombre: 'Barrios populares', detalle: '33 registros RENABAP', archivo: 'assets/datasets/renabap.geojson', color: '#e5484d', estado: 'idle', disponible: true },
    { id: 'aysam', nombre: 'Cobertura de agua', detalle: 'Radio general aproximado', remota: true, color: '#1677ff', estado: 'idle', disponible: true, nota: 'No representa cañerías calle por calle.' },
    { id: 'pluvial', nombre: 'Zonas pluviales', detalle: '84 polígonos territoriales', archivo: 'assets/datasets/pluvial.geojson', color: '#7259d6', estado: 'idle', disponible: true, nota: 'Se muestra la geometría; el nivel de riesgo no está clasificado.' },
    { id: 'catastro', nombre: 'Parcelas catastrales', detalle: '65.756 parcelas', color: '#25856a', estado: 'idle', disponible: true, remota: true, nota: 'Catastro municipal. Acercá el mapa para ver las parcelas.' },
    { id: 'electricidad', nombre: 'Líneas eléctricas', detalle: '13.494 tramos EDEMSA', color: '#263238', estado: 'idle', disponible: true, remota: true, nota: 'Tramos publicados por EDEMSA. No confirman una conexión.' }
  ];
  private map!: L.Map;
  private seleccionParcela?: L.GeoJSON;
  private candidatas?: L.LayerGroup;
  private consultaSuscripcion?: Subscription;
  private busquedaSuscripcion?: Subscription;
  private fuentesSuscripcion?: Subscription;
  private refresco?: ReturnType<typeof setTimeout>;
  private marcadorSeleccion: L.Marker | null = null;
  private timeoutAsistente?: ReturnType<typeof setTimeout>;
  private bloqueoSuscripcion?: Subscription;
  private interaccionesPrevias: L.Handler[] | null = null;

  constructor(private asistente: AsistenteService, private territorio: TerritorioService) {}

  ngAfterViewInit(): void {
    this.inicializarMapa();
    if(this.puntoInicial)this.centrarEn(this.puntoInicial.latitud,this.puntoInicial.longitud);
    this.fuentesSuscripcion = this.territorio.fuentes().subscribe({
      next: fuentes => fuentes.forEach(f => {
        const capa = this.capas.find(c => c.id === f.capa);
        if (capa) capa.detalle = f.registros.toLocaleString('es-AR') + ' registros importados';
      }),
      error: () => this.capas.filter(c => c.remota).forEach(c => c.aviso = 'No se pudo leer la fuente. Probá activar la capa para reintentar.')
    });
    this.consultaSuscripcion = this.territorio.estado$.subscribe(estado => {
      if (this.seleccionParcela) { this.map.removeLayer(this.seleccionParcela); this.seleccionParcela = undefined; }
      if (estado.datos?.parcelas.length) {
        this.seleccionParcela = L.geoJSON(estado.datos.parcelas, {
          pane: 'parcela-seleccionada', interactive: false,
          style: { color: '#17674c', weight: 3, fillColor: '#36a77d', fillOpacity: 0.2 }
        }).addTo(this.map);
        if (this.map.getZoom() < 15) this.map.setView([estado.datos.latitud, estado.datos.longitud], 17);
        // Una parcela buscada por nomenclatura puede estar fuera de la vista actual: llevar el mapa hasta ella.
        else if (!this.map.getBounds().contains(this.seleccionParcela.getBounds()))
          this.map.fitBounds(this.seleccionParcela.getBounds(), { maxZoom: 18, padding: [40, 40] });
      }
    });
    // Búsqueda por dirección: el punto aproximado de Georef y las parcelas cercanas para elegir, con borde punteado.
    this.busquedaSuscripcion = this.territorio.busqueda$.subscribe(busqueda => {
      if (this.candidatas) { this.map.removeLayer(this.candidatas); this.candidatas = undefined; }
      if (busqueda.estado !== 'opciones' || busqueda.tipo !== 'direccion' || !busqueda.punto) return;
      const parcelas = L.geoJSON(busqueda.items, {
        pane: 'parcela-seleccionada', interactive: false,
        style: { color: '#c47f00', weight: 2.5, dashArray: '6 5', fillColor: '#f5b700', fillOpacity: 0.12 }
      });
      const punto = L.circleMarker([busqueda.punto.latitud, busqueda.punto.longitud], {
        pane: 'parcela-seleccionada', radius: 7, color: '#ffffff', weight: 2, fillColor: '#c47f00', fillOpacity: 1
      }).bindTooltip(busqueda.texto + ' (aproximada)', { direction: 'top', offset: [0, -8] });
      this.candidatas = L.layerGroup([parcelas, punto]).addTo(this.map);
      this.map.fitBounds(parcelas.getBounds().extend(punto.getLatLng()), { maxZoom: 19, padding: [40, 40] });
    });
    this.bloqueoSuscripcion = this.asistente.bloqueoInteracciones$.subscribe(bloquear => {
      if (bloquear && !this.interaccionesPrevias) {
        const handlers = [this.map.dragging, this.map.scrollWheelZoom, this.map.touchZoom,
          this.map.doubleClickZoom, this.map.boxZoom, this.map.keyboard];
        this.interaccionesPrevias = handlers.filter(handler => handler.enabled());
        handlers.forEach(handler => handler.disable());
      } else if (!bloquear) {
        this.restaurarInteracciones();
      }
    });
  }
  ngOnDestroy(): void {
    this.bloqueoSuscripcion?.unsubscribe();
    this.consultaSuscripcion?.unsubscribe();
    this.busquedaSuscripcion?.unsubscribe();
    this.fuentesSuscripcion?.unsubscribe();
    this.capas.forEach(c => c.request?.unsubscribe());
    if (this.refresco) clearTimeout(this.refresco);
    this.restaurarInteracciones();
    if (this.map) this.map.remove();
    if (this.timeoutAsistente) clearTimeout(this.timeoutAsistente);
  }
  private restaurarInteracciones(): void {
    this.interaccionesPrevias?.forEach(handler => handler.enable());
    this.interaccionesPrevias = null;
  }
  centrarEn(lat: number, lng: number): void { if (this.map) { this.map.setView([lat, lng], 15); this.colocarMarcadorSeleccion(lat, lng); } }
  alternarPanel(): void { this.panelCapasAbierto = !this.panelCapasAbierto; }

  /** Si el cursor se queda sobre el mapa 5 segundos, el asistente muestra su animación de búsqueda. */
  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.timeoutAsistente = setTimeout(() => this.asistente.activarBusqueda(), ESPERA_ASISTENTE_MS);
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (this.timeoutAsistente) {
      clearTimeout(this.timeoutAsistente);
      this.timeoutAsistente = undefined;
    }
  }

  async alternarCapa(capa: CapaTerritorial): Promise<void> {
    if (!capa.disponible) return;
    if (capa.remota) {
      capa.seleccionada = !capa.seleccionada;
      capa.request?.unsubscribe();
      if (!capa.seleccionada) {
        if (capa.layer) this.map.removeLayer(capa.layer);
        capa.layer = undefined; capa.estado = 'idle'; capa.aviso = undefined;
      } else this.cargarCapaRemota(capa);
      return;
    }
    if (capa.estado === 'loading') return;
    if (capa.layer) {
      if (this.map.hasLayer(capa.layer)) { this.map.removeLayer(capa.layer); capa.estado = 'idle'; }
      else { capa.layer.addTo(this.map); capa.estado = 'active'; }
      return;
    }
    capa.estado = 'loading';
    try {
      const respuesta = await fetch(capa.archivo!);
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      const datos = await respuesta.json();
      capa.layer = L.geoJSON(datos, {
        style: { color: capa.color, weight: capa.id === 'pluvial' ? 1.6 : 1.2, opacity: 0.9, fillColor: capa.color, fillOpacity: capa.id === 'zonificacion' ? 0.16 : 0.23 },
        onEachFeature: (feature, layer) => layer.bindPopup(this.construirDetalle(capa.id, feature.properties ?? {}))
      }).addTo(this.map);
      capa.estado = 'active';
    } catch { capa.estado = 'error'; }
  }

  get avisoCapas(): string {
    return this.capas.filter(c => c.remota && c.seleccionada && c.aviso).map(c => c.nombre + ': ' + c.aviso).join(' ');
  }
  private cargarCapaRemota(capa: CapaTerritorial): void {
    capa.request?.unsubscribe();
    if (capa.layer) this.map.removeLayer(capa.layer);
    capa.layer = undefined;
    capa.estado = 'loading'; capa.aviso = undefined;
    const b = this.map.getBounds();
    capa.request = this.territorio.capa(capa.id, b.getWest(), b.getSouth(), b.getEast(), b.getNorth(), this.map.getZoom()).subscribe({
      next: datos => {
        if (!capa.seleccionada) return;
        capa.aviso = datos.acercar || datos.hayMas ? datos.mensaje : undefined;
        capa.layer = L.geoJSON(datos, {
          pane: capa.id === 'aysam' ? 'agua-real' : 'territorio-real',
          style: { color: capa.color, weight: capa.id === 'electricidad' ? 2.3 : 1.2,
            fillColor: capa.color, fillOpacity: capa.id === 'aysam' ? 0.12 : 0.05 },
          onEachFeature: (feature, layer) => layer.bindPopup(this.construirDetalle(capa.id, feature.properties ?? {}))
        }).addTo(this.map);
        capa.estado = 'active';
      },
      error: () => { capa.estado = 'error'; capa.aviso = 'No se pudo cargar. Desactivá y activá la capa para reintentar.'; }
    });
  }

  private inicializarMapa(): void {
    this.map = L.map(this.mapaContainer.nativeElement, { center: [-33.035, -68.88], zoom: 11, zoomControl: false, preferCanvas: true });
    this.map.createPane('agua-real').style.zIndex = '350';
    this.map.createPane('territorio-real').style.zIndex = '410';
    this.map.createPane('parcela-seleccionada').style.zIndex = '430';
    this.map.on('moveend', () => {
      if (this.refresco) clearTimeout(this.refresco);
      // Cancelar al mover, para no dibujar respuestas de una ventana anterior.
      this.capas.filter(c => c.remota && c.seleccionada).forEach(c => c.request?.unsubscribe());
      this.refresco = setTimeout(() => this.capas.filter(c => c.remota && c.seleccionada).forEach(c => this.cargarCapaRemota(c)), 200);
    });
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(this.map);
    this.map.on('click', (e: L.LeafletMouseEvent) => { const { lat, lng } = e.latlng; this.colocarMarcadorSeleccion(lat, lng); this.ubicacionSeleccionada.emit({ lat, lng }); });
  }

  private colocarMarcadorSeleccion(lat: number, lng: number): void {
    if (this.marcadorSeleccion) this.marcadorSeleccion.setLatLng([lat, lng]);
    else this.marcadorSeleccion = L.marker([lat, lng], { icon: iconSeleccion }).addTo(this.map).bindTooltip('Punto consultado', { direction: 'top', offset: [0, -48] });
  }

  private construirDetalle(tipo: string, p: Record<string, unknown>): string {
    const filas: Array<[string, unknown]> = tipo === 'catastro' ? [['Nomenclatura', p['nomenclatu']], ['Zona', p['zonificaci']], ['Superficie publicada (m²)', p['suptotal']], ['Frente (m)', p['frenmetros']], ['Fuente', 'Catastro municipal · Luján de Cuyo']]
      : tipo === 'electricidad' ? [['Tensión', p['tipo']], ['Fuente', 'EDEMSA · Datos Abiertos de Energía'], ['Alcance', 'Traza publicada; conexión no confirmada']]
      : tipo === 'zonificacion'
      ? [['Zona', p['zona_'] || p['codigo']], ['Distrito', p['distrito_']], ['Lote mínimo', p['lote_min']], ['FOS', p['fos']], ['Altura máxima', p['alt_max']], ['Ordenanza', p['ordenanza']]]
      : tipo === 'loteos' ? [['Barrio', p['nom_barrio']], ['Tipo', p['tipo']], ['Dominio', p['caracteris']], ['Distrito', p['distritos']], ['Ordenanza', p['ordenanza']]]
      : tipo === 'renabap' ? [['Barrio popular', p['nombreBarr']], ['Localidad', p['localidad']], ['Registro RENABAP', p['idrenabap']]]
      : tipo === 'aysam' ? [['Operador', p['operador'] || 'AySAM'], ['Cobertura', 'Área aproximada de servicio']]
      : [['Capa', 'Zona pluvial'], ['Referencia', p['name'] || p['id']]];
    const contenido = filas.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '').map(([e, v]) => `<div><span>${this.escapar(e)}</span><strong>${this.escapar(String(v))}</strong></div>`).join('');
    return `<section class="map-detail">${contenido}</section>`;
  }
  private escapar(valor: string): string { return valor.replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] ?? c)); }
}
