import { Articulo } from './articulo';

export interface Combo {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  cantidadEntradas: number;
  disponible: boolean;
  /** Cantidad de artículos distintos que incluye el combo. */
  cantidadArticulos: number;
}

/** Fila de `combo_articulo`: un artículo del combo y cuántas unidades incluye. */
export interface ArticuloCombo {
  articulo: Articulo;
  cantidad: number;
}

/** Combo con los artículos que incluye, usado al armar una compra. */
export interface ComboDetalle extends Combo {
  articulos: ArticuloCombo[];
}

/** Precios que se guardan en la reserva: la mitad del combo para butacas y el resto para artículos. */
export function repartirPrecioCombo(combo: Combo): { precioButacas: number; precioArticulos: number } {
  const precioButacas = Math.floor(combo.precio / 2);
  return { precioButacas, precioArticulos: combo.precio - precioButacas };
}
