import { CurrencyPipe } from '@angular/common';
import { Component, computed, input, model } from '@angular/core';

import { Articulo } from '../../../classes/articulo';

const IMAGEN_ARTICULO_PLACEHOLDER = '/img/articulo-placeholder.svg';
const CANTIDAD_MAXIMA_ARTICULOS = 6;

@Component({
  selector: 'app-carrousel-articulos',
  imports: [CurrencyPipe],
  templateUrl: './carrousel-articulos.html',
})
export class CarrouselArticulos {
  readonly articulos = input.required<Articulo[]>();
  readonly articulosSeleccionados = model<Articulo[]>([]);

  protected readonly imagenPlaceholder = IMAGEN_ARTICULO_PLACEHOLDER;
  protected readonly articulosMostrados = computed(() => this.articulos().slice(0, CANTIDAD_MAXIMA_ARTICULOS));

  protected estaSeleccionado(articulo: Articulo): boolean {
    return this.articulosSeleccionados().some((seleccionado) => seleccionado.id === articulo.id);
  }

  protected alternarArticulo(articulo: Articulo): void {
    this.articulosSeleccionados.update((seleccionados) =>
      seleccionados.some((seleccionado) => seleccionado.id === articulo.id)
        ? seleccionados.filter((seleccionado) => seleccionado.id !== articulo.id)
        : [...seleccionados, articulo],
    );
  }
}
