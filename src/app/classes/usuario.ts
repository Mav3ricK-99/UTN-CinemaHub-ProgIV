export type RolUsuario = 'cliente' | 'empleado' | 'admin';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  fechaNacimiento: Date;
  rol: RolUsuario;
  /** Saldo actual de dinero. Se descuenta al pagar una orden con saldo y se acredita al cancelar una reserva. */
  saldo: number;
  /** Saldo actual de puntos de fidelización. Lo acredita y descuenta la base de datos. */
  puntos: number;
}
