import { CurrencyPipe } from '@angular/common';
import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import { MultiSelect } from 'primeng/multiselect';

import { Articulo } from '../../../classes/articulo';

/** Envuelve el MultiSelect de PrimeNG para usarlo con `[formField]`. */
@Component({
  selector: 'app-selector-articulos',
  imports: [MultiSelect, FormsModule, CurrencyPipe],
  templateUrl: './selector-articulos.html',
})
export class SelectorArticulos implements FormValueControl<Articulo[]> {
  readonly value = model<Articulo[]>([]);
  readonly touched = model(false);
  readonly disabled = input(false);
  readonly opciones = input.required<Articulo[]>();
}
