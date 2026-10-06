import { inject, Injectable } from '@angular/core';

import { AccionAuditoria, Auditoria, ModeloAuditoria } from '../classes/auditoria';
import { SupabaseService } from './supabase.service';

interface FilaAuditoria {
  id: string;
  modelo: ModeloAuditoria;
  modelo_id: string;
  accion: AccionAuditoria;
  usuario_id: string | null;
  fecha: string;
  usuario: { nombre: string } | null;
}

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly supabase = inject(SupabaseService);

  /** Devuelve las auditorías, de la más reciente a la más antigua. */
  async obtenerAuditorias(): Promise<Auditoria[]> {
    const { data, error } = await this.supabase.cliente
      .from('auditoria')
      .select('id, modelo, modelo_id, accion, usuario_id, fecha, usuario(nombre)')
      .order('fecha', { ascending: false })
      .returns<FilaAuditoria[]>();

    if (error) throw error;
    return data.map((fila) => ({
      id: fila.id,
      modelo: fila.modelo,
      modeloId: fila.modelo_id,
      accion: fila.accion,
      usuarioId: fila.usuario_id,
      usuarioNombre: fila.usuario?.nombre ?? null,
      fecha: new Date(fila.fecha),
    }));
  }
}
