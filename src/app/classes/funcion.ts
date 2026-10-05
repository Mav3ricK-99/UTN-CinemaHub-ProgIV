import { Pelicula } from './pelicula';
import { RECARGO_BUTACA_ESPECIAL, Sala, TOTAL_BUTACAS_SALA } from './sala';

export interface Funcion {
  id: string;
  pelicula: Pelicula;
  sala: Sala;
  fechaInicio: Date;
  fechaFin: Date;
  precio: number;
  puntos: number;
  butacasReservadas: string[];
}

/** Precio de una butaca de la función. Las butacas especiales cuestan un `RECARGO_BUTACA_ESPECIAL` más. */
export function calcularPrecioButaca(funcion: Funcion, idButaca: string): number {
  const esEspecial = funcion.sala.butacas.some((butaca) => butaca.id === idButaca && butaca.esEspecial);
  return esEspecial ? Math.round(funcion.precio * (1 + RECARGO_BUTACA_ESPECIAL) * 100) / 100 : funcion.precio;
}

/** Suma el precio de las butacas indicadas. */
export function calcularPrecioButacas(funcion: Funcion, idsButacas: string[]): number {
  return idsButacas.reduce((total, idButaca) => total + calcularPrecioButaca(funcion, idButaca), 0);
}

export function estaAgotada(funcion: Funcion): boolean {
  return funcion.butacasReservadas.length >= TOTAL_BUTACAS_SALA;
}
