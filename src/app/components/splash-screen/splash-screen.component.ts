import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Pantalla de bienvenida: muestra una imagen a pantalla completa cortada en
 * franjas diagonales que, tras `duracionMs`, se deslizan hacia los costados
 * dejando ver la aplicación real debajo.
 *
 * El mecanismo (franjas, dirección, timing) es independiente del contenido
 * (imagen, duración): si el día de mañana cambia el nombre del proyecto o
 * la imagen, alcanza con reemplazar el archivo en assets/ o pasar otro
 * @Input(), sin tocar la animación.
 */
@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash-screen.component.html',
  styleUrl: './splash-screen.component.css'
})
export class SplashScreenComponent implements OnInit, OnDestroy {
  @Input() imagenFondo = 'assets/splash-lotes-seguro.jpg';
  @Input() duracionMs = 1800;
  @Output() finalizado = new EventEmitter<void>();

  revelando = false;
  oculto = false;

  private timerRevelar?: ReturnType<typeof setTimeout>;
  private timerOcultar?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    const prefiereMenosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const espera = prefiereMenosMovimiento ? 0 : this.duracionMs;
    const duracionTransicion = prefiereMenosMovimiento ? 0 : 700;

    this.timerRevelar = setTimeout(() => {
      this.revelando = true;
      this.timerOcultar = setTimeout(() => {
        this.oculto = true;
        this.finalizado.emit();
      }, duracionTransicion + 400);
    }, espera);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timerRevelar);
    clearTimeout(this.timerOcultar);
  }
}
