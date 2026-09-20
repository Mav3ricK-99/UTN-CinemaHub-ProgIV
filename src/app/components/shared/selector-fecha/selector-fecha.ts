import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import { DatePicker } from 'primeng/datepicker';

/**
 * Envuelve el DatePicker de PrimeNG para usarlo con `[formField]`.
 * PrimeNG declara un input `pattern` de tipo distinto al que Signal Forms espera, por eso no se enlaza directo.
 */
@Component({
  selector: 'app-selector-fecha',
  imports: [DatePicker, FormsModule],
  templateUrl: './selector-fecha.html',
})
export class SelectorFecha implements FormValueControl<Date | null> {
  readonly value = model<Date | null>(null);
  readonly touched = model(false);
  readonly disabled = input(false);

  readonly inputId = input<string>();
  readonly placeholder = input('dd/mm/aaaa');
  readonly minDate = input<Date>();
  readonly maxDate = input<Date>();
  readonly fechaInicial = input<Date>();

  protected alCambiarFecha(fecha: unknown): void {
    this.value.set(fecha instanceof Date ? fecha : null);
  }
}
