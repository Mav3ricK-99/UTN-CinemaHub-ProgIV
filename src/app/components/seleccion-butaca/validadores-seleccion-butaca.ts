import { FieldValidator, PathKind } from '@angular/forms/signals';

import { Usuario } from '../../classes/usuario';

/** Exige tildar la confirmación de acompañante solo cuando la película lo requiere para el comprador. */
export function requeridoSiRequiereAcompanante(
  requiereAcompanante: () => boolean,
): FieldValidator<boolean, PathKind.Child> {
  return ({ value }) => {
    if (!requiereAcompanante() || value()) return null;
    return { kind: 'required', message: 'Confirmá que irás acompañado con un adulto.' };
  };
}

/** Exige el correo de contacto solo cuando la reserva es anónima (sin usuario con sesión iniciada). */
export function requeridoSiAnonimo(usuario: () => Usuario | null): FieldValidator<string, PathKind.Child> {
  return ({ value }) => {
    if (usuario() !== null) return null;
    if (value().trim().length > 0) return null;
    return { kind: 'required', message: 'Ingresá tu correo de contacto.' };
  };
}
