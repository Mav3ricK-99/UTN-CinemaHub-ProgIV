import { inject, Injectable } from '@angular/core';

import { Categoria } from '../classes/categoria';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly supabase = inject(SupabaseService);

  /** Devuelve todas las categorías de película, ordenadas por nombre. */
  async obtenerCategorias(): Promise<Categoria[]> {
    const { data, error } = await this.supabase.cliente
      .from('categoria')
      .select('id, nombre')
      .order('nombre')
      .returns<Categoria[]>();

    if (error) throw error;
    return data;
  }
}
