import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import { Select } from 'primeng/select';

import { CategoriaArticulo } from '../../../classes/categoria-articulo';

/** Envuelve el Select de PrimeNG para usarlo con `[formField]`. */
@Component({
  selector: 'app-selector-categoria-articulo',
  imports: [Select, FormsModule],
  templateUrl: './selector-categoria-articulo.html',
})
export class SelectorCategoriaArticulo implements FormValueControl<CategoriaArticulo | null> {
  readonly value = model<CategoriaArticulo | null>(null);
  readonly touched = model(false);
  readonly disabled = input(false);
  readonly opciones = input.required<CategoriaArticulo[]>();
}
