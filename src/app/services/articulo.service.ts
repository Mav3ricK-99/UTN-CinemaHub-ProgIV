import { Injectable } from '@angular/core';

import { Articulo } from '../classes/articulo';

const categoriaCandy = { nombre: 'Candy' };

/** Artículos del sector candy. Datos de prueba hasta definir la tabla en Supabase. */
const articulosCandy: Articulo[] = [
  { id: 'candy-1', nombre: 'Pochoclos grandes', precio: 3200, categoria: categoriaCandy, disponible: true },
  { id: 'candy-2', nombre: 'Pochoclos medianos', precio: 2400, categoria: categoriaCandy, disponible: true },
  { id: 'candy-3', nombre: 'Gaseosa grande', precio: 2000, categoria: categoriaCandy, disponible: true },
  { id: 'candy-4', nombre: 'Gaseosa mediana', precio: 1600, categoria: categoriaCandy, disponible: true },
  { id: 'candy-5', nombre: 'Nachos con queso', precio: 2800, categoria: categoriaCandy, disponible: true },
  { id: 'candy-6', nombre: 'Combo pochoclos + gaseosa', precio: 4500, categoria: categoriaCandy, disponible: true },
  { id: 'candy-7', nombre: 'Chocolate', precio: 1800, categoria: categoriaCandy, disponible: true },
  { id: 'candy-8', nombre: 'Agua mineral', precio: 1200, categoria: categoriaCandy, disponible: true },
];

@Injectable({ providedIn: 'root' })
export class ArticuloService {
  /**
   * Devuelve los artículos disponibles del sector candy.
   * Usa datos de prueba hasta definir la tabla en Supabase.
   */
  async obtenerArticulosCandy(): Promise<Articulo[]> {
    return articulosCandy.filter((articulo) => articulo.disponible);
  }
}
