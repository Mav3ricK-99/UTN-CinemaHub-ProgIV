import { Categoria } from './categoria';

export type FormatoPelicula = '2D' | '3D' | '4D' | '5D';
export type IdiomaPelicula = 'Castellano' | 'Subtitulada';

export interface Pelicula {
  nombre: string;
  sinopsis: string;
  duracionMinutos: number;
  imagenUrl: string;
  formato: FormatoPelicula;
  idioma: IdiomaPelicula;
  categorias: Categoria[];
}
