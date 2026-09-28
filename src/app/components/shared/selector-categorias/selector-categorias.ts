import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import { MultiSelect } from 'primeng/multiselect';

import { Categoria } from '../../../classes/categoria';

/** Envuelve el MultiSelect de PrimeNG para usarlo con `[formField]`. */
@Component({
  selector: 'app-selector-categorias',
  imports: [MultiSelect, FormsModule],
  templateUrl: './selector-categorias.html',
})
export class SelectorCategorias implements FormValueControl<Categoria[]> {
  readonly value = model<Categoria[]>([]);
  readonly touched = model(false);
  readonly disabled = input(false);
  readonly opciones = input.required<Categoria[]>();
}
