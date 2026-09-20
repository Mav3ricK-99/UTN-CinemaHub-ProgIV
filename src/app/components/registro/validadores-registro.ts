import { FieldValidator, PathKind, SchemaPath, SchemaPathRules } from '@angular/forms/signals';

const LARGO_MINIMO_NOMBRE = 3;
const LARGO_MINIMO_CONTRASENA = 6;
const MAYUSCULAS_MINIMAS_CONTRASENA = 1;
const NUMEROS_MINIMOS_CONTRASENA = 2;
const EDAD_MINIMA = 18;
const EDAD_MAXIMA = 120;

export function nombreConLetrasMinimas(): FieldValidator<string, PathKind.Child> {
  return ({ value }) => {
    const texto = value().trim();
    if (texto.length === 0 || texto.length >= LARGO_MINIMO_NOMBRE) return null;
    return { kind: 'minLength', message: `El nombre debe tener al menos ${LARGO_MINIMO_NOMBRE} letras.` };
  };
}

export function contrasenaSegura(): FieldValidator<string, PathKind.Child> {
  return ({ value }) => {
    const contrasena = value();
    if (contrasena.length === 0) return null;

    const mayusculas = contrasena.match(/\p{Lu}/gu)?.length ?? 0;
    const numeros = contrasena.match(/\d/g)?.length ?? 0;
    const errores = [];

    if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
      errores.push({
        kind: 'contrasenaLargo',
        message: `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
      });
    }
    if (mayusculas < MAYUSCULAS_MINIMAS_CONTRASENA) {
      errores.push({ kind: 'contrasenaMayuscula', message: 'La contraseña debe tener al menos una mayúscula.' });
    }
    if (numeros < NUMEROS_MINIMOS_CONTRASENA) {
      errores.push({
        kind: 'contrasenaNumeros',
        message: `La contraseña debe tener al menos ${NUMEROS_MINIMOS_CONTRASENA} números.`,
      });
    }
    return errores;
  };
}

export function contrasenasCoinciden(
  rutaContrasena: SchemaPath<string, SchemaPathRules.Supported, PathKind.Child>,
): FieldValidator<string, PathKind.Child> {
  return ({ value, valueOf }) => {
    const repetida = value();
    if (repetida.length === 0 || repetida === valueOf(rutaContrasena)) return null;
    return { kind: 'contrasenasDistintas', message: 'Las contraseñas no coinciden.' };
  };
}

/** Calcula los años cumplidos a la fecha de `hoy`. */
export function calcularEdad(fechaNacimiento: Date, hoy = new Date()): number {
  const cumpleanosPendiente =
    hoy.getMonth() < fechaNacimiento.getMonth() ||
    (hoy.getMonth() === fechaNacimiento.getMonth() && hoy.getDate() < fechaNacimiento.getDate());
  return hoy.getFullYear() - fechaNacimiento.getFullYear() - (cumpleanosPendiente ? 1 : 0);
}

export function mayorDeEdad(): FieldValidator<Date | null, PathKind.Child> {
  return ({ value }) => {
    const fecha = value();
    if (fecha === null) return null;

    if (Number.isNaN(fecha.getTime())) {
      return { kind: 'fechaInvalida', message: 'Ingresá una fecha de nacimiento válida.' };
    }

    const edad = calcularEdad(fecha);
    if (edad > EDAD_MAXIMA) {
      return { kind: 'fechaInvalida', message: 'Ingresá una fecha de nacimiento válida.' };
    }
    if (edad < 0) {
      return { kind: 'fechaFutura', message: 'La fecha de nacimiento no puede ser futura.' };
    }
    if (edad < EDAD_MINIMA) {
      return { kind: 'menorDeEdad', message: `Debés tener ${EDAD_MINIMA} años o más para registrarte.` };
    }
    return null;
  };
}
