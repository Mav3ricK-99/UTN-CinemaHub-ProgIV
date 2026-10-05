import { Pelicula } from './pelicula';

export type TipoMovimientoPuntos = 'ganancia' | 'canje';

/** Movimiento del saldo de puntos de un usuario. Cada movimiento proviene de una orden. */
export interface MovimientoPuntos {
  ordenId: string;
  fechaCreacion: Date;
  tipo: TipoMovimientoPuntos;
  /** Cantidad de puntos, siempre positiva. `tipo` indica si sumó o restó. */
  puntos: number;
  pelicula: Pelicula;
}
