import { Component, AfterViewInit, OnDestroy, Output, EventEmitter, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { AsistenteService } from '../../services/asistente.service';

const ESPERA_ASISTENTE_MS = 5000;
const iconSeleccion = L.divIcon({ className: 'territory-marker', html: '<span class="marker-body" aria-hidden="true"><i class="marker-face"><b></b></i></span>', iconSize: [46, 58], iconAnchor: [23, 56], popupAnchor: [0, -52] });
type EstadoCapa = 'idle' | 'loading' | 'active' | 'error';
interface CapaTerritorial { id: string; nombre: string; detalle: string; archivo?: string; color: string; estado: EstadoCapa; disponible: boolean; nota?: string; layer?: L.GeoJSON; }

@Component({ selector: 'app-mapa-lote', standalone: true, imports: [CommonModule], templateUrl: './mapa-lote.component.html', styleUrl: './mapa-lote.component.css' })
export class MapaLoteComponent implements AfterViewInit, OnDestroy {
  @Output() ubicacionSeleccionada = new EventEmitter<{ lat: number; lng: number }>();
  @ViewChild('mapaContainer', { static: true }) mapaContainer!: ElementRef<HTMLDivElement>;
  panelCapasAbierto = false;
  capas: CapaTerritorial[] = [
    { id: 'zonificacion', nombre: 'Zonificación', detalle: '143 zonas urbanísticas', archivo: 'assets/datasets/zonificacion.geojson', color: '#f5b700', estado: 'idle', disponible: true },
    { id: 'loteos', nombre: 'Loteos y barrios', detalle: '731 polígonos registrados', archivo: 'assets/datasets/loteos.geojson', color: '#ff7a18', estado: 'idle', disponible: true },
    { id: 'renabap', nombre: 'Barrios populares', detalle: '33 registros RENABAP', archivo: 'assets/datasets/renabap.geojson', color: '#e5484d', estado: 'idle', disponible: true },
    { id: 'aysam', nombre: 'Cobertura de agua', detalle: 'Radio general aproximado', archivo: 'assets/datasets/aysam.geojson', color: '#1677ff', estado: 'idle', disponible: true, nota: 'No representa cañerías calle por calle.' },
    { id: 'pluvial', nombre: 'Zonas pluviales', detalle: '84 polígonos territoriales', archivo: 'assets/datasets/pluvial.geojson', color: '#7259d6', estado: 'idle', disponible: true, nota: 'Se muestra la geometría; el nivel de riesgo no está clasificado.' },
    { id: 'catastro', nombre: 'Parcelas catastrales', detalle: '65.756 parcelas', color: '#25856a', estado: 'idle', disponible: false, nota: 'Requiere consulta por zona desde el backend.' },
    { id: 'electricidad', nombre: 'Líneas eléctricas', detalle: '13.495 tramos EDEMSA', color: '#263238', estado: 'idle', disponible: false, nota: 'El backend debe convertir el formato SQL geográfico.' }
  ];
  private map!: L.Map;
  private marcadorSeleccion: L.Marker | null = null;
  private timeoutAsistente?: ReturnType<typeof setTimeout>;
  private bloqueoSuscripcion?: Subscription;
  private interaccionesPrevias: L.Handler[] | null = null;

  constructor(private asistente: AsistenteService) {}

  ngAfterViewInit(): void {
    this.inicializarMapa();
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
    if (!capa.disponible || capa.estado === 'loading') return;
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

  private inicializarMapa(): void {
    this.map = L.map(this.mapaContainer.nativeElement, { center: [-33.035, -68.88], zoom: 11, zoomControl: false, preferCanvas: true });
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(this.map);
    this.map.on('click', (e: L.LeafletMouseEvent) => { const { lat, lng } = e.latlng; this.colocarMarcadorSeleccion(lat, lng); this.ubicacionSeleccionada.emit({ lat, lng }); });
  }

  private colocarMarcadorSeleccion(lat: number, lng: number): void {
    if (this.marcadorSeleccion) this.marcadorSeleccion.setLatLng([lat, lng]);
    else this.marcadorSeleccion = L.marker([lat, lng], { icon: iconSeleccion }).addTo(this.map).bindPopup('<strong>Ubicación seleccionada</strong><br>Usá estas coordenadas para consultar la ficha.').openPopup();
  }

  private construirDetalle(tipo: string, p: Record<string, unknown>): string {
    const filas: Array<[string, unknown]> = tipo === 'zonificacion'
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
