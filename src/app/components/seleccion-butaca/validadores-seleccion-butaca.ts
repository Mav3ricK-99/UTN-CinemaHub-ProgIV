import { FieldValidator, PathKind } from '@angular/forms/signals';

import { Usuario } from '../../classes/usuario';

/** Exige el correo de contacto solo cuando la reserva es anónima (sin usuario con sesión iniciada). */
export function requeridoSiAnonimo(usuario: () => Usuario | null): FieldValidator<string, PathKind.Child> {
  return ({ value }) => {
    if (usuario() !== null) return null;
    if (value().trim().length > 0) return null;
    return { kind: 'required', message: 'Ingresá tu correo de contacto.' };
  };
}
