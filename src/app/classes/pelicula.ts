import { Categoria } from './categoria';
import { Clasificacion } from './clasificacion';

export type FormatoPelicula = '2D' | '3D' | '4D' | '5D';
export type IdiomaPelicula = 'Castellano' | 'Subtitulada';

export interface Pelicula {
  id: string;
  nombre: string;
  sinopsis: string;
  duracionMinutos: number;
  imagenUrl: string;
  formato: FormatoPelicula;
  idioma: IdiomaPelicula;
  categorias: Categoria[];
  clasificacion: Clasificacion | null;
  promedioResenas: number;
  cantidadResenas: number;
}
