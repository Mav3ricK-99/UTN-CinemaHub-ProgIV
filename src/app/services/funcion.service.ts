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
  puntos: number;
}

export interface SolicitudActualizarFuncion {
  pelicula: Pelicula;
  fechaInicio: Date;
  fechaFin: Date;
  precio: number;
  puntos: number;
}

const MINUTOS_INTERVALO_SALA = 30;

export interface PeliculaMasVista {
  pelicula: Pelicula;
  espectadores: number;
}

export interface ResultadoBusquedaPelicula {
  pelicula: Pelicula;
  funcionProxima: Funcion;
}

/** Pasa a minúsculas y quita los acentos, para comparar textos sin distinguirlos. */
function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export interface SolicitudCrearFuncionesRecurrentes {
  peliculaId: string;
  diasSemana: number[];
  horario: string;
  fechaDesde: string;
  fechaHasta: string;
  precio: number;
  puntos: number;
}

export interface FuncionRecurrenteCreada {
  funcionId: string;
  salaId: string;
  salaNombre: string;
  fechaInicio: Date;
  fechaFin: Date;
}

interface FilaFuncionRecurrenteCreada {
  funcion_id: string;
  sala_id: string;
  sala_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
}

function convertirFilaEnFuncionRecurrenteCreada(fila: FilaFuncionRecurrenteCreada): FuncionRecurrenteCreada {
  return {
    funcionId: fila.funcion_id,
    salaId: fila.sala_id,
    salaNombre: fila.sala_nombre,
    fechaInicio: new Date(fila.fecha_inicio),
    fechaFin: new Date(fila.fecha_fin),
  };
}

/** Columnas de `funcion` con su película y su sala (sin butacas). Otros servicios lo anidan en sus consultas. */
export const SELECT_FUNCION = `id, fecha_inicio, fecha_fin, precio, puntos, butacas_reservadas, pelicula(${SELECT_PELICULA}), sala(id, nombre)`;

/** Igual que `SELECT_FUNCION`, pero con las butacas de la sala. */
const SELECT_FUNCION_CON_BUTACAS = `id, fecha_inicio, fecha_fin, precio, puntos, butacas_reservadas, pelicula(${SELECT_PELICULA}), sala(id, nombre, butaca(identificador, es_especial, es_discapacitados))`;

/** Fila de `funcion`. Las fechas son `timestamptz`: llegan como string ISO. */
export interface FilaFuncion {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  precio: number;
  puntos: number;
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
    puntos: fila.puntos,
    butacasReservadas: fila.butacas_reservadas,
  };
}

export interface EntradasDiariasPelicula {
  nombre: string;
  /** Entradas vendidas por día, con el día en formato `YYYY-MM-DD` (UTC, como se muestran las funciones). */
  entradasPorDia: Map<string, number>;
}

interface FilaReservaPorPelicula {
  butacas: string[];
  funcion: { fecha_inicio: string; pelicula: { id: string; nombre: string } };
}

interface FilaReservaVerificada {
  butacas: string[];
  funcion: { pelicula: FilaPelicula };
}

const CANTIDAD_PELICULAS_MAS_VISTAS = 3;
const CANTIDAD_PELICULAS_GRAFICO = 5;

@Injectable({ providedIn: 'root' })
export class FuncionService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Crea la función. La base de datos rechaza la inserción si no se respetan los
   * 30 minutos de intervalo con otra función de la misma sala.
   */
  async crearFuncion({ pelicula, sala, fechaInicio, fechaFin, precio, puntos }: SolicitudCrearFuncion): Promise<Funcion> {
    const { data, error } = await this.supabase.cliente
      .from('funcion')
      .insert({
        pelicula_id: pelicula.id,
        sala_id: sala.id,
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        precio,
        puntos,
      })
      .select(SELECT_FUNCION)
      .single<FilaFuncion>();

    if (error) throw error;
    return convertirFilaEnFuncion(data);
  }

  /**
   * Crea una función recurrente para los días de la semana indicados dentro del rango de
   * fechas dado. La sala se asigna automáticamente: la base de datos rechaza la operación
   * si no encuentra ninguna sala libre para algún día del rango.
   */
  async crearFuncionesRecurrentes({
    peliculaId,
    diasSemana,
    horario,
    fechaDesde,
    fechaHasta,
    precio,
    puntos,
  }: SolicitudCrearFuncionesRecurrentes): Promise<FuncionRecurrenteCreada[]> {
    const { data, error } = await this.supabase.cliente.rpc('crear_funciones_recurrentes', {
      p_pelicula_id: peliculaId,
      p_dias_semana: diasSemana,
      p_hora: horario,
      p_fecha_desde: fechaDesde,
      p_fecha_hasta: fechaHasta,
      p_precio: precio,
      p_puntos: puntos,
    });

    if (error) throw error;
    return (data as FilaFuncionRecurrenteCreada[]).map(convertirFilaEnFuncionRecurrenteCreada);
  }

  /**
   * Actualiza la película, el horario, el precio y los puntos de la función (la sala no cambia).
   * Rechaza el cambio si no se respetan los 30 minutos de intervalo con otra función de la misma sala.
   */
  async actualizarFuncion(
    idFuncion: string,
    { pelicula, fechaInicio, fechaFin, precio, puntos }: SolicitudActualizarFuncion,
  ): Promise<Funcion> {
    const { data: actual, error: errorActual } = await this.supabase.cliente
      .from('funcion')
      .select('sala_id')
      .eq('id', idFuncion)
      .single<{ sala_id: string }>();
    if (errorActual) throw errorActual;

    const intervaloMs = MINUTOS_INTERVALO_SALA * 60_000;
    const { count, error: errorSolapamiento } = await this.supabase.cliente
      .from('funcion')
      .select('id', { count: 'exact', head: true })
      .eq('sala_id', actual.sala_id)
      .neq('id', idFuncion)
      .lt('fecha_inicio', new Date(fechaFin.getTime() + intervaloMs).toISOString())
      .gt('fecha_fin', new Date(fechaInicio.getTime() - intervaloMs).toISOString());
    if (errorSolapamiento) throw errorSolapamiento;
    if (count) {
      throw new Error(
        `La sala ya tiene una función en ese horario. Dejá al menos ${MINUTOS_INTERVALO_SALA} minutos entre funciones.`,
      );
    }

    const { data, error } = await this.supabase.cliente
      .from('funcion')
      .update({
        pelicula_id: pelicula.id,
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        precio,
        puntos,
      })
      .eq('id', idFuncion)
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

  /**
   * Notifica las butacas reservadas de la función: primero su estado actual y luego cada cambio en tiempo real.
   * Se suscribe antes de leer el estado para no perder cambios entre la lectura y la suscripción.
   * Devuelve la función que cancela la suscripción.
   */
  suscribirseAButacasReservadas(idFuncion: string, alCambiar: (butacasReservadas: string[]) => void): () => void {
    let activa = true;
    let huboCambioEnTiempoReal = false;

    const canal = this.supabase.cliente
      .channel(`funcion-${idFuncion}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'funcion', filter: `id=eq.${idFuncion}` },
        (payload) => {
          if (!activa) return;
          huboCambioEnTiempoReal = true;
          alCambiar(payload.new['butacas_reservadas'] as string[]);
        },
      )
      .subscribe();

    void this.supabase.cliente
      .from('funcion')
      .select('butacas_reservadas')
      .eq('id', idFuncion)
      .maybeSingle<{ butacas_reservadas: string[] }>()
      .then(({ data }) => {
        // Un cambio en tiempo real es posterior a la lectura: no se pisa con ella.
        if (activa && !huboCambioEnTiempoReal && data) alCambiar(data.butacas_reservadas);
      });

    return () => {
      activa = false;
      void this.supabase.cliente.removeChannel(canal);
    };
  }

  /** Devuelve todas las funciones cargadas, ordenadas por fecha de inicio. */
  async obtenerFunciones(): Promise<Funcion[]> {
    const { data, error } = await this.supabase.cliente
      .from('funcion')
      .select(SELECT_FUNCION)
      .order('fecha_inicio')
      .returns<FilaFuncion[]>();

    if (error) throw error;
    return data.map(convertirFilaEnFuncion);
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

  /**
   * Devuelve las películas con funciones próximas cuyo nombre o categoría contiene `termino`
   * (sin distinguir mayúsculas ni acentos), ordenadas por nombre. Cada una incluye su función más próxima.
   */
  async buscarPeliculasConFuncionesProximas(termino: string): Promise<ResultadoBusquedaPelicula[]> {
    const terminoNormalizado = normalizarTexto(termino);
    const funciones = await this.obtenerFuncionesProximas();

    const funcionProximaPorPelicula = new Map<string, Funcion>();
    for (const funcion of funciones) {
      const { pelicula } = funcion;
      const coincide =
        normalizarTexto(pelicula.nombre).includes(terminoNormalizado) ||
        pelicula.categorias.some((categoria) => normalizarTexto(categoria.nombre).includes(terminoNormalizado));

      // Las funciones llegan ordenadas por fecha de inicio: la primera de cada película es la más próxima.
      if (coincide && !funcionProximaPorPelicula.has(pelicula.id)) {
        funcionProximaPorPelicula.set(pelicula.id, funcion);
      }
    }

    return [...funcionProximaPorPelicula.values()]
      .map((funcionProxima) => ({ pelicula: funcionProxima.pelicula, funcionProxima }))
      .sort((a, b) => a.pelicula.nombre.localeCompare(b.pelicula.nombre));
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

  /** Devuelve las butacas reservadas de todas las funciones (pasadas y próximas), por id de película. */
  async obtenerButacasReservadasPorPelicula(): Promise<Map<string, number>> {
    const { data, error } = await this.supabase.cliente
      .from('funcion')
      .select('pelicula_id, butacas_reservadas')
      .returns<{ pelicula_id: string; butacas_reservadas: string[] }[]>();

    if (error) throw error;

    const reservasPorPelicula = new Map<string, number>();
    for (const { pelicula_id, butacas_reservadas } of data) {
      reservasPorPelicula.set(pelicula_id, (reservasPorPelicula.get(pelicula_id) ?? 0) + butacas_reservadas.length);
    }
    return reservasPorPelicula;
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

  /**
   * Devuelve las películas con más entradas vendidas para funciones que comenzaron entre `desde` y
   * este momento, de mayor a menor, con las entradas de cada día.
   */
  async obtenerEntradasDiariasPorPelicula(desde: Date, cantidad = CANTIDAD_PELICULAS_GRAFICO): Promise<EntradasDiariasPelicula[]> {
    const { data, error } = await this.supabase.cliente
      .from('reserva')
      .select('butacas, funcion!inner(fecha_inicio, pelicula(id, nombre))')
      .gte('funcion.fecha_inicio', desde.toISOString())
      .lte('funcion.fecha_inicio', new Date().toISOString())
      .returns<FilaReservaPorPelicula[]>();

    if (error) throw error;

    const entradasPorPelicula = new Map<string, EntradasDiariasPelicula & { total: number }>();
    for (const { butacas, funcion } of data) {
      let acumulado = entradasPorPelicula.get(funcion.pelicula.id);
      if (!acumulado) {
        acumulado = { nombre: funcion.pelicula.nombre, entradasPorDia: new Map(), total: 0 };
        entradasPorPelicula.set(funcion.pelicula.id, acumulado);
      }
      const dia = funcion.fecha_inicio.slice(0, 10);
      acumulado.entradasPorDia.set(dia, (acumulado.entradasPorDia.get(dia) ?? 0) + butacas.length);
      acumulado.total += butacas.length;
    }

    return [...entradasPorPelicula.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, cantidad)
      .map(({ nombre, entradasPorDia }) => ({ nombre, entradasPorDia }));
  }
}
