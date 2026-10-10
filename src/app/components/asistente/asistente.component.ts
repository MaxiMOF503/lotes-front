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
  private recorridoActivo = false;
  private frame?: number;
  private inicioPaso?: ReturnType<typeof setTimeout>;
  private focoAnterior: HTMLElement | null = null;
  private fondos: Array<{ elemento: HTMLElement; inert: boolean }> = [];
  private ultimoToqueY = 0;

  private bloquearRueda = (evento: WheelEvent): void => {
    if (!this.puedeDesplazarTarjeta(evento.target, evento.deltaY) || evento.ctrlKey) evento.preventDefault();
  };
  private iniciarToque = (evento: TouchEvent): void => {
    this.ultimoToqueY = evento.touches[0]?.clientY ?? 0;
  };
  private bloquearToque = (evento: TouchEvent): void => {
    const y = evento.touches[0]?.clientY ?? this.ultimoToqueY;
    const delta = this.ultimoToqueY - y;
    this.ultimoToqueY = y;
    if (evento.touches.length !== 1 || !this.puedeDesplazarTarjeta(evento.target, delta)) evento.preventDefault();
  };
  private bloquearTecla = (evento: KeyboardEvent): void => {
    const tarjeta = document.querySelector<HTMLElement>('.intro-tarjeta');
    if (evento.key === 'Escape') { evento.preventDefault(); this.omitir(); return; }
    if (evento.key === 'Tab' && tarjeta) {
      const botones = Array.from(tarjeta.querySelectorAll<HTMLButtonElement>('button'));
      const primero = botones[0], ultimo = botones[botones.length - 1];
      if (evento.shiftKey && (document.activeElement === primero || document.activeElement === tarjeta)) {
        evento.preventDefault(); ultimo?.focus({ preventScroll: true });
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault(); primero?.focus({ preventScroll: true });
      }
    }
    const direcciones: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, ArrowLeft: -1,
      ArrowRight: 1, PageDown: 1, PageUp: -1, Home: -1, End: 1, ' ': evento.shiftKey ? -1 : 1 };
    if (!(evento.key in direcciones)) return;
    // Espacio activa los botones; Enter y Tab mantienen su comportamiento accesible.
    if (evento.key === ' ' && evento.target instanceof Element && evento.target.closest('.intro-tarjeta button')) return;
    if (!this.puedeDesplazarTarjeta(evento.target, direcciones[evento.key])) evento.preventDefault();
  };

  private puedeDesplazarTarjeta(target: EventTarget | null, delta: number): boolean {
    const tarjeta = target instanceof Element ? target.closest<HTMLElement>('.intro-tarjeta') : null;
    if (!tarjeta || delta === 0) return false;
    return delta < 0 ? tarjeta.scrollTop > 0 : tarjeta.scrollTop + tarjeta.clientHeight < tarjeta.scrollHeight - 1;
  }

  private bloquearInteracciones(): void {
    if (this.recorridoActivo) return;
    this.recorridoActivo = true;
    this.focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.fondos = Array.from(document.querySelectorAll<HTMLElement>('header, main, footer')).map(elemento => ({ elemento, inert: elemento.inert }));
    this.fondos.forEach(({ elemento }) => elemento.inert = true);
    document.addEventListener('wheel', this.bloquearRueda, { capture: true, passive: false });
    document.addEventListener('touchstart', this.iniciarToque, { capture: true, passive: true });
    document.addEventListener('touchmove', this.bloquearToque, { capture: true, passive: false });
    document.addEventListener('keydown', this.bloquearTecla, true);
    this.asistente.bloquearInteracciones(true);
    const seguirElemento = () => {
      if (!this.recorridoActivo) return;
      this.actualizarPosicion();
      this.frame = requestAnimationFrame(seguirElemento);
    };
    this.frame = requestAnimationFrame(seguirElemento);
  }

  private restaurarInteracciones(): void {
    if (!this.recorridoActivo) return;
    this.recorridoActivo = false;
    if (this.inicioPaso) clearTimeout(this.inicioPaso);
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    document.removeEventListener('wheel', this.bloquearRueda, true);
    document.removeEventListener('touchstart', this.iniciarToque, true);
    document.removeEventListener('touchmove', this.bloquearToque, true);
    document.removeEventListener('keydown', this.bloquearTecla, true);
    this.fondos.forEach(({ elemento, inert }) => elemento.inert = inert);
    this.fondos = [];
    this.asistente.bloquearInteracciones(false);
    if (this.focoAnterior?.isConnected) this.focoAnterior.focus({ preventScroll: true });
    this.focoAnterior = null;
  }

  ngAfterViewInit(): void {
    this.heroEl = document.querySelector('.hero');
    this.actualizarPinFijo();

    // La intro espera a que termine el splash: recién ahí se posiciona sobre el pin real.
    this.suscripcion = combineLatest([this.estado$, this.paginaLista$]).subscribe(([estado, lista]) => {
      if (estado === 'activo') {
        this.restaurarInteracciones();
        this.introYaPosicionada = false;
      }
      if (estado === 'intro' && lista && !this.introYaPosicionada) {
        this.introYaPosicionada = true;
        this.paso = 0;
        this.bloquearInteracciones();
        this.inicioPaso = setTimeout(() => {
          this.posicionarPaso();
          document.querySelector<HTMLElement>('.intro-tarjeta')?.focus({ preventScroll: true });
        }, 50);
      }
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.restaurarInteracciones();
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

  anterior(): void {
    if (this.paso > 0) {
      this.paso--;
      this.posicionarPaso();
    }
  }

  abrirIntro(): void {
    this.asistente.abrirIntro();
  }

  omitir(): void {
    this.ventanaFoco = null;
    this.asistente.cerrarIntro();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.recorridoActivo) this.posicionarPaso();
  }

  private posicionarPaso(): void {
    if (!this.recorridoActivo) return;
    const selector = this.pasos[this.paso].selector;
    const el = selector ? document.querySelector(selector) : null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.actualizarPosicion();
  }

  private actualizarPosicion(): void {
    const def = this.pasos[this.paso];
    const el = def.selector ? document.querySelector(def.selector) : null;

    if (!el) {
      this.posicionTarjeta = { top: '50%', left: '50%' };
      this.ventanaFoco = null;
      return;
    }

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
      const tarjeta = document.querySelector<HTMLElement>('.intro-tarjeta');
      const ancho = tarjeta?.offsetWidth ?? 320;
      let left = rect.left + rect.width / 2 - ancho / 2;
      left = Math.min(Math.max(left, 16), window.innerWidth - ancho - 16);
      this.posicionTarjeta = { top: `${top}px`, left: `${left}px` };
  }
}
