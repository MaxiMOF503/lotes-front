import { CommonModule } from '@angular/common';
import { AdminComponent } from './components/admin/admin.component';
import { ApiService } from './services/api.service';
import { Component, ViewChild } from '@angular/core';
import { MapaLoteComponent } from './components/mapa-lote/mapa-lote.component';
import { BuscadorUbicacionComponent } from './components/buscador-ubicacion/buscador-ubicacion.component';
import { FichaLoteComponent } from './components/ficha-lote/ficha-lote.component';
import { SplashScreenComponent } from './components/splash-screen/splash-screen.component';
import { LoteService } from './services/lote.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AdminComponent, MapaLoteComponent, BuscadorUbicacionComponent, FichaLoteComponent, SplashScreenComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  @ViewChild(MapaLoteComponent) mapaComponent!: MapaLoteComponent;

  administracion=false;
  constructor(private loteService: LoteService,api:ApiService) {
    api.write('POST','/public/v1/visitas').catch(()=>{});
  }

  onUbicacionSeleccionada(coords: { lat: number; lng: number }): void {
    this.loteService.consultarPorCoordenadas(coords.lat, coords.lng);
  }
}
