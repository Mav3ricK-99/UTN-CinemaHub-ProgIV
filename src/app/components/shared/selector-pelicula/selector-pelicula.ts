import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import { Select } from 'primeng/select';

import { Pelicula } from '../../../classes/pelicula';
import { obtenerIconoCategoria } from './iconos-categoria';

/** Envuelve el Select de PrimeNG para usarlo con `[formField]`. */
@Component({
  selector: 'app-selector-pelicula',
  imports: [Select, FormsModule],
  templateUrl: './selector-pelicula.html',
})
export class SelectorPelicula implements FormValueControl<Pelicula | null> {
  readonly value = model<Pelicula | null>(null);
  readonly touched = model(false);
  readonly disabled = input(false);
  readonly opciones = input.required<Pelicula[]>();

  protected icono(pelicula: Pelicula): string {
    return obtenerIconoCategoria(pelicula.categorias);
  }
}
