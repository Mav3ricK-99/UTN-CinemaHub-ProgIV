import { Reserva } from './reserva';

/** Línea del recibo de una orden: una entrada por butaca o, a futuro, un artículo de confitería. */
export interface ItemOrden {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

/**
 * Orden de compra generada al reservar butacas. Agrupa la reserva junto a
 * los ítems del recibo y el monto final cobrado.
 */
export interface Orden {
  id: string;
  reserva: Reserva;
  items: ItemOrden[];
  total: number;
  fechaCompra: Date;
}
