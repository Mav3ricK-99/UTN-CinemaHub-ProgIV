import { inject, Injectable } from '@angular/core';

import { Configuracion } from '../classes/configuracion';
import { SupabaseService } from './supabase.service';

interface FilaConfiguracion {
  descuento_primera_compra_porcentaje: number;
}

function convertirFilaEnConfiguracion(fila: FilaConfiguracion): Configuracion {
  return { descuentoPrimeraCompra: Number(fila.descuento_primera_compra_porcentaje) };
}

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly supabase = inject(SupabaseService);

  /** Devuelve la configuración global (tabla singleton de una sola fila). */
  async obtenerConfiguracion(): Promise<Configuracion> {
    const { data, error } = await this.supabase.cliente
      .from('configuracion')
      .select('descuento_primera_compra_porcentaje')
      .single<FilaConfiguracion>();

    if (error) throw error;
    return convertirFilaEnConfiguracion(data);
  }

  /** Reemplaza la configuración global y devuelve el registro guardado. */
  async modificarConfiguracion({ descuentoPrimeraCompra }: Configuracion): Promise<Configuracion> {
    const { data, error } = await this.supabase.cliente
      .from('configuracion')
      .update({ descuento_primera_compra_porcentaje: descuentoPrimeraCompra })
      .eq('id', true)
      .select('descuento_primera_compra_porcentaje')
      .single<FilaConfiguracion>();

    if (error) throw error;
    return convertirFilaEnConfiguracion(data);
  }
}
