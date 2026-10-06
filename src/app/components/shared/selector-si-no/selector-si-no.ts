import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import { SelectButton } from 'primeng/selectbutton';

/** Envuelve el SelectButton de PrimeNG con las opciones Sí / No para usarlo con `[formField]`. */
@Component({
  selector: 'app-selector-si-no',
  imports: [SelectButton, FormsModule],
  templateUrl: './selector-si-no.html',
})
export class SelectorSiNo implements FormValueControl<boolean> {
  readonly value = model(false);
  readonly touched = model(false);
  readonly disabled = input(false);

  protected readonly opciones = [
    { etiqueta: 'Sí', valor: true },
    { etiqueta: 'No', valor: false },
  ];
}
