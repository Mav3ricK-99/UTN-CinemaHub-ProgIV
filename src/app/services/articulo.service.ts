import { inject, Injectable } from '@angular/core';

import { Articulo } from '../classes/articulo';
import { CategoriaArticulo } from '../classes/categoria-articulo';
import { SupabaseService } from './supabase.service';

export interface SolicitudCrearArticulo {
  nombre: string;
  precio: number;
  categoria: CategoriaArticulo;
  disponible: boolean;
}

/** Fila de `articulo` con su `categoria_articulo` embebida. */
export interface FilaArticulo {
  id: string;
  nombre: string;
  precio: number;
  disponible: boolean;
  categoria_articulo: CategoriaArticulo;
}

export function convertirFilaEnArticulo(fila: FilaArticulo): Articulo {
  return {
    id: fila.id,
    nombre: fila.nombre,
    precio: fila.precio,
    categoria: fila.categoria_articulo,
    disponible: fila.disponible,
  };
}

@Injectable({ providedIn: 'root' })
export class ArticuloService {
  private readonly supabase = inject(SupabaseService);

  /** Crea el artículo y devuelve el registro guardado. */
  async crearArticulo({ nombre, precio, categoria, disponible }: SolicitudCrearArticulo): Promise<Articulo> {
    const { data, error } = await this.supabase.cliente
      .from('articulo')
      .insert({ nombre, precio, categoria_id: categoria.id, disponible })
      .select('id, nombre, precio, disponible, categoria_articulo(id, nombre)')
      .single<FilaArticulo>();

    if (error) throw error;
    return convertirFilaEnArticulo(data);
  }

  /** Reemplaza los datos del artículo con el mismo id y devuelve el registro guardado. */
  async modificarArticulo(articulo: Articulo): Promise<Articulo> {
    const { data, error } = await this.supabase.cliente
      .from('articulo')
      .update({
        nombre: articulo.nombre,
        precio: articulo.precio,
        categoria_id: articulo.categoria.id,
        disponible: articulo.disponible,
      })
      .eq('id', articulo.id)
      .select('id, nombre, precio, disponible, categoria_articulo(id, nombre)')
      .single<FilaArticulo>();

    if (error) throw error;
    return convertirFilaEnArticulo(data);
  }

  /** Devuelve todos los artículos, disponibles o no. */
  async obtenerArticulos(): Promise<Articulo[]> {
    const { data, error } = await this.supabase.cliente
      .from('articulo')
      .select('id, nombre, precio, disponible, categoria_articulo(id, nombre)')
      .order('nombre')
      .returns<FilaArticulo[]>();

    if (error) throw error;
    return data.map(convertirFilaEnArticulo);
  }

  /** Devuelve los artículos con `disponible = true`. */
  async obtenerArticulosDisponibles(): Promise<Articulo[]> {
    const { data, error } = await this.supabase.cliente
      .from('articulo')
      .select('id, nombre, precio, disponible, categoria_articulo(id, nombre)')
      .eq('disponible', true)
      .order('nombre')
      .returns<FilaArticulo[]>();

    if (error) throw error;
    return data.map(convertirFilaEnArticulo);
  }
}
