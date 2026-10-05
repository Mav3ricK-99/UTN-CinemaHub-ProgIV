import { FieldValidator, PathKind } from '@angular/forms/signals';

import { PeriodoFuncion } from '../../../../shared/selector-periodo-funcion/selector-periodo-funcion';

const PRECIO_MINIMO = 1000;
const PUNTOS_MINIMO = 1;

export function alMenosUnDia(): FieldValidator<number[], PathKind.Child> {
  return ({ value }) => {
    if (value().length > 0) return null;
    return { kind: 'diaRequerido', message: 'Seleccioná al menos un día de la semana.' };
  };
}

export function periodoCompleto(): FieldValidator<PeriodoFuncion, PathKind.Child> {
  return ({ value }) => {
    const { fechaDesde, fechaHasta, horario } = value();

    if (!fechaDesde || !fechaHasta) {
      return { kind: 'periodoIncompleto', message: 'Seleccioná el rango de fechas.' };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fechaDesde.getTime() <= hoy.getTime()) {
      return { kind: 'fechaDesdeInvalida', message: 'La fecha de inicio debe ser posterior al día de hoy.' };
    }

    if (!horario) {
      return { kind: 'horarioRequerido', message: 'Ingresá el horario de la función.' };
    }
    if (fechaHasta.getTime() < fechaDesde.getTime()) {
      return { kind: 'rangoInvalido', message: 'La fecha de fin no puede ser anterior a la fecha de inicio.' };
    }
    return null;
  };
}

export function precioValido(): FieldValidator<number | null, PathKind.Child> {
  return ({ value }) => {
    const precio = value();
    if (precio !== null && precio > PRECIO_MINIMO) return null;
    return { kind: 'precioInvalido', message: `El precio debe ser mayor a $${PRECIO_MINIMO}.` };
  };
}

export function puntosValidos(): FieldValidator<number | null, PathKind.Child> {
  return ({ value }) => {
    const puntos = value();
    if (puntos !== null && Number.isInteger(puntos) && puntos >= PUNTOS_MINIMO) return null;
    return { kind: 'puntosInvalidos', message: `Los puntos deben ser un entero de al menos ${PUNTOS_MINIMO}.` };
  };
}
