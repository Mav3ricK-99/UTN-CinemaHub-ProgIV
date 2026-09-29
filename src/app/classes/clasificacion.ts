export interface Clasificacion {
  id: string;
  codigo: string;
  descripcion: string;
}

/** Edad mínima que exige la clasificación sin acompañante. `0` si es apta para todo público o no hay clasificación. */
export function obtenerEdadMinima(clasificacion: Clasificacion | null): number {
  const coincidencia = clasificacion?.codigo.match(/\d+/);
  return coincidencia ? Number(coincidencia[0]) : 0;
}
