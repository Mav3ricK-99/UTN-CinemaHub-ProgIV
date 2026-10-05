import { inject, Injectable, signal } from '@angular/core';

import { Pelicula } from '../classes/pelicula';
import { Resena } from '../classes/resena';
import { Usuario } from '../classes/usuario';
import { OrdenService } from './orden.service';
import { ResenaService } from './resena.service';
import { SupabaseService } from './supabase.service';
import { UsuarioService } from './usuario.service';

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

export interface AsistenciaPelicula {
  pelicula: Pelicula;
  butacas: string[];
  fechaAsistencia: Date;
  resena: Resena | null;
}

function formatearFechaIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly ordenService = inject(OrdenService);
  private readonly resenaService = inject(ResenaService);
  private readonly usuarioService = inject(UsuarioService);
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

  /** Cierra la sesión del usuario actual. */
  async cerrarSesion(): Promise<void> {
    await this.supabase.cliente.auth.signOut();
  }

  /**
   * Devuelve las películas que el usuario ya vio: las de las funciones finalizadas
   * de sus órdenes, con las butacas reservadas y su reseña (si existe).
   * Una película con varias órdenes aparece una vez, con la asistencia más reciente.
   */
  async obtenerPeliculasVistas(usuario: Usuario): Promise<AsistenciaPelicula[]> {
    const [ordenes, resenas] = await Promise.all([
      this.ordenService.obtenerOrdenes({ idUsuario: usuario.id }),
      this.resenaService.obtenerResenasDeUsuario(usuario.id),
    ]);

    const resenaPorPelicula = new Map(resenas.map((resena) => [resena.pelicula.id, resena]));
    const asistenciaPorPelicula = new Map<string, AsistenciaPelicula>();
    const ahora = Date.now();

    for (const { reserva } of ordenes) {
      const { funcion, butacas } = reserva;
      if (funcion.fechaFin.getTime() >= ahora) continue;

      const existente = asistenciaPorPelicula.get(funcion.pelicula.id);
      if (existente && existente.fechaAsistencia >= funcion.fechaFin) continue;

      asistenciaPorPelicula.set(funcion.pelicula.id, {
        pelicula: funcion.pelicula,
        butacas,
        fechaAsistencia: funcion.fechaFin,
        resena: resenaPorPelicula.get(funcion.pelicula.id) ?? null,
      });
    }

    return [...asistenciaPorPelicula.values()].sort(
      (a, b) => b.fechaAsistencia.getTime() - a.fechaAsistencia.getTime(),
    );
  }

  /** Vuelve a leer el usuario con sesión iniciada, por ejemplo para actualizar su saldo de puntos. */
  async actualizarUsuario(): Promise<void> {
    await this.cargarUsuario(this.usuarioActual()?.id ?? null);
  }

  private async cargarUsuario(idUsuario: string | null): Promise<void> {
    if (!idUsuario) {
      this.usuarioActual.set(null);
      return;
    }

    try {
      this.usuarioActual.set(await this.usuarioService.obtenerUsuarioPorId(idUsuario));
    } catch {
      this.usuarioActual.set(null);
    }
  }
}
