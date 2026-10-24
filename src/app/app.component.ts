import { CommonModule } from '@angular/common';
import { AdminComponent } from './components/admin/admin.component';
import { ApiService } from './services/api.service';
import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { MapaLoteComponent } from './components/mapa-lote/mapa-lote.component';
import { BuscadorUbicacionComponent } from './components/buscador-ubicacion/buscador-ubicacion.component';
import { FichaLoteComponent } from './components/ficha-lote/ficha-lote.component';
import { SplashScreenComponent } from './components/splash-screen/splash-screen.component';
import { AsistenteComponent } from './components/asistente/asistente.component';
import { AsistenteService } from './services/asistente.service';
import { TerritorioService } from './services/territorio.service';
import { SesionService } from './services/sesion.service';
import { SesionUsuario } from './models/admin.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AdminComponent, MapaLoteComponent, BuscadorUbicacionComponent, FichaLoteComponent, SplashScreenComponent, AsistenteComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {

  @ViewChild(MapaLoteComponent) mapaComponent!: MapaLoteComponent;
  @ViewChild(AdminComponent) adminComponent?: AdminComponent;

  puntoMapa:{latitud:number;longitud:number}|null=null;
  administracion=false;
  menuAbierto=false;
  sesion: SesionUsuario | null = null;

  constructor(private api:ApiService,private asistente:AsistenteService,private sesionService:SesionService, private territorio:TerritorioService) {
    api.write('POST','/public/v1/visitas').catch(()=>{});
  }

  ngOnInit(): void {
    this.sesionService.sesion$.subscribe(s => this.sesion = s);
    this.sesionService.cargar().catch(()=>{});
  }

  get esAdmin(): boolean {
    return this.sesion?.rol === 'ADMIN';
  }

  alternarMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  @HostListener('document:keydown.escape')
  cerrarMenuConEscape(): void {
    this.cerrarMenu();
  }

  irAConsultaPublica(): void {
    this.cerrarMenu();
    if(this.adminComponent)this.adminComponent.confirmarNavegacion(()=>{this.administracion=false;});
    else this.administracion=false;
  }

  irAAreaInterna(): void {
    this.cerrarMenu();
    this.administracion=true;
  }

  async cerrarSesionDesdeNav(): Promise<void> {
    this.cerrarMenu();
    await this.sesionService.salir();
    this.administracion=false;
  }

  abrirMapa(punto:{latitud:number;longitud:number}|null): void {
    this.puntoMapa=punto;
    this.administracion=false;
    if(punto){
      this.territorio.limpiar();
      this.territorio.consultar(punto.latitud,punto.longitud);
    }
  }

  onUbicacionSeleccionada(coords: { lat: number; lng: number }): void {
    this.territorio.limpiar();
    this.territorio.consultar(coords.lat, coords.lng);
  }

  onSplashFinalizado(): void {
    this.asistente.marcarPaginaLista();
  }
}
