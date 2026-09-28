export interface Butaca {
  id: string;
  esEspecial: boolean;
}

export interface Sala {
  id: string;
  nombre: string;
  /** Vacío en las consultas de listado. Se carga solo en el detalle de una función. */
  butacas: Butaca[];
}

/** 18 filas (A-I, L-T) x 28 columnas, más 14 butacas accesibles en la fila J. */
export const TOTAL_BUTACAS_SALA = 18 * 28 + 14;
