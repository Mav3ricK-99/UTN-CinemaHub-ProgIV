import { inject, Injectable } from '@angular/core';

import { Pelicula } from '../classes/pelicula';
import { Resena } from '../classes/resena';
import { Usuario } from '../classes/usuario';
import { convertirFilaEnPelicula, FilaPelicula, SELECT_PELICULA } from './pelicula.service';
import { SupabaseService } from './supabase.service';
import { convertirFilaEnUsuario, FilaUsuario } from './usuario.service';

export interface SolicitudCrearResena {
  pelicula: Pelicula;
  usuario: Usuario;
  puntaje: number;
  comentario: string;
}

export interface SolicitudModificarResena {
  resena: Resena;
  puntaje: number;
  comentario: string;
}

interface FilaResena {
  id: string;
  puntaje: number;
  comentario: string;
  fecha_creacion: string;
  fecha_edicion: string | null;
  usuario: FilaUsuario;
  pelicula: FilaPelicula;
}

const SELECT_RESENA = `id, puntaje, comentario, fecha_creacion, fecha_edicion, usuario(id, email, nombre, fecha_nacimiento, rol, saldo, puntos), pelicula(${SELECT_PELICULA})`;

function convertirFilaEnResena(fila: FilaResena): Resena {
  return {
    id: fila.id,
    pelicula: convertirFilaEnPelicula(fila.pelicula),
    usuario: convertirFilaEnUsuario(fila.usuario),
    puntaje: fila.puntaje,
    comentario: fila.comentario,
    fechaCreacion: new Date(fila.fecha_creacion),
    fechaEdicion: fila.fecha_edicion ? new Date(fila.fecha_edicion) : null,
  };
}

@Injectable({ providedIn: 'root' })
export class ResenaService {
  private readonly supabase = inject(SupabaseService);

  /** Devuelve las reseñas de una película, de la más reciente a la más antigua. */
  async obtenerResenasDePelicula(pelicula: Pelicula): Promise<Resena[]> {
    const { data, error } = await this.supabase.cliente
      .from('resena')
      .select(SELECT_RESENA)
      .eq('pelicula_id', pelicula.id)
      .order('fecha_creacion', { ascending: false })
      .returns<FilaResena[]>();

    if (error) throw error;
    return data.map(convertirFilaEnResena);
  }

  /** Devuelve las reseñas escritas por el usuario, de la más reciente a la más antigua. */
  async obtenerResenasDeUsuario(idUsuario: string): Promise<Resena[]> {
    const { data, error } = await this.supabase.cliente
      .from('resena')
      .select(SELECT_RESENA)
      .eq('usuario_id', idUsuario)
      .order('fecha_creacion', { ascending: false })
      .returns<FilaResena[]>();

    if (error) throw error;
    return data.map(convertirFilaEnResena);
  }

  /** Devuelve la cantidad total de reseñas realizadas. */
  async contarResenas(): Promise<number> {
    const { count, error } = await this.supabase.cliente.from('resena').select('id', { count: 'exact', head: true });

    if (error) throw error;
    return count ?? 0;
  }

  /** Crea la reseña de la película. La base de datos exige una compra previa del usuario para esa película. */
  async crearResena({ pelicula, usuario, puntaje, comentario }: SolicitudCrearResena): Promise<Resena> {
    const { data, error } = await this.supabase.cliente
      .from('resena')
      .insert({ pelicula_id: pelicula.id, usuario_id: usuario.id, puntaje, comentario })
      .select(SELECT_RESENA)
      .single<FilaResena>();

    if (error) throw error;
    return convertirFilaEnResena(data);
  }

  /** Actualiza puntaje y comentario de la reseña, y registra la fecha de edición. */
  async modificarResena({ resena, puntaje, comentario }: SolicitudModificarResena): Promise<Resena> {
    const { data, error } = await this.supabase.cliente
      .from('resena')
      .update({ puntaje, comentario, fecha_edicion: new Date().toISOString() })
      .eq('id', resena.id)
      .select(SELECT_RESENA)
      .single<FilaResena>();

    if (error) throw error;
    return convertirFilaEnResena(data);
  }
}
