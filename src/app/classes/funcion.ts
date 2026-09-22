import { Pelicula } from './pelicula';
import { Sala, TOTAL_BUTACAS_SALA } from './sala';

export interface Funcion {
  id: string;
  pelicula: Pelicula;
  sala: Sala;
  fechaInicio: Date;
  fechaFin: Date;
  precio: number;
  butacasReservadas: string[];
}

export function estaAgotada(funcion: Funcion): boolean {
  return funcion.butacasReservadas.length >= TOTAL_BUTACAS_SALA;
}
