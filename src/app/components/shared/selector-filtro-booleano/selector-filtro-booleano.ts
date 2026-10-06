import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import { SelectButton } from 'primeng/selectbutton';

/** Filtro booleano de tres estados (Todos / Sí / No). `null` equivale a "Todos". */
@Component({
  selector: 'app-selector-filtro-booleano',
  imports: [SelectButton, FormsModule],
  templateUrl: './selector-filtro-booleano.html',
})
export class SelectorFiltroBooleano implements FormValueControl<boolean | null> {
  readonly value = model<boolean | null>(null);
  readonly touched = model(false);
  readonly disabled = input(false);

  protected readonly opciones = [
    { etiqueta: 'Todos', valor: null },
    { etiqueta: 'Sí', valor: true },
    { etiqueta: 'No', valor: false },
  ];
}
