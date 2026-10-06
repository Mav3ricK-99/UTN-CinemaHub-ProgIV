/** Fila del reporte de facturaciones: una orden junto a los datos de su reserva (si todavía existe). */
export interface Facturacion {
  idOrden: string;
  /** `null` si la orden no tiene reserva (fue cancelada). */
  idFuncion: string | null;
  usuarioRegistrado: boolean;
  email: string;
  pagoConPuntos: boolean;
  puntosUtilizados: number | null;
  total: number;
  verificada: boolean;
  /** `null` si la orden no tiene reserva (fue cancelada). */
  precioButacas: number | null;
  /** `null` si la orden no tiene reserva (fue cancelada). */
  precioArticulos: number | null;
  fechaOrden: Date;
}

export type EstadoFacturacion = 'cancelada' | 'verificada' | 'pendiente';

/** Orden sin reserva: cancelada. Orden con reserva y verificada: ya se usó. */
export function obtenerEstadoFacturacion(facturacion: Facturacion): EstadoFacturacion {
  if (facturacion.idFuncion === null) return 'cancelada';
  return facturacion.verificada ? 'verificada' : 'pendiente';
}
