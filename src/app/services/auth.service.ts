import { inject, Injectable, signal } from '@angular/core';

import { RolUsuario, Usuario } from '../classes/usuario';
import { SupabaseService } from './supabase.service';

export interface SolicitudRegistro {
  email: string;
  nombre: string;
  contrasena: string;
  fechaNacimiento: Date;
}

export type EstadoRegistro = 'sesionIniciada' | 'confirmacionPendiente' | 'emailRegistrado';

export interface SolicitudIngreso {
  email: string;
  contrasena: string;
}

export type EstadoIngreso = 'sesionIniciada' | 'credencialesInvalidas' | 'emailSinConfirmar';

interface FilaUsuario {
  id: string;
  email: string;
  nombre: string;
  fecha_nacimiento: string;
  rol: RolUsuario;
}

function formatearFechaIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function convertirFilaEnUsuario(fila: FilaUsuario): Usuario {
  const [anio, mes, dia] = fila.fecha_nacimiento.split('-').map(Number);
  return {
    id: fila.id,
    email: fila.email,
    nombre: fila.nombre,
    fechaNacimiento: new Date(anio, mes - 1, dia),
    rol: fila.rol,
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly usuarioActual = signal<Usuario | null>(null);

  /** Usuario con sesión iniciada. Vale `null` para un usuario anónimo. */
  readonly usuario = this.usuarioActual.asReadonly();

  /** Se resuelve cuando termina de leerse la sesión guardada. Los guards esperan esta promesa. */
  readonly inicializado = new Promise<void>((resolver) => {
    this.supabase.cliente.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'TOKEN_REFRESHED') return;

      // supabase-js bloquea el cliente hasta que el callback retorna: la consulta va fuera del callback.
      setTimeout(async () => {
        await this.cargarUsuario(sesion?.user.id ?? null);
        resolver();
      });
    });
  });

  /** Consulta la función `email_registrado` de Postgres, que busca el correo en `auth.users`. */
  async emailRegistrado(email: string): Promise<boolean> {
    const { data, error } = await this.supabase.cliente.rpc('email_registrado', { p_email: email });
    if (error) throw error;
    return data === true;
  }

  /**
   * Crea el usuario en Supabase Auth.
   * El trigger `crear_usuario_desde_auth` inserta la fila en `usuario` con rol `cliente`.
   */
  async registrar({ email, nombre, contrasena, fechaNacimiento }: SolicitudRegistro): Promise<EstadoRegistro> {
    const { data, error } = await this.supabase.cliente.auth.signUp({
      email,
      password: contrasena,
      options: { data: { nombre, fecha_nacimiento: formatearFechaIso(fechaNacimiento) } },
    });

    if (error?.code === 'user_already_exists') return 'emailRegistrado';
    if (error) throw error;

    // Con confirmación de correo activa, Supabase no informa el duplicado y devuelve un usuario sin identidades.
    if (data.user?.identities?.length === 0) return 'emailRegistrado';

    return data.session ? 'sesionIniciada' : 'confirmacionPendiente';
  }

  /** Inicia sesión con correo y contraseña. Los errores inesperados se propagan como excepción. */
  async iniciarSesion({ email, contrasena }: SolicitudIngreso): Promise<EstadoIngreso> {
    const { error } = await this.supabase.cliente.auth.signInWithPassword({ email, password: contrasena });

    if (error?.code === 'invalid_credentials') return 'credencialesInvalidas';
    if (error?.code === 'email_not_confirmed') return 'emailSinConfirmar';
    if (error) throw error;

    return 'sesionIniciada';
  }

  private async cargarUsuario(idUsuario: string | null): Promise<void> {
    if (!idUsuario) {
      this.usuarioActual.set(null);
      return;
    }

    const { data, error } = await this.supabase.cliente
      .from('usuario')
      .select('id, email, nombre, fecha_nacimiento, rol')
      .eq('id', idUsuario)
      .single<FilaUsuario>();

    this.usuarioActual.set(error ? null : convertirFilaEnUsuario(data));
  }
}
