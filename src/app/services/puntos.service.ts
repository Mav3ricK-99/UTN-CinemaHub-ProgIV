import { inject, Injectable } from '@angular/core';

import { MovimientoPuntos, TipoMovimientoPuntos } from '../classes/movimiento-puntos';
import { OrdenService } from './orden.service';
import { SupabaseService } from './supabase.service';

/** Fila de la vista `historial_puntos_usuario`. */
interface FilaHistorialPuntos {
  usuario_id: string;
  orden_id: string;
  fecha_creacion: string;
  tipo: TipoMovimientoPuntos;
  puntos: number;
}

@Injectable({ providedIn: 'root' })
export class PuntosService {
  private readonly supabase = inject(SupabaseService);
  private readonly ordenService = inject(OrdenService);

  /** Devuelve los movimientos de puntos del usuario, del más reciente al más antiguo, con la película de cada orden. */
  async obtenerHistorial(idUsuario: string): Promise<MovimientoPuntos[]> {
    const [consulta, ordenes] = await Promise.all([
      this.supabase.cliente
        .from('historial_puntos_usuario')
        .select('usuario_id, orden_id, fecha_creacion, tipo, puntos')
        .eq('usuario_id', idUsuario)
        .order('fecha_creacion', { ascending: false })
        .returns<FilaHistorialPuntos[]>(),
      this.ordenService.obtenerOrdenes({ idUsuario }),
    ]);

    if (consulta.error) throw consulta.error;

    const peliculaPorOrden = new Map(ordenes.map(({ orden, reserva }) => [orden.id, reserva.funcion.pelicula]));

    return consulta.data.flatMap((fila) => {
      const pelicula = peliculaPorOrden.get(fila.orden_id);
      if (!pelicula) return [];
      return [
        {
          ordenId: fila.orden_id,
          fechaCreacion: new Date(fila.fecha_creacion),
          tipo: fila.tipo,
          puntos: Math.abs(fila.puntos),
          pelicula,
        },
      ];
    });
  }
}
