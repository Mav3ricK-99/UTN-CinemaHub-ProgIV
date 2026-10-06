import { inject, Injectable } from '@angular/core';

import { Articulo } from '../classes/articulo';
import { CategoriaArticulo } from '../classes/categoria-articulo';
import { SupabaseService } from './supabase.service';

export interface SolicitudCrearArticulo {
  nombre: string;
  precio: number;
  puntos: number;
  categoria: CategoriaArticulo;
  disponible: boolean;
}

/** Fila de `articulo` con su `categoria_articulo` embebida. */
export interface FilaArticulo {
  id: string;
  nombre: string;
  precio: number;
  puntos: number;
  disponible: boolean;
  categoria_articulo: CategoriaArticulo;
}

export function convertirFilaEnArticulo(fila: FilaArticulo): Articulo {
  return {
    id: fila.id,
    nombre: fila.nombre,
    precio: fila.precio,
    puntos: fila.puntos,
    categoria: fila.categoria_articulo,
    disponible: fila.disponible,
  };
}

export interface UnidadesPorArticulo {
  nombre: string;
  unidades: number;
}

interface FilaReservaArticulo {
  cantidad: number;
  articulo: { id: string; nombre: string };
}

const CANTIDAD_ARTICULOS_GRAFICO = 5;

@Injectable({ providedIn: 'root' })
export class ArticuloService {
  private readonly supabase = inject(SupabaseService);

  /** Crea el artículo y devuelve el registro guardado. */
  async crearArticulo({ nombre, precio, puntos, categoria, disponible }: SolicitudCrearArticulo): Promise<Articulo> {
    const { data, error } = await this.supabase.cliente
      .from('articulo')
      .insert({ nombre, precio, puntos, categoria_id: categoria.id, disponible })
      .select('id, nombre, precio, puntos, disponible, categoria_articulo(id, nombre)')
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
        puntos: articulo.puntos,
        categoria_id: articulo.categoria.id,
        disponible: articulo.disponible,
      })
      .eq('id', articulo.id)
      .select('id, nombre, precio, puntos, disponible, categoria_articulo(id, nombre)')
      .single<FilaArticulo>();

    if (error) throw error;
    return convertirFilaEnArticulo(data);
  }

  /** Devuelve el artículo con el id indicado, o `null` si no existe. */
  async obtenerArticuloPorId(idArticulo: string): Promise<Articulo | null> {
    const { data, error } = await this.supabase.cliente
      .from('articulo')
      .select('id, nombre, precio, puntos, disponible, categoria_articulo(id, nombre)')
      .eq('id', idArticulo)
      .maybeSingle<FilaArticulo>();

    if (error) throw error;
    return data ? convertirFilaEnArticulo(data) : null;
  }

  /** Devuelve todos los artículos, disponibles o no. */
  async obtenerArticulos(): Promise<Articulo[]> {
    const { data, error } = await this.supabase.cliente
      .from('articulo')
      .select('id, nombre, precio, puntos, disponible, categoria_articulo(id, nombre)')
      .order('nombre')
      .returns<FilaArticulo[]>();

    if (error) throw error;
    return data.map(convertirFilaEnArticulo);
  }

  /** Devuelve los artículos con más unidades vendidas en todas las reservas, de mayor a menor. */
  async obtenerArticulosMasVendidos(cantidad = CANTIDAD_ARTICULOS_GRAFICO): Promise<UnidadesPorArticulo[]> {
    const { data, error } = await this.supabase.cliente
      .from('reserva_articulo')
      .select('cantidad, articulo(id, nombre)')
      .returns<FilaReservaArticulo[]>();

    if (error) throw error;

    const unidadesPorArticulo = new Map<string, UnidadesPorArticulo>();
    for (const { cantidad: unidades, articulo } of data) {
      const acumulado = unidadesPorArticulo.get(articulo.id);
      if (acumulado) {
        acumulado.unidades += unidades;
      } else {
        unidadesPorArticulo.set(articulo.id, { nombre: articulo.nombre, unidades });
      }
    }

    return [...unidadesPorArticulo.values()].sort((a, b) => b.unidades - a.unidades).slice(0, cantidad);
  }

  /** Devuelve los artículos con `disponible = true`. */
  async obtenerArticulosDisponibles(): Promise<Articulo[]> {
    const { data, error } = await this.supabase.cliente
      .from('articulo')
      .select('id, nombre, precio, puntos, disponible, categoria_articulo(id, nombre)')
      .eq('disponible', true)
      .order('nombre')
      .returns<FilaArticulo[]>();

    if (error) throw error;
    return data.map(convertirFilaEnArticulo);
  }
}
