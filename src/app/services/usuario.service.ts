import { inject, Injectable } from '@angular/core';

import { RolUsuario, Usuario } from '../classes/usuario';
import { SupabaseService } from './supabase.service';

/** Fila de `usuario`. `fecha_nacimiento` es un `date` de Postgres: llega como `'YYYY-MM-DD'`. */
export interface FilaUsuario {
  id: string;
  email: string;
  nombre: string;
  fecha_nacimiento: string;
  rol: RolUsuario;
  saldo: number;
  puntos: number;
}

export function convertirFilaEnUsuario(fila: FilaUsuario): Usuario {
  const [anio, mes, dia] = fila.fecha_nacimiento.split('-').map(Number);
  return {
    id: fila.id,
    email: fila.email,
    nombre: fila.nombre,
    fechaNacimiento: new Date(anio, mes - 1, dia),
    rol: fila.rol,
    saldo: fila.saldo,
    puntos: fila.puntos,
  };
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly supabase = inject(SupabaseService);

  /** Devuelve el usuario con el id indicado, o `null` si no existe o no hay permiso para leerlo. */
  async obtenerUsuarioPorId(idUsuario: string): Promise<Usuario | null> {
    const { data, error } = await this.supabase.cliente
      .from('usuario')
      .select('id, email, nombre, fecha_nacimiento, rol, saldo, puntos')
      .eq('id', idUsuario)
      .maybeSingle<FilaUsuario>();

    if (error) throw error;
    return data ? convertirFilaEnUsuario(data) : null;
  }
}
