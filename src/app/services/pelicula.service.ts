import { inject, Injectable } from '@angular/core';

import { Categoria } from '../classes/categoria';
import { Clasificacion } from '../classes/clasificacion';
import { FormatoPelicula, IdiomaPelicula, Pelicula } from '../classes/pelicula';
import { SupabaseService } from './supabase.service';

const BUCKET_IMAGENES_PELICULA = 'peliculas-imagenes';

export interface SolicitudCrearPelicula {
  nombre: string;
  sinopsis: string;
  duracionMinutos: number;
  formato: FormatoPelicula;
  idioma: IdiomaPelicula;
  categorias: Categoria[];
  clasificacion: Clasificacion;
  proximamente: boolean;
  imagen: File;
}

export interface SolicitudActualizarPelicula extends Omit<SolicitudCrearPelicula, 'imagen'> {
  /** Imagen nueva. Si es `null`, se conserva la portada actual. */
  imagen: File | null;
}

/** Columnas de `pelicula` con sus categorías. Otros servicios lo anidan en sus consultas. */
export const SELECT_PELICULA =
  'id, nombre, sinopsis, duracion_minutos, imagen_url, formato, idioma, promedio_resenas, cantidad_resenas, proximamente, clasificacion(id, codigo, descripcion), pelicula_categoria(categoria(id, nombre))';

/** Fila de `pelicula` tal como la devuelve PostgREST con `SELECT_PELICULA`. */
export interface FilaPelicula {
  id: string;
  nombre: string;
  sinopsis: string;
  duracion_minutos: number;
  imagen_url: string | null;
  formato: FormatoPelicula;
  idioma: IdiomaPelicula;
  promedio_resenas: number | null;
  cantidad_resenas: number | null;
  proximamente: boolean | null;
  clasificacion: Clasificacion | null;
  pelicula_categoria: { categoria: Categoria }[];
}

export function convertirFilaEnPelicula(fila: FilaPelicula): Pelicula {
  return {
    id: fila.id,
    nombre: fila.nombre,
    sinopsis: fila.sinopsis,
    duracionMinutos: fila.duracion_minutos,
    imagenUrl: fila.imagen_url ?? '',
    formato: fila.formato,
    idioma: fila.idioma,
    categorias: fila.pelicula_categoria.map(({ categoria }) => categoria),
    clasificacion: fila.clasificacion,
    promedioResenas: fila.promedio_resenas ?? 0,
    cantidadResenas: fila.cantidad_resenas ?? 0,
    proximamente: fila.proximamente ?? false,
  };
}

@Injectable({ providedIn: 'root' })
export class PeliculaService {
  private readonly supabase = inject(SupabaseService);

  /** Sube la imagen de portada al bucket `peliculas-imagenes` y devuelve su URL pública. */
  async subirImagen(imagen: File): Promise<string> {
    const extension = imagen.name.split('.').pop();
    const ruta = `${crypto.randomUUID()}.${extension}`;

    const { error } = await this.supabase.cliente.storage.from(BUCKET_IMAGENES_PELICULA).upload(ruta, imagen);
    if (error) throw error;

    const { data } = this.supabase.cliente.storage.from(BUCKET_IMAGENES_PELICULA).getPublicUrl(ruta);
    return data.publicUrl;
  }

  /** Crea la película, sube su imagen de portada y la vincula con las categorías elegidas. */
  async crearPelicula(solicitud: SolicitudCrearPelicula): Promise<Pelicula> {
    const imagenUrl = await this.subirImagen(solicitud.imagen);

    const { data: fila, error } = await this.supabase.cliente
      .from('pelicula')
      .insert({
        nombre: solicitud.nombre,
        sinopsis: solicitud.sinopsis,
        duracion_minutos: solicitud.duracionMinutos,
        imagen_url: imagenUrl,
        formato: solicitud.formato,
        idioma: solicitud.idioma,
        clasificacion_id: solicitud.clasificacion.id,
        proximamente: solicitud.proximamente,
      })
      .select(SELECT_PELICULA)
      .single<FilaPelicula>();

    if (error) throw error;

    if (solicitud.categorias.length > 0) {
      const { error: errorRelacion } = await this.supabase.cliente
        .from('pelicula_categoria')
        .insert(solicitud.categorias.map((categoria) => ({ pelicula_id: fila.id, categoria_id: categoria.id })));
      if (errorRelacion) throw errorRelacion;
    }

    return convertirFilaEnPelicula({
      ...fila,
      pelicula_categoria: solicitud.categorias.map((categoria) => ({ categoria })),
    });
  }

  /** Devuelve la película con el id indicado, o `null` si no existe. */
  async obtenerPeliculaPorId(idPelicula: string): Promise<Pelicula | null> {
    const { data, error } = await this.supabase.cliente
      .from('pelicula')
      .select(SELECT_PELICULA)
      .eq('id', idPelicula)
      .maybeSingle<FilaPelicula>();
    if (error) throw error;
    return data ? convertirFilaEnPelicula(data) : null;
  }

  /** Actualiza la película, reemplaza su imagen si se eligió una nueva y rehace sus categorías. */
  async actualizarPelicula(idPelicula: string, solicitud: SolicitudActualizarPelicula): Promise<Pelicula> {
    const { data: anterior, error: errorAnterior } = await this.supabase.cliente
      .from('pelicula')
      .select('imagen_url')
      .eq('id', idPelicula)
      .single<{ imagen_url: string | null }>();
    if (errorAnterior) throw errorAnterior;

    const imagenUrl = solicitud.imagen ? await this.subirImagen(solicitud.imagen) : anterior.imagen_url;

    const { data: fila, error } = await this.supabase.cliente
      .from('pelicula')
      .update({
        nombre: solicitud.nombre,
        sinopsis: solicitud.sinopsis,
        duracion_minutos: solicitud.duracionMinutos,
        imagen_url: imagenUrl,
        formato: solicitud.formato,
        idioma: solicitud.idioma,
        clasificacion_id: solicitud.clasificacion.id,
        proximamente: solicitud.proximamente,
      })
      .eq('id', idPelicula)
      .select(SELECT_PELICULA)
      .single<FilaPelicula>();
    if (error) throw error;

    const { error: errorBorrado } = await this.supabase.cliente
      .from('pelicula_categoria')
      .delete()
      .eq('pelicula_id', idPelicula);
    if (errorBorrado) throw errorBorrado;

    if (solicitud.categorias.length > 0) {
      const { error: errorRelacion } = await this.supabase.cliente
        .from('pelicula_categoria')
        .insert(solicitud.categorias.map((categoria) => ({ pelicula_id: idPelicula, categoria_id: categoria.id })));
      if (errorRelacion) throw errorRelacion;
    }

    if (solicitud.imagen) await this.borrarImagen(anterior.imagen_url);

    return convertirFilaEnPelicula({
      ...fila,
      pelicula_categoria: solicitud.categorias.map((categoria) => ({ categoria })),
    });
  }

  /** Borra del bucket la imagen que corresponde a la URL pública indicada. */
  private async borrarImagen(imagenUrl: string | null | undefined): Promise<void> {
    const rutaImagen = imagenUrl?.split(`/${BUCKET_IMAGENES_PELICULA}/`)[1];
    if (rutaImagen) {
      await this.supabase.cliente.storage.from(BUCKET_IMAGENES_PELICULA).remove([rutaImagen]);
    }
  }

  /** Elimina la película (y sus vínculos con categorías) y borra su imagen del bucket. */
  async eliminarPelicula(idPelicula: string): Promise<void> {
    const { data, error } = await this.supabase.cliente
      .from('pelicula')
      .delete()
      .eq('id', idPelicula)
      .select('imagen_url')
      .maybeSingle<{ imagen_url: string | null }>();
    if (error) throw error;

    await this.borrarImagen(data?.imagen_url);
  }

  /** Devuelve las películas marcadas como estreno próximo, ordenadas por nombre. */
  async obtenerPeliculasProximamente(): Promise<Pelicula[]> {
    const { data, error } = await this.supabase.cliente
      .from('pelicula')
      .select(SELECT_PELICULA)
      .eq('proximamente', true)
      .order('nombre')
      .returns<FilaPelicula[]>();
    if (error) throw error;
    return data.map(convertirFilaEnPelicula);
  }

  /** Devuelve las películas ordenadas por nombre. */
  async obtenerPeliculas(): Promise<Pelicula[]> {
    const { data, error } = await this.supabase.cliente
      .from('pelicula')
      .select(SELECT_PELICULA)
      .order('nombre')
      .returns<FilaPelicula[]>();
    if (error) throw error;
    return data.map(convertirFilaEnPelicula);
  }
}
