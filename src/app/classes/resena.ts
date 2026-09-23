import { Pelicula } from './pelicula';
import { Usuario } from './usuario';

/**
 * Reseña de un usuario sobre una película. Requiere una `Orden` con
 * `Reserva` previa para una función de esa película (no hay reseña anónima).
 */
export interface Resena {
  id: string;
  pelicula: Pelicula;
  usuario: Usuario;
  puntaje: number;
  comentario: string;
  fechaCreacion: Date;
  fechaEdicion: Date | null;
}
