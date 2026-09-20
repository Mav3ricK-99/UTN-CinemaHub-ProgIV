import { Directive, ElementRef, HostListener, DestroyRef, inject, input, signal, afterNextRender } from '@angular/core';

const DESPLAZAMIENTO_MAXIMO_PX = 160;

/**
 * Desplaza el elemento hacia arriba a medida que avanza el scroll.
 * El valor de entrada define la velocidad: a mayor valor, mayor desplazamiento.
 */
@Directive({
  selector: '[appParallax]',
  host: { '[style.transform]': 'transformacion()' },
})
export class Parallax {
  readonly velocidad = input(0.1, { alias: 'appParallax' });

  protected readonly transformacion = signal('translate3d(0, 0, 0)');

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private desplazamientoActual = 0;
  private frame = 0;

  constructor() {
    afterNextRender(() => this.actualizar());
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  protected alCambiarVista(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.actualizar();
    });
  }

  private actualizar(): void {
    // Quitar el desplazamiento actual para medir la posición original del elemento.
    const posicionOriginal = this.elemento.getBoundingClientRect().top - this.desplazamientoActual;
    const avance = Math.max(0, window.innerHeight - posicionOriginal);
    this.desplazamientoActual = -Math.min(avance * this.velocidad(), DESPLAZAMIENTO_MAXIMO_PX);
    this.transformacion.set(`translate3d(0, ${this.desplazamientoActual}px, 0)`);
  }
}
