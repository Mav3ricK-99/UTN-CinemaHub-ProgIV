import { inject, Injectable, signal } from '@angular/core';

import { Pelicula } from '../classes/pelicula';
import { Resena } from '../classes/resena';
import { Usuario } from '../classes/usuario';
import { FuncionService } from './funcion.service';

export interface AsistenciaPelicula {
  pelicula: Pelicula;
  butaca: string; //Este deberia ser un Array de Butaca []
  fechaAsistencia: Date;
  resena: Resena | null;
}

export interface SolicitudGuardarResena {
  pelicula: Pelicula;
  usuario: Usuario;
  puntaje: number;
  comentario: string;
}

/** Butacas de prueba asignadas a cada asistencia, hasta definir la tabla `reserva` en Supabase. */
const BUTACAS_DE_PRUEBA = ['F12', 'H7', 'C20', 'J15', 'B3', 'M9', 'D18', 'K5', 'A22', 'N11'];

const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

/** Usuarios de prueba, dueños de las reseñas sembradas para cada película. */
function crearUsuarioDePrueba(id: string, nombre: string): Usuario {
  return { id, email: `${id}@demo.com`, nombre, fechaNacimiento: new Date(1995, 0, 1), rol: 'cliente' };
}

/** Reseñas de otros usuarios sembradas por película, hasta definir la tabla `resena` en Supabase. */
const RESENAS_DE_PRUEBA: { idPelicula: string; nombre: string; puntaje: number; comentario: string; diasAtras: number }[] = [
  { idPelicula: 'pelicula-1', nombre: 'Martina Gómez', puntaje: 5, comentario: 'Una película increíble, la fotografía y el sonido en 3D te dejan sin palabras.', diasAtras: 2 },
  { idPelicula: 'pelicula-1', nombre: 'Lucas Fernández', puntaje: 4, comentario: 'Muy buena, aunque el final se sintió un poco apurado.', diasAtras: 5 },
  { idPelicula: 'pelicula-1', nombre: 'Sofía Ramírez', puntaje: 5, comentario: 'La mejor película de ciencia ficción que vi en mucho tiempo.', diasAtras: 9 },
  { idPelicula: 'pelicula-2', nombre: 'Nicolás Torres', puntaje: 4, comentario: 'Me dejó paranoico toda la semana, el suspenso está muy bien logrado.', diasAtras: 1 },
  { idPelicula: 'pelicula-2', nombre: 'Camila Ibáñez', puntaje: 3, comentario: 'Buena atmósfera pero el ritmo es un poco lento en el medio.', diasAtras: 6 },
  { idPelicula: 'pelicula-4', nombre: 'Julieta Sosa', puntaje: 5, comentario: 'Hermosa animación, la llevé a mis hijos y quedaron fascinados.', diasAtras: 3 },
  { idPelicula: 'pelicula-4', nombre: 'Diego Molina', puntaje: 5, comentario: 'Las escenas en 5D suman muchísimo, una experiencia completa.', diasAtras: 4 },
  { idPelicula: 'pelicula-4', nombre: 'Valentina Castro', puntaje: 4, comentario: 'Muy tierna, aunque un poco corta para lo que esperaba.', diasAtras: 8 },
];

function claveResena(pelicula: Pelicula, usuario: Usuario): string {
  return `${usuario.id}::${pelicula.id}`;
}

function sembrarResenas(): Map<string, Resena> {
  const ahora = Date.now();
  const mapa = new Map<string, Resena>();

  RESENAS_DE_PRUEBA.forEach(({ idPelicula, nombre, puntaje, comentario, diasAtras }, indice) => {
    const usuario = crearUsuarioDePrueba(`usuario-demo-${indice + 1}`, nombre);
    const pelicula: Pelicula = { id: idPelicula } as Pelicula;
    const resena: Resena = {
      id: `resena-demo-${indice + 1}`,
      pelicula,
      usuario,
      puntaje,
      comentario,
      fechaCreacion: new Date(ahora - diasAtras * MILISEGUNDOS_POR_DIA),
      fechaEdicion: null,
    };
    mapa.set(claveResena(pelicula, usuario), resena);
  });

  return mapa;
}

@Injectable({ providedIn: 'root' })
export class ResenaService {
  private readonly funcionService = inject(FuncionService);

  // Usa almacenamiento en memoria hasta definir la tabla `resena` en Supabase.
  private readonly resenas = signal(sembrarResenas());

  /**
   * Devuelve las películas ya asistidas por el usuario, con la butaca y
   * fecha de asistencia, junto a la reseña ya realizada (si existe).
   * Usa datos de prueba hasta poder consultar `orden`/`reserva` en Supabase.
   */
  async obtenerMisPeliculas(usuario: Usuario): Promise<AsistenciaPelicula[]> {
    const funcionesPasadas = await this.funcionService.obtenerFuncionesPasadas();
    const resenas = this.resenas();

    return funcionesPasadas.map((funcion, indice) => ({
      pelicula: funcion.pelicula,
      butaca: BUTACAS_DE_PRUEBA[indice % BUTACAS_DE_PRUEBA.length],
      fechaAsistencia: funcion.fechaFin,
      resena: resenas.get(claveResena(funcion.pelicula, usuario)) ?? null,
    }));
  }

  /** Devuelve las reseñas de una película, de la más reciente a la más antigua. */
  async obtenerResenasDePelicula(pelicula: Pelicula): Promise<Resena[]> {
    return [...this.resenas().values()]
      .filter((resena) => resena.pelicula.id === pelicula.id)
      .sort((a, b) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime());
  }

  /** Crea la reseña de la película, o la edita si el usuario ya había calificado. */
  async guardarResena({ pelicula, usuario, puntaje, comentario }: SolicitudGuardarResena): Promise<Resena> {
    const clave = claveResena(pelicula, usuario);
    const resenaExistente = this.resenas().get(clave);
    const ahora = new Date();

    const resena: Resena = {
      id: resenaExistente?.id ?? crypto.randomUUID(),
      pelicula,
      usuario,
      puntaje,
      comentario,
      fechaCreacion: resenaExistente?.fechaCreacion ?? ahora,
      fechaEdicion: resenaExistente ? ahora : null,
    };

    this.resenas.update((mapa) => new Map(mapa).set(clave, resena));
    return resena;
  }
}
