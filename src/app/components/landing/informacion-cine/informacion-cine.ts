import { Component, effect, signal } from '@angular/core';

const INTERVALO_TEXTO_MS = 2500;

@Component({
  selector: 'app-informacion-cine',
  templateUrl: './informacion-cine.html',
})
export class InformacionCine {
  protected readonly nombreCine = 'CinemaHub';
  protected readonly telefono = '(011) 4555-0123';
  protected readonly horarios = [
    { dias: 'Lunes a Viernes y Domingos', horas: '15 a 22 hs' },
    { dias: 'Sábados', horas: '15 a 00 hs' },
  ];
  protected readonly servicios = ['Confitería', '7 salas de cine', 'Cine 4D y 5D', 'Descuentos'];

  protected readonly servicioActual = signal(0);

  constructor() {
    effect((alLimpiar) => {
      const temporizador = setInterval(
        () => this.servicioActual.update((indice) => (indice + 1) % this.servicios.length),
        INTERVALO_TEXTO_MS,
      );
      alLimpiar(() => clearInterval(temporizador));
    });
  }

  /** Devuelve las clases de posición del texto según su lugar en la rotación. */
  protected clasesServicio(indice: number): string {
    const actual = this.servicioActual();
    if (indice === actual) return 'translate-y-0 opacity-100';
    const anterior = (actual - 1 + this.servicios.length) % this.servicios.length;
    return indice === anterior ? '-translate-y-full opacity-0' : 'translate-y-full opacity-0';
  }
}
