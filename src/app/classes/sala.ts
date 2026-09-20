export interface Butaca {
  id: string;
  esEspecial: boolean;
}

export interface Sala {
  nombre: string;
  butacas: Butaca[];
}

const FILAS_SALA = 'ABCDEFGHIJKLMNOPQRST';
const COLUMNAS_SALA = 28;

export const TOTAL_BUTACAS_SALA = FILAS_SALA.length * COLUMNAS_SALA;

export function generarIdsButacas(): string[] {
  return [...FILAS_SALA].flatMap((fila) =>
    Array.from({ length: COLUMNAS_SALA }, (_, columna) => `${fila}${columna + 1}`),
  );
}

/** Genera las 560 butacas de una sala. `esEspecial` define cuáles son especiales según su id. */
export function generarButacas(esEspecial: (idButaca: string) => boolean = () => false): Butaca[] {
  return generarIdsButacas().map((id) => ({ id, esEspecial: esEspecial(id) }));
}
