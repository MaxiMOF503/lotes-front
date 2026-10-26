import { AfterViewInit, Directive, ElementRef, HostListener, OnDestroy, inject } from '@angular/core';

const FOCALIZABLES = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Manejo de foco de un diálogo modal: al abrirse el foco pasa a su primer control (la opción menos destructiva va primera),
 * Tab y Shift+Tab no salen del diálogo y, al cerrarse, el foco vuelve al control que lo abrió.
 * El cierre con Escape lo resuelve cada pantalla, porque cada una decide cuándo se puede cancelar.
 */
@Directive({ selector: '[appFocoModal]', standalone: true })
export class FocoModalDirective implements AfterViewInit, OnDestroy {
  private elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private previo = document.activeElement as HTMLElement | null;

  ngAfterViewInit(): void {
    if (!this.elemento.hasAttribute('tabindex')) this.elemento.setAttribute('tabindex', '-1');
    (this.controles()[0] ?? this.elemento).focus({ preventScroll: true });
  }

  ngOnDestroy(): void {
    if (this.previo?.isConnected) this.previo.focus({ preventScroll: true });
  }

  @HostListener('keydown', ['$event'])
  atraparTab(evento: KeyboardEvent): void {
    if (evento.key !== 'Tab') return;
    const controles = this.controles();
    if (!controles.length) { evento.preventDefault(); return; }
    const primero = controles[0], ultimo = controles[controles.length - 1];
    const activo = document.activeElement;
    if (evento.shiftKey && (activo === primero || activo === this.elemento)) { evento.preventDefault(); ultimo.focus(); }
    else if (!evento.shiftKey && (activo === ultimo || activo === this.elemento)) { evento.preventDefault(); primero.focus(); }
  }

  private controles(): HTMLElement[] {
    return Array.from(this.elemento.querySelectorAll<HTMLElement>(FOCALIZABLES));
  }
}
