import { CategoriaArticulo } from './categoria-articulo';

export interface Articulo {
  id: string;
  nombre: string;
  precio: number;
  puntos: number;
  categoria: CategoriaArticulo;
  disponible: boolean;
}
