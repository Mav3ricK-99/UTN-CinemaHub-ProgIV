import { inject, Injectable } from '@angular/core';

import { Funcion } from '../classes/funcion';
import { Pelicula } from '../classes/pelicula';
import { Sala } from '../classes/sala';
import { convertirFilaEnPelicula, FilaPelicula, SELECT_PELICULA } from './pelicula.service';
import { convertirFilaEnSala, FilaSala } from './sala.service';
import { SupabaseService } from './supabase.service';

export interface SolicitudCrearFuncion {
  pelicula: Pelicula;
  sala: Sala;
  fechaInicio: Date;
  fechaFin: Date;
  precio: number;
}

export interface PeliculaMasVista {
  pelicula: Pelicula;
  espectadores: number;
}

/** Columnas de `funcion` con su película y su sala (sin butacas). Otros servicios lo anidan en sus consultas. */
export const SELECT_FUNCION = `id, fecha_inicio, fecha_fin, precio, butacas_reservadas, pelicula(${SELECT_PELICULA}), sala(id, nombre)`;

/** Igual que `SELECT_FUNCION`, pero con las butacas de la sala. */
const SELECT_FUNCION_CON_BUTACAS = `id, fecha_inicio, fecha_fin, precio, butacas_reservadas, pelicula(${SELECT_PELICULA}), sala(id, nombre, butaca(identificador, es_especial))`;

/** Fila de `funcion`. Las fechas son `timestamptz`: llegan como string ISO. */
export interface FilaFuncion {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  precio: number;
  butacas_reservadas: string[];
  pelicula: FilaPelicula;
  sala: FilaSala;
}

export function convertirFilaEnFuncion(fila: FilaFuncion): Funcion {
  return {
    id: fila.id,
    pelicula: convertirFilaEnPelicula(fila.pelicula),
    sala: convertirFilaEnSala(fila.sala),
    fechaInicio: new Date(fila.fecha_inicio),
    fechaFin: new Date(fila.fecha_fin),
    precio: fila.precio,
    butacasReservadas: fila.butacas_reservadas,
  };
}

interface FilaReservaVerificada {
  butacas: string[];
  funcion: { pelicula: FilaPelicula };
}

const CANTIDAD_PELICULAS_MAS_VISTAS = 3;

@Injectable({ providedIn: 'root' })
export class FuncionService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Crea la función. La base de datos rechaza la inserción si no se respetan los
   * 30 minutos de intervalo con otra función de la misma sala.
   */
  async crearFuncion({ pelicula, sala, fechaInicio, fechaFin, precio }: SolicitudCrearFuncion): Promise<Funcion> {
    const { data, error } = await this.supabase.cliente
      .from('funcion')
      .insert({
        pelicula_id: pelicula.id,
        sala_id: sala.id,
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        precio,
      })
      .select(SELECT_FUNCION)
      .single<FilaFuncion>();

    if (error) throw error;
    return convertirFilaEnFuncion(data);
  }

  /** Elimina la función con el id indicado. */
  async eliminarFuncion(idFuncion: string): Promise<void> {
    const { error } = await this.supabase.cliente.from('funcion').delete().eq('id', idFuncion);
    if (error) throw error;
  }

  /** Devuelve la función con el id indicado, con las butacas de su sala, o `null` si no existe. */
  async obtenerDetalleFuncion(idFuncion: string): Promise<Funcion | null> {
    const { data, error } = await this.supabase.cliente
      .from('funcion')
      .select(SELECT_FUNCION_CON_BUTACAS)
      .eq('id', idFuncion)
      .maybeSingle<FilaFuncion>();

    if (error) throw error;
    return data ? convertirFilaEnFuncion(data) : null;
  }

  /** Devuelve las funciones que aún no comenzaron, ordenadas por fecha de inicio. */
  async obtenerFuncionesProximas(): Promise<Funcion[]> {
    const { data, error } = await this.supabase.cliente
      .from('funcion')
      .select(SELECT_FUNCION)
      .gt('fecha_inicio', new Date().toISOString())
      .order('fecha_inicio')
      .returns<FilaFuncion[]>();

    if (error) throw error;
    return data.map(convertirFilaEnFuncion);
  }

  /** Devuelve las funciones que ya finalizaron, de la más reciente a la más antigua. */
  async obtenerFuncionesPasadas(): Promise<Funcion[]> {
    const { data, error } = await this.supabase.cliente
      .from('funcion')
      .select(SELECT_FUNCION)
      .lt('fecha_fin', new Date().toISOString())
      .order('fecha_inicio', { ascending: false })
      .returns<FilaFuncion[]>();

    if (error) throw error;
    return data.map(convertirFilaEnFuncion);
  }

  /** Devuelve las funciones que se están proyectando en este momento. */
  async obtenerFuncionesEnCurso(): Promise<Funcion[]> {
    const ahora = new Date().toISOString();
    const { data, error } = await this.supabase.cliente
      .from('funcion')
      .select(SELECT_FUNCION)
      .lte('fecha_inicio', ahora)
      .gt('fecha_fin', ahora)
      .returns<FilaFuncion[]>();

    if (error) throw error;
    return data.map(convertirFilaEnFuncion);
  }

  /** Devuelve la cantidad de funciones que ya finalizaron. */
  async contarFuncionesPasadas(): Promise<number> {
    const { count, error } = await this.supabase.cliente
      .from('funcion')
      .select('id', { count: 'exact', head: true })
      .lt('fecha_fin', new Date().toISOString());

    if (error) throw error;
    return count ?? 0;
  }

  /**
   * Devuelve las películas con más espectadores, de mayor a menor. Cuenta como
   * espectador cada butaca de una orden verificada en el ingreso a la sala.
   */
  async obtenerPeliculasMasVistas(cantidad = CANTIDAD_PELICULAS_MAS_VISTAS): Promise<PeliculaMasVista[]> {
    const { data, error } = await this.supabase.cliente
      .from('reserva')
      .select(`butacas, orden!inner(verificada), funcion(pelicula(${SELECT_PELICULA}))`)
      .eq('orden.verificada', true)
      .returns<FilaReservaVerificada[]>();

    if (error) throw error;

    const espectadoresPorPelicula = new Map<string, { fila: FilaPelicula; espectadores: number }>();
    for (const { butacas, funcion } of data) {
      const acumulado = espectadoresPorPelicula.get(funcion.pelicula.id);
      if (acumulado) {
        acumulado.espectadores += butacas.length;
      } else {
        espectadoresPorPelicula.set(funcion.pelicula.id, { fila: funcion.pelicula, espectadores: butacas.length });
      }
    }

    return [...espectadoresPorPelicula.values()]
      .sort((a, b) => b.espectadores - a.espectadores)
      .slice(0, cantidad)
      .map(({ fila, espectadores }) => ({ pelicula: convertirFilaEnPelicula(fila), espectadores }));
  }
}
