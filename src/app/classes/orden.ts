import { Usuario } from './usuario';

/**
 * Orden de compra generada al reservar butacas. El detalle de butacas y
 * artículos vive en la `Reserva` asociada (relación 1 a 1).
 */
export interface Orden {
  id: string;
  usuario: Usuario | null;
  emailContacto: string | null;
  descuentoAplicado: number;
  total: number;
  qrData: string;
  verificada: boolean;
  fechaVerificacion: Date | null;
  fechaCreacion: Date;
}

const ALFABETO_CODIGO_ORDEN = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Largo del código de `qrData`: el mismo que codifica el QR y se ingresa a mano en el ingreso a sala. */
export const LARGO_CODIGO_ORDEN = 8;

/** Genera el código alfanumérico de una orden, evitando caracteres ambiguos (0/O, 1/I). */
export function generarCodigoOrden(): string {
  const valoresAleatorios = crypto.getRandomValues(new Uint8Array(LARGO_CODIGO_ORDEN));
  return Array.from(valoresAleatorios, (valor) => ALFABETO_CODIGO_ORDEN[valor % ALFABETO_CODIGO_ORDEN.length]).join('');
}
