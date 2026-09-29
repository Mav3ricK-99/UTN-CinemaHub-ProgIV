import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import { SelectButton } from 'primeng/selectbutton';

import { Clasificacion } from '../../../classes/clasificacion';

/** Envuelve el SelectButton de PrimeNG para usarlo con `[formField]`. */
@Component({
  selector: 'app-selector-clasificacion',
  imports: [SelectButton, FormsModule],
  templateUrl: './selector-clasificacion.html',
})
export class SelectorClasificacion implements FormValueControl<Clasificacion | null> {
  readonly value = model<Clasificacion | null>(null);
  readonly touched = model(false);
  readonly disabled = input(false);
  readonly opciones = input.required<Clasificacion[]>();
}
