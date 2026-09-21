import { Component, ViewChild } from '@angular/core';
import { MapaLoteComponent } from './components/mapa-lote/mapa-lote.component';
import { BuscadorUbicacionComponent } from './components/buscador-ubicacion/buscador-ubicacion.component';
import { FichaLoteComponent } from './components/ficha-lote/ficha-lote.component';
import { LoteService } from './services/lote.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MapaLoteComponent, BuscadorUbicacionComponent, FichaLoteComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  @ViewChild(MapaLoteComponent) mapaComponent!: MapaLoteComponent;

  constructor(private loteService: LoteService) {}

  onUbicacionSeleccionada(coords: { lat: number; lng: number }): void {
    this.loteService.consultarPorCoordenadas(coords.lat, coords.lng);
  }
}
