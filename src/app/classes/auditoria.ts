export type ModeloAuditoria = 'reserva' | 'orden' | 'pelicula' | 'funcion' | 'articulo' | 'resena' | 'configuracion';

export type AccionAuditoria = 'Validacion' | 'Creacion' | 'Modificacion' | 'Eliminacion';

/** Registro de un cambio en la base de datos. Lo genera un trigger de Supabase. */
export interface Auditoria {
  id: string;
  modelo: ModeloAuditoria;
  /** Id del registro afectado. Es texto porque `configuracion.id` es booleano. */
  modeloId: string;
  accion: AccionAuditoria;
  /** `null` si el cambio vino sin sesión o si el usuario se borró después. */
  usuarioId: string | null;
  /** `null` si no hay usuario asociado. */
  usuarioNombre: string | null;
  fecha: Date;
}
