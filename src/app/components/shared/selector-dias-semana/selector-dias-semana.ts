import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import { SelectButton } from 'primeng/selectbutton';

interface OpcionDiaSemana {
  etiqueta: string;
  valor: number;
}

const OPCIONES_DIAS_SEMANA: OpcionDiaSemana[] = [
  { etiqueta: 'Lun', valor: 1 },
  { etiqueta: 'Mar', valor: 2 },
  { etiqueta: 'Mié', valor: 3 },
  { etiqueta: 'Jue', valor: 4 },
  { etiqueta: 'Vie', valor: 5 },
  { etiqueta: 'Sáb', valor: 6 },
  { etiqueta: 'Dom', valor: 7 },
];

/** Envuelve el SelectButton de PrimeNG en modo múltiple para usarlo con `[formField]`. */
@Component({
  selector: 'app-selector-dias-semana',
  imports: [SelectButton, FormsModule],
  templateUrl: './selector-dias-semana.html',
})
export class SelectorDiasSemana implements FormValueControl<number[]> {
  readonly value = model<number[]>([]);
  readonly touched = model(false);
  readonly disabled = input(false);

  protected readonly opciones = OPCIONES_DIAS_SEMANA;
}
