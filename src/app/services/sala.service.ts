import { inject, Injectable } from '@angular/core';

import { Sala } from '../classes/sala';
import { SupabaseService } from './supabase.service';

/** Fila de `sala`. `butaca` llega solo cuando la consulta la embebe (detalle de función). */
export interface FilaSala {
  id: string;
  nombre: string;
  butaca?: { identificador: string; es_especial: boolean }[];
}

export function convertirFilaEnSala(fila: FilaSala): Sala {
  return {
    id: fila.id,
    nombre: fila.nombre,
    butacas: (fila.butaca ?? []).map((butaca) => ({ id: butaca.identificador, esEspecial: butaca.es_especial })),
  };
}

@Injectable({ providedIn: 'root' })
export class SalaService {
  private readonly supabase = inject(SupabaseService);

  /** Devuelve las salas ordenadas por nombre, sin sus butacas. */
  async obtenerSalas(): Promise<Sala[]> {
    const { data, error } = await this.supabase.cliente
      .from('sala')
      .select('id, nombre')
      .order('nombre')
      .returns<FilaSala[]>();

    if (error) throw error;
    return data.map(convertirFilaEnSala);
  }
}
