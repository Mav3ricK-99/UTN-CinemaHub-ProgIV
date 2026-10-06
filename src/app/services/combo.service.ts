import { inject, Injectable } from '@angular/core';

import { Articulo } from '../classes/articulo';
import { Combo, ComboDetalle } from '../classes/combo';
import { convertirFilaEnArticulo, FilaArticulo } from './articulo.service';
import { SupabaseService } from './supabase.service';

export interface SolicitudCrearCombo {
  nombre: string;
  descripcion: string | null;
  precio: number;
  cantidadEntradas: number;
  articulos: Articulo[];
}

/** Fila de `combo` con el conteo de sus filas en `combo_articulo`. */
interface FilaCombo {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  cantidad_entradas: number;
  disponible: boolean;
  combo_articulo: { count: number }[];
}

const COLUMNAS_COMBO = 'id, nombre, descripcion, precio, cantidad_entradas, disponible, combo_articulo(count)';

function convertirFilaEnCombo(fila: FilaCombo): Combo {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    precio: fila.precio,
    cantidadEntradas: fila.cantidad_entradas,
    disponible: fila.disponible,
    cantidadArticulos: fila.combo_articulo[0]?.count ?? 0,
  };
}

/** Fila de `combo` con sus filas de `combo_articulo` y el artículo de cada una. */
interface FilaComboDetalle extends Omit<FilaCombo, 'combo_articulo'> {
  combo_articulo: { cantidad: number; articulo: FilaArticulo }[];
}

const COLUMNAS_COMBO_DETALLE =
  'id, nombre, descripcion, precio, cantidad_entradas, disponible, combo_articulo(cantidad, articulo(id, nombre, precio, puntos, disponible, categoria_articulo(id, nombre)))';

function convertirFilaEnComboDetalle(fila: FilaComboDetalle): ComboDetalle {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    precio: fila.precio,
    cantidadEntradas: fila.cantidad_entradas,
    disponible: fila.disponible,
    cantidadArticulos: fila.combo_articulo.length,
    articulos: fila.combo_articulo.map(({ cantidad, articulo }) => ({
      articulo: convertirFilaEnArticulo(articulo),
      cantidad,
    })),
  };
}

@Injectable({ providedIn: 'root' })
export class ComboService {
  private readonly supabase = inject(SupabaseService);

  /** Devuelve los combos con `disponible = true` junto con sus artículos. */
  async obtenerCombosDisponibles(): Promise<ComboDetalle[]> {
    const { data, error } = await this.supabase.cliente
      .from('combo')
      .select(COLUMNAS_COMBO_DETALLE)
      .eq('disponible', true)
      .order('nombre')
      .returns<FilaComboDetalle[]>();

    if (error) throw error;
    return data.map(convertirFilaEnComboDetalle);
  }

  /** Devuelve todos los combos con la cantidad de artículos que incluye cada uno. */
  async obtenerCombos(): Promise<Combo[]> {
    const { data, error } = await this.supabase.cliente
      .from('combo')
      .select(COLUMNAS_COMBO)
      .order('nombre')
      .returns<FilaCombo[]>();

    if (error) throw error;
    return data.map(convertirFilaEnCombo);
  }

  /** Crea el combo y sus filas en `combo_articulo`. Si falla el vínculo con los artículos, elimina el combo. */
  async crearCombo({ nombre, descripcion, precio, cantidadEntradas, articulos }: SolicitudCrearCombo): Promise<Combo> {
    const { data, error } = await this.supabase.cliente
      .from('combo')
      .insert({ nombre, descripcion, precio, cantidad_entradas: cantidadEntradas })
      .select('id')
      .single<{ id: string }>();

    if (error) throw error;

    const filasArticulos = articulos.map((articulo) => ({
      combo_id: data.id,
      articulo_id: articulo.id,
      cantidad: 1,
    }));
    const { error: errorArticulos } = await this.supabase.cliente.from('combo_articulo').insert(filasArticulos);

    if (errorArticulos) {
      await this.supabase.cliente.from('combo').delete().eq('id', data.id);
      throw errorArticulos;
    }

    const { data: comboCreado, error: errorLectura } = await this.supabase.cliente
      .from('combo')
      .select(COLUMNAS_COMBO)
      .eq('id', data.id)
      .single<FilaCombo>();

    if (errorLectura) throw errorLectura;
    return convertirFilaEnCombo(comboCreado);
  }
}
