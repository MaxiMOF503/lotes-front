import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, HostListener, OnDestroy, inject } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { AsistenteService } from '../../services/asistente.service';

interface PasoIntro {
  titulo: string;
  texto: string;
  /** Selector del elemento real al que apunta este paso (null = el pin de la portada). */
  selector: string | null;
  /** El pin es una forma irregular (gota): el resaltado va redondeado, no en rectángulo. */
  circular?: boolean;
}

const PASOS: PasoIntro[] = [
  {
    titulo: '¡Hola! Soy tu guía territorial',
    texto: 'Te muestro cómo consultar el estado de un lote antes de avanzar con cualquier operación.',
    selector: '.hero-visual .map-pin',
    circular: true
  },
  {
    titulo: 'Buscá por identificador o coordenadas',
    texto: 'Escribí acá el identificador del lote, o elegí buscar por coordenadas exactas.',
    selector: '.buscador'
  },
  {
    titulo: 'O elegí un punto en el mapa',
    texto: 'Hacé clic directo sobre el mapa para consultar ese lugar.',
    selector: '.map-frame'
  },
  {
    titulo: 'Acá vas a ver el resultado',
    texto: 'La ficha muestra los datos del lote y, en cada sección, de dónde salió esa información.',
    selector: '.record-column'
  }
];


/**
 * Pin-asistente: una introducción guiada que señala, en la página real, el
 * pin de la portada, el buscador, el mapa y el panel de resultado (una sola
 * vez, persistida en localStorage). Después queda como ícono fijo en la
 * esquina inferior izquierda —recién visible al scrollear más allá de la
 * portada—, que cambia brevemente a su versión "buscando" cuando el
 * buscador o el mapa disparan una consulta.
 */
@Component({
  selector: 'app-asistente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './asistente.component.html',
  styleUrl: './asistente.component.css'
})
export class AsistenteComponent implements AfterViewInit, OnDestroy {
  private asistente = inject(AsistenteService);

  readonly estado$ = this.asistente.estado$;
  readonly buscando$ = this.asistente.buscando$;
  readonly paginaLista$ = this.asistente.paginaLista$;
  readonly pasos = PASOS;

  paso = 0;
  posicionTarjeta: { top: string; left: string } = { top: '0', left: '0' };
  ventanaFoco: { top: string; left: string; width: string; height: string; radius: string } | null = null;
  mostrarPinFijo = false;

  private suscripcion?: Subscription;
  private introYaPosicionada = false;
  private heroEl: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.heroEl = document.querySelector('.hero');
    this.actualizarPinFijo();

    // La intro espera a que termine el splash: recién ahí se posiciona sobre el pin real.
    this.suscripcion = combineLatest([this.estado$, this.paginaLista$]).subscribe(([estado, lista]) => {
      if (estado === 'intro' && lista && !this.introYaPosicionada) {
        this.introYaPosicionada = true;
        this.paso = 0;
        setTimeout(() => this.posicionarPaso(), 50);
      }
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  /** Pin chico recién visible una vez pasado el 50% de la portada. */
  @HostListener('window:scroll')
  actualizarPinFijo(): void {
    if (!this.heroEl) {
      this.mostrarPinFijo = true;
      return;
    }
    this.mostrarPinFijo = window.scrollY > this.heroEl.offsetHeight * 0.5;
  }

  siguiente(): void {
    if (this.paso < this.pasos.length - 1) {
      this.paso++;
      this.posicionarPaso();
    } else {
      this.ventanaFoco = null;
      this.asistente.cerrarIntro();
    }
  }

  omitir(): void {
    this.ventanaFoco = null;
    this.asistente.cerrarIntro();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.posicionarPaso();
  }

  private posicionarPaso(): void {
    const def = this.pasos[this.paso];
    const el = def.selector ? document.querySelector(def.selector) : null;

    if (!el) {
      this.posicionTarjeta = { top: '50%', left: '50%' };
      this.ventanaFoco = null;
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
      const rect = el.getBoundingClientRect();

      if (def.circular) {
        // Forma de gota: un círculo que la contenga entera, centrado en su medio.
        const pad = 10;
        const lado = Math.max(rect.width, rect.height) + pad * 2;
        this.ventanaFoco = {
          top: `${rect.top + rect.height / 2 - lado / 2}px`,
          left: `${rect.left + rect.width / 2 - lado / 2}px`,
          width: `${lado}px`,
          height: `${lado}px`,
          radius: '50%'
        };
      } else {
        const pad = 12;
        this.ventanaFoco = {
          top: `${rect.top - pad}px`,
          left: `${rect.left - pad}px`,
          width: `${rect.width + pad * 2}px`,
          height: `${rect.height + pad * 2}px`,
          radius: '18px'
        };
      }

      const debajo = rect.bottom + 260 < window.innerHeight;
      const top = debajo ? rect.bottom + 16 : Math.max(16, rect.top - 190);
      let left = rect.left + rect.width / 2 - 160;
      left = Math.min(Math.max(left, 16), window.innerWidth - 336);
      this.posicionTarjeta = { top: `${top}px`, left: `${left}px` };
    }, 380);
  }
}
