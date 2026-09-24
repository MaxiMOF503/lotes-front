import {
  Component,
  AfterViewInit,
  OnDestroy,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild
} from '@angular/core';
import * as L from 'leaflet';


/* Corrige el problema de iconos de marcador en Leaflet con bundlers */
const iconDefault = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

const iconSeleccion = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  shadowSize: [49, 49]
});

/**
 * Mapa interactivo con Leaflet.
 * Centrado en Mendoza, Argentina.
 * El usuario puede hacer click para seleccionar una ubicación.
 */
@Component({
  selector: 'app-mapa-lote',
  standalone: true,
  templateUrl: './mapa-lote.component.html',
  styleUrl: './mapa-lote.component.css'
})
export class MapaLoteComponent implements AfterViewInit, OnDestroy {

  @Output() ubicacionSeleccionada = new EventEmitter<{ lat: number; lng: number }>();
  @ViewChild('mapaContainer', { static: true }) mapaContainer!: ElementRef<HTMLDivElement>;

  private map!: L.Map;
  private marcadorSeleccion: L.Marker | null = null;

  ngAfterViewInit(): void {
    this.inicializarMapa();

  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  /** Centra el mapa en las coordenadas indicadas y coloca un marcador */
  centrarEn(lat: number, lng: number): void {
    if (this.map) {
      this.map.setView([lat, lng], 15);
      this.colocarMarcadorSeleccion(lat, lng);
    }
  }

  private inicializarMapa(): void {
    this.map = L.map(this.mapaContainer.nativeElement, {
      center: [-32.8895, -68.8458],
      zoom: 13
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.colocarMarcadorSeleccion(lat, lng);
      this.ubicacionSeleccionada.emit({ lat, lng });
    });
  }

  private colocarMarcadorSeleccion(lat: number, lng: number): void {
    if (this.marcadorSeleccion) {
      this.marcadorSeleccion.setLatLng([lat, lng]);
    } else {
      this.marcadorSeleccion = L.marker([lat, lng], { icon: iconSeleccion })
        .addTo(this.map)
        .bindPopup('Ubicación seleccionada')
        .openPopup();
    }
  }

}
