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


/* Marcador propio: evita dependencias de imágenes externas y acompaña la identidad territorial. */
const iconSeleccion = L.divIcon({
  className: 'territory-marker',
  html: '<span aria-hidden="true"></span>',
  iconSize: [34, 42],
  iconAnchor: [17, 40],
  popupAnchor: [0, -38]
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
