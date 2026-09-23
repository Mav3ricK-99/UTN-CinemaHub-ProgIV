import { Injectable } from '@angular/core';

import { Funcion } from '../classes/funcion';
import { FormatoPelicula, IdiomaPelicula, Pelicula } from '../classes/pelicula';
import { generarButacas, generarIdsButacas, Sala } from '../classes/sala';

const MILISEGUNDOS_POR_MINUTO = 60 * 1000;
const MILISEGUNDOS_POR_HORA = 60 * MILISEGUNDOS_POR_MINUTO;

/** Precio de entrada según el formato de la función. Datos de prueba hasta definir la tabla en Supabase. */
const PRECIO_POR_FORMATO: Record<FormatoPelicula, number> = {
  '2D': 3500,
  '3D': 4500,
  '4D': 5500,
  '5D': 6500,
};

/** Criterio de prueba: filas J a M, columnas 9 a 20. Reemplazar al definir las butacas especiales. */
function esButacaEspecialDePrueba(idButaca: string): boolean {
  const fila = idButaca[0];
  const columna = Number(idButaca.slice(1));
  return fila >= 'J' && fila <= 'M' && columna >= 9 && columna <= 20;
}

const salaUno: Sala = { nombre: 'Sala 1', butacas: generarButacas(esButacaEspecialDePrueba) };
const salaDos: Sala = { nombre: 'Sala 2', butacas: generarButacas(esButacaEspecialDePrueba) };

/** Butacas ocupadas de prueba para la primera función, incluidas algunas especiales. */
const butacasOcupadasDePrueba = ['A1', 'A2', 'B7', 'C15', 'F3', 'H10', 'J12', 'K14', 'K15', 'L9', 'M20', 'P22', 'S5', 'T28'];

const peliculas: Pelicula[] = [
  {
    id: 'pelicula-1',
    nombre: 'Eclipse Final',
    sinopsis:
      'Una astronauta regresa a una Tierra sumida en la oscuridad y descubre que el último eclipse solar cambió el destino de la humanidad.',
    duracionMinutos: 128,
    imagenUrl: 'https://picsum.photos/seed/eclipse-final/1920/1080',
    formato: '3D',
    idioma: 'Castellano',
    categorias: [{ nombre: 'Ciencia ficción' }, { nombre: 'Drama' }],
    promedioResenas: 4.5,
    cantidadResenas: 128,
  },
  {
    id: 'pelicula-2',
    nombre: 'La Casa del Lago',
    sinopsis:
      'Una familia se muda a una casa aislada junto a un lago helado. Cada noche, el hielo revela un secreto más oscuro que el anterior.',
    duracionMinutos: 104,
    imagenUrl: 'https://picsum.photos/seed/casa-del-lago/1920/1080',
    formato: '2D',
    idioma: 'Subtitulada',
    categorias: [{ nombre: 'Terror' }, { nombre: 'Suspenso' }],
    promedioResenas: 3.8,
    cantidadResenas: 64,
  },
  {
    id: 'pelicula-3',
    nombre: 'Velocidad Máxima',
    sinopsis:
      'Un piloto retirado acepta una última carrera clandestina que cruza tres países y pone en juego su vida y la de su hermano.',
    duracionMinutos: 117,
    imagenUrl: 'https://picsum.photos/seed/velocidad-maxima/1920/1080',
    formato: '4D',
    idioma: 'Castellano',
    categorias: [{ nombre: 'Acción' }],
    promedioResenas: 0,
    cantidadResenas: 0,
  },
  {
    id: 'pelicula-4',
    nombre: 'Mar de Estrellas',
    sinopsis:
      'Dos hermanos animados recorren un océano mágico para devolver una constelación caída al cielo antes del amanecer.',
    duracionMinutos: 96,
    imagenUrl: 'https://picsum.photos/seed/mar-de-estrellas/1920/1080',
    formato: '5D',
    idioma: 'Castellano',
    categorias: [{ nombre: 'Animación' }, { nombre: 'Aventura' }],
    promedioResenas: 4.9,
    cantidadResenas: 210,
  },
];

const peliculasPasadas: Pelicula[] = [
  ['Noche de Neón', 'Acción', '2D', 'Castellano', 112, 4.2, 87],
  ['El Último Verano', 'Drama', '2D', 'Subtitulada', 98, 3.6, 45],
  ['Cazadores de Tormentas', 'Aventura', '4D', 'Castellano', 121, 4.7, 132],
  ['Código Sombra', 'Suspenso', '2D', 'Subtitulada', 109, 3.1, 29],
  ['Reino de Cristal', 'Fantasía', '3D', 'Castellano', 134, 4.4, 96],
  ['Ciudad Dormida', 'Terror', '2D', 'Subtitulada', 92, 2.9, 18],
  ['Pequeños Gigantes', 'Animación', '3D', 'Castellano', 88, 4.8, 156],
  ['Horizonte Rojo', 'Ciencia ficción', '5D', 'Castellano', 125, 0, 0],
  ['La Última Ola', 'Drama', '2D', 'Castellano', 101, 3.9, 52],
  ['Furia en la Ruta', 'Acción', '4D', 'Subtitulada', 115, 4.1, 73],
].map(([nombre, categoria, formato, idioma, duracionMinutos, promedioResenas, cantidadResenas], indice) => ({
  id: `pelicula-pasada-${indice + 1}`,
  nombre: nombre as string,
  sinopsis: 'Película de prueba ya proyectada en el cine.',
  duracionMinutos: duracionMinutos as number,
  imagenUrl: `https://picsum.photos/seed/${encodeURIComponent(nombre as string)}/800/1000`,
  formato: formato as FormatoPelicula,
  idioma: idioma as IdiomaPelicula,
  categorias: [{ nombre: categoria as string }],
  promedioResenas: promedioResenas as number,
  cantidadResenas: cantidadResenas as number,
}));

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

@Injectable({ providedIn: 'root' })
export class FuncionService {
  /**
   * Devuelve las películas cuyo nombre contiene el término, sin distinguir mayúsculas ni tildes.
   * Usa datos de prueba hasta definir las tablas en Supabase.
   */
  async buscarPeliculasPorNombre(termino: string): Promise<Pelicula[]> {
    const terminoNormalizado = normalizarTexto(termino.trim());
    if (!terminoNormalizado) return [];

    return [...peliculas, ...peliculasPasadas].filter((pelicula) =>
      normalizarTexto(pelicula.nombre).includes(terminoNormalizado),
    );
  }

  /**
   * Devuelve la función con el id indicado, o `null` si no existe.
   * Usa datos de prueba hasta definir las tablas en Supabase.
   */
  async obtenerFuncionPorId(id: string): Promise<Funcion | null> {
    const funciones = await this.obtenerFuncionesProximas();
    return funciones.find((funcion) => funcion.id === id) ?? null;
  }

  /**
   * Devuelve las funciones que ya finalizaron, de la más reciente a la más antigua.
   * Usa datos de prueba hasta definir las tablas en Supabase.
   */
  async obtenerFuncionesPasadas(): Promise<Funcion[]> {
    const ahora = Date.now();
    const funciones: Funcion[] = peliculasPasadas.map((pelicula, indice) => {
      const fechaInicio = new Date(ahora - (indice * 3 + 2) * 24 * MILISEGUNDOS_POR_HORA);
      const fechaFin = new Date(fechaInicio.getTime() + pelicula.duracionMinutos * MILISEGUNDOS_POR_MINUTO);
      return {
        id: `funcion-pasada-${indice + 1}`,
        pelicula,
        sala: indice % 2 === 0 ? salaUno : salaDos,
        fechaInicio,
        fechaFin,
        precio: PRECIO_POR_FORMATO[pelicula.formato],
        butacasReservadas: [],
      };
    });

    return funciones
      .filter((funcion) => funcion.fechaFin.getTime() < ahora)
      .sort((a, b) => b.fechaInicio.getTime() - a.fechaInicio.getTime());
  }

  /**
   * Devuelve las funciones que aún no comenzaron, ordenadas por fecha de inicio.
   * Usa datos de prueba hasta definir las tablas en Supabase.
   */
  async obtenerFuncionesProximas(): Promise<Funcion[]> {
    const ahora = Date.now();
    const funciones: Funcion[] = peliculas.map((pelicula, indice) => {
      const fechaInicio = new Date(ahora + (indice * 26 + 20) * MILISEGUNDOS_POR_HORA);
      const fechaFin = new Date(fechaInicio.getTime() + pelicula.duracionMinutos * MILISEGUNDOS_POR_MINUTO);
      return {
        id: `funcion-${indice + 1}`,
        pelicula,
        sala: indice % 2 === 0 ? salaUno : salaDos,
        fechaInicio,
        fechaFin,
        precio: PRECIO_POR_FORMATO[pelicula.formato],
        // La segunda función tiene todas las butacas ocupadas para probar el botón deshabilitado.
        butacasReservadas:
          indice === 1 ? generarIdsButacas() : indice === 0 ? butacasOcupadasDePrueba : [],
      };
    });

    return funciones
      .filter((funcion) => funcion.fechaInicio.getTime() > ahora)
      .sort((a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime());
  }
}
