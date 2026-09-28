import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import { SelectButton } from 'primeng/selectbutton';

import { FormatoPelicula } from '../../../classes/pelicula';

const OPCIONES_FORMATO: { etiqueta: string; valor: FormatoPelicula }[] = [
  { etiqueta: '2D', valor: '2D' },
  { etiqueta: '3D', valor: '3D' },
  { etiqueta: '4D', valor: '4D' },
  { etiqueta: '5D', valor: '5D' },
];

/** Envuelve el SelectButton de PrimeNG para usarlo con `[formField]`. */
@Component({
  selector: 'app-selector-formato',
  imports: [SelectButton, FormsModule],
  templateUrl: './selector-formato.html',
})
export class SelectorFormato implements FormValueControl<FormatoPelicula | null> {
  readonly value = model<FormatoPelicula | null>(null);
  readonly touched = model(false);
  readonly disabled = input(false);

  protected readonly opciones = OPCIONES_FORMATO;
}
