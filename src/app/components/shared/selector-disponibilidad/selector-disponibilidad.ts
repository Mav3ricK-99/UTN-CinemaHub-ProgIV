import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import { SelectButton } from 'primeng/selectbutton';

/** Envuelve el SelectButton de PrimeNG para usarlo con `[formField]`. */
@Component({
  selector: 'app-selector-disponibilidad',
  imports: [SelectButton, FormsModule],
  templateUrl: './selector-disponibilidad.html',
})
export class SelectorDisponibilidad implements FormValueControl<boolean> {
  readonly value = model(true);
  readonly touched = model(false);
  readonly disabled = input(false);

  protected readonly opciones = [
    { etiqueta: 'Hay stock', valor: true },
    { etiqueta: 'No hay stock', valor: false },
  ];
}
