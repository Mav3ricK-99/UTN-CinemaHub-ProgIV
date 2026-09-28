import { Pelicula } from '../../../classes/pelicula';
import { Sala } from '../../../classes/sala';

/** Estado actual de una sala: la película en proyección y cuándo termina, o `null` si está libre. */
export interface EstadoSala {
  sala: Sala;
  pelicula: Pelicula | null;
  finalizaEn: Date | null;
}
