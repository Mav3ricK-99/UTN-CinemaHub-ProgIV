import { inject, Injectable } from '@angular/core';

import { CategoriaArticulo } from '../classes/categoria-articulo';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class CategoriaArticuloService {
  private readonly supabase = inject(SupabaseService);

  /** Devuelve todas las categorías de artículo, ordenadas por nombre. */
  async obtenerCategoriasArticulo(): Promise<CategoriaArticulo[]> {
    const { data, error } = await this.supabase.cliente
      .from('categoria_articulo')
      .select('id, nombre')
      .order('nombre')
      .returns<CategoriaArticulo[]>();

    if (error) throw error;
    return data;
  }
}
