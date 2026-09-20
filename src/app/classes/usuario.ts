export type RolUsuario = 'cliente' | 'empleado' | 'admin';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  fechaNacimiento: Date;
  rol: RolUsuario;
}
