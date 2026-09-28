import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import { SelectButton } from 'primeng/selectbutton';

import { IdiomaPelicula } from '../../../classes/pelicula';

const OPCIONES_IDIOMA: { etiqueta: string; valor: IdiomaPelicula }[] = [
  { etiqueta: 'Castellano', valor: 'Castellano' },
  { etiqueta: 'Subtitulada', valor: 'Subtitulada' },
];

/** Envuelve el SelectButton de PrimeNG para usarlo con `[formField]`. */
@Component({
  selector: 'app-selector-idioma',
  imports: [SelectButton, FormsModule],
  templateUrl: './selector-idioma.html',
})
export class SelectorIdioma implements FormValueControl<IdiomaPelicula | null> {
  readonly value = model<IdiomaPelicula | null>(null);
  readonly touched = model(false);
  readonly disabled = input(false);

  protected readonly opciones = OPCIONES_IDIOMA;
}
