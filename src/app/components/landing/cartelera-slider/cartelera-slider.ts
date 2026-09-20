import { DatePipe } from '@angular/common';
import { Component, effect, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { estaAgotada, Funcion } from '../../../classes/funcion';

const INTERVALO_AUTOAVANCE_MS = 7000;

@Component({
  selector: 'app-cartelera-slider',
  imports: [DatePipe, RouterLink],
  templateUrl: './cartelera-slider.html',
})
export class CarteleraSlider {
  readonly funciones = input.required<Funcion[]>();

  protected readonly indiceActual = signal(0);
  private readonly pausado = signal(false);

  constructor() {
    effect((alLimpiar) => {
      // Leer el índice reinicia el temporizador después de un cambio manual.
      this.indiceActual();
      if (this.pausado() || this.funciones().length < 2) return;

      const temporizador = setInterval(() => this.siguiente(), INTERVALO_AUTOAVANCE_MS);
      alLimpiar(() => clearInterval(temporizador));
    });
  }

  protected readonly estaAgotada = estaAgotada;

  protected siguiente(): void {
    this.indiceActual.update((indice) => (indice + 1) % this.funciones().length);
  }

  protected anterior(): void {
    const total = this.funciones().length;
    this.indiceActual.update((indice) => (indice - 1 + total) % total);
  }

  protected irA(indice: number): void {
    this.indiceActual.set(indice);
  }

  protected pausar(): void {
    this.pausado.set(true);
  }

  protected reanudar(): void {
    this.pausado.set(false);
  }
}
