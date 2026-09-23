import { Articulo } from './articulo';
import { Funcion } from './funcion';
import { Orden } from './orden';

/**
 * Reserva de una o más butacas (y, opcionalmente, artículos de confitería)
 * para una función. Cada `Orden` tiene como máximo una `Reserva`.
 */
export interface Reserva {
  id: string;
  orden: Orden;
  funcion: Funcion;
  butacas: string[];
  articulos: Articulo[];
  precioButacas: number;
  precioArticulos: number;
}
