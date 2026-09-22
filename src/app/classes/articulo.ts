import { CategoriaArticulo } from './categoria-articulo';

export interface Articulo {
  id: string;
  nombre: string;
  precio: number;
  categoria: CategoriaArticulo;
  disponible: boolean;
}
