import { Funcion } from './funcion';
import { Usuario } from './usuario';

/**
 * Reserva de una o más butacas para una función, hecha por un usuario
 * registrado o anónimo. Si `usuario` es `null`, `emailContacto` es
 * obligatorio para poder entregar el ticket.
 */
export interface Reserva {
  id: string;
  funcion: Funcion;
  butaca: string[];
  usuario: Usuario | null;
  emailContacto: string | null;
  precio: number;
  descuentoAplicado: number;
  qrData: string;
  verificada: boolean;
  fechaCompra: Date;
}
