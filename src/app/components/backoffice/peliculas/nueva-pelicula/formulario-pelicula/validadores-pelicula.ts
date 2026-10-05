import { FieldValidator, PathKind } from '@angular/forms/signals';

import { Categoria } from '../../../../../classes/categoria';

export function alMenosUnaCategoria(): FieldValidator<Categoria[], PathKind.Child> {
  return ({ value }) => {
    if (value().length > 0) return null;
    return { kind: 'categoriaRequerida', message: 'Seleccioná al menos una categoría.' };
  };
}
