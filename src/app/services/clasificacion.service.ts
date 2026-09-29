import { inject, Injectable } from '@angular/core';

import { Clasificacion, obtenerEdadMinima } from '../classes/clasificacion';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ClasificacionService {
  private readonly supabase = inject(SupabaseService);

  /** Devuelve todas las clasificaciones, ordenadas de menor a mayor edad mínima. */
  async obtenerClasificaciones(): Promise<Clasificacion[]> {
    const { data, error } = await this.supabase.cliente
      .from('clasificacion')
      .select('id, codigo, descripcion')
      .returns<Clasificacion[]>();

    if (error) throw error;
    return data.sort((a, b) => obtenerEdadMinima(a) - obtenerEdadMinima(b));
  }
}
