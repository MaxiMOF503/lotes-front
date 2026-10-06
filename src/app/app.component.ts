import { CommonModule } from '@angular/common';
import { AdminComponent } from './components/admin/admin.component';
import { ApiService } from './services/api.service';
import { Component, ViewChild } from '@angular/core';
import { MapaLoteComponent } from './components/mapa-lote/mapa-lote.component';
import { BuscadorUbicacionComponent } from './components/buscador-ubicacion/buscador-ubicacion.component';
import { FichaLoteComponent } from './components/ficha-lote/ficha-lote.component';
import { SplashScreenComponent } from './components/splash-screen/splash-screen.component';
import { AsistenteComponent } from './components/asistente/asistente.component';
import { AsistenteService } from './services/asistente.service';
import { LoteService } from './services/lote.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AdminComponent, MapaLoteComponent, BuscadorUbicacionComponent, FichaLoteComponent, SplashScreenComponent, AsistenteComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  @ViewChild(MapaLoteComponent) mapaComponent!: MapaLoteComponent;
  @ViewChild(AdminComponent) adminComponent?: AdminComponent;

  administracion=false;
  constructor(private loteService: LoteService,api:ApiService,private asistente:AsistenteService) {
    api.write('POST','/public/v1/visitas').catch(()=>{});
  }

  irAConsultaPublica(): void {
    if(this.adminComponent)this.adminComponent.confirmarNavegacion(()=>{this.administracion=false;});
    else this.administracion=false;
  }

  onUbicacionSeleccionada(coords: { lat: number; lng: number }): void {
    this.loteService.consultarPorCoordenadas(coords.lat, coords.lng);
  }

  onSplashFinalizado(): void {
    this.asistente.marcarPaginaLista();
  }
}
