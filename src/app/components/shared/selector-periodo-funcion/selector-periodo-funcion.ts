import { Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import { DatePicker } from 'primeng/datepicker';

export interface PeriodoFuncion {
  fechaDesde: Date | null;
  fechaHasta: Date | null;
  horario: string | null;
}

function formatearHora(fecha: Date): string {
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}

function obtenerMinDate(): Date {
  const mañana = new Date();
  mañana.setHours(0, 0, 0, 0);
  mañana.setDate(mañana.getDate() + 1);
  return mañana;
}

/** Selecciona el rango de fechas y el horario en que se repetirá la función. */
@Component({
  selector: 'app-selector-periodo-funcion',
  imports: [DatePicker, FormsModule],
  templateUrl: './selector-periodo-funcion.html',
})
export class SelectorPeriodoFuncion implements FormValueControl<PeriodoFuncion> {
  readonly value = model<PeriodoFuncion>({ fechaDesde: null, fechaHasta: null, horario: null });
  readonly touched = model(false);
  readonly disabled = input(false);

  protected readonly minDate = obtenerMinDate();

  /**
   * Mientras el rango está incompleto, el segundo valor debe seguir siendo `null` (no
   * `fechaDesde`): si se le refleja al DatePicker un rango ya "cerrado" tras el primer
   * click, este entiende que la selección terminó y arranca un rango nuevo en el segundo.
   */
  protected readonly rango = computed<(Date | null)[] | null>(() => {
    const { fechaDesde, fechaHasta } = this.value();
    return fechaDesde || fechaHasta ? [fechaDesde, fechaHasta] : null;
  });

  protected readonly horaSeleccionada = computed<Date | null>(() => {
    const horario = this.value().horario;
    if (!horario) return null;

    const [horas, minutos] = horario.split(':').map(Number);
    const fecha = new Date();
    fecha.setHours(horas, minutos, 0, 0);
    return fecha;
  });

  protected alCambiarRango(rango: (Date | null)[] | null): void {
    const [fechaDesde, fechaHasta] = rango ?? [null, null];
    this.value.update((actual) => ({ ...actual, fechaDesde: fechaDesde ?? null, fechaHasta: fechaHasta ?? null }));
  }

  protected alCambiarHorario(fecha: unknown): void {
    this.value.update((actual) => ({ ...actual, horario: fecha instanceof Date ? formatearHora(fecha) : null }));
  }
}
