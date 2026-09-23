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
