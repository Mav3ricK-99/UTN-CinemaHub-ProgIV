export interface Butaca {
  id: string;
  /** `true` solo para las filas R, S y T. Cuestan un `RECARGO_BUTACA_ESPECIAL` más. */
  esEspecial: boolean;
  /** `true` solo para las 14 butacas de la fila J. No tienen recargo. */
  esDiscapacitados: boolean;
}

export interface Sala {
  id: string;
  nombre: string;
  /** Vacío en las consultas de listado. Se carga solo en el detalle de una función. */
  butacas: Butaca[];
}

/** 18 filas (A-I, L-T) x 28 columnas, más 14 butacas accesibles en la fila J. */
export const TOTAL_BUTACAS_SALA = 18 * 28 + 14;

/** Recargo sobre el precio de la función para las butacas especiales (15%). */
export const RECARGO_BUTACA_ESPECIAL = 0.15;
