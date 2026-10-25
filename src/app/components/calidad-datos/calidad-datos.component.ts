import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FuenteTerritorial } from '../../models/territorio.model';
import { ApiService } from '../../services/api.service';
import { TerritorioService } from '../../services/territorio.service';
import { EstadoOperacionComponent } from '../estado-operacion/estado-operacion.component';

interface CapaEsperada {
  id: string;
  nombre: string;
  organismo: string;
  descripcion: string;
  icono: string;
}

@Component({
  selector: 'app-calidad-datos',
  standalone: true,
  imports: [CommonModule, EstadoOperacionComponent],
  templateUrl: './calidad-datos.component.html',
  styleUrl: './calidad-datos.component.css'
})
export class CalidadDatosComponent implements OnInit {
  private territorio = inject(TerritorioService);
  private api = inject(ApiService);
  private cd = inject(ChangeDetectorRef);

  readonly capas: CapaEsperada[] = [
    { id: 'catastro', nombre: 'Catastro parcelario', organismo: 'Municipalidad de Luján de Cuyo', descripcion: 'Parcelas, superficie y zonificación publicadas.', icono: '⌖' },
    { id: 'aysam', nombre: 'Cobertura de agua · AYSAM', organismo: 'AYSAM', descripcion: 'Radio general de cobertura publicado.', icono: '◒' },
    { id: 'aguas_lujan', nombre: 'Cobertura de agua · Aguas Luján', organismo: 'Aguas Luján', descripcion: 'Radio municipal complementario de servicio.', icono: '◓' },
    { id: 'electricidad', nombre: 'Infraestructura eléctrica', organismo: 'EDEMSA', descripcion: 'Trazas eléctricas abiertas recortadas al departamento.', icono: 'ϟ' }
  ];

  fuentes: FuenteTerritorial[] = [];
  cargando = false;
  error = '';

  ngOnInit(): void { void this.cargar(); }

  async cargar(): Promise<void> {
    if (this.cargando) return;
    this.cargando = true;
    this.error = '';
    try {
      this.fuentes = await firstValueFrom(this.territorio.fuentes());
    } catch (error) {
      this.error = this.api.error(error);
    } finally {
      this.cargando = false;
      this.cd.markForCheck();
    }
  }

  fuente(capa: CapaEsperada): FuenteTerritorial | undefined {
    return this.fuentes.find(fuente => fuente.capa === capa.id);
  }

  get disponibles(): number { return this.capas.filter(capa => this.fuente(capa)).length; }
  get totalRegistros(): number { return this.fuentes.reduce((total, fuente) => total + fuente.registros, 0); }
  get totalExcluidos(): number { return this.fuentes.reduce((total, fuente) => total + fuente.invalidos + fuente.sinGeometria, 0); }

  fechaImportacion(fuente: FuenteTerritorial): Date | null {
    const fecha = new Date(fuente.importadoEn.replace(' ', 'T'));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  desactualizada(fuente: FuenteTerritorial): boolean {
    const fecha = this.fechaImportacion(fuente);
    if (!fecha) return true;
    const limite = new Date();
    limite.setMonth(limite.getMonth() - 6);
    return fecha < limite;
  }

  enlaceSeguro(fuente: FuenteTerritorial): string | null {
    try {
      const url = new URL(fuente.url);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
    } catch { return null; }
  }
}
