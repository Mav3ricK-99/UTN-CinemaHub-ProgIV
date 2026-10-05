import { inject, Injectable } from '@angular/core';

import { Articulo } from '../classes/articulo';
import { calcularPrecioButacas, Funcion } from '../classes/funcion';
import { generarCodigoOrden, Orden } from '../classes/orden';
import { Reserva } from '../classes/reserva';
import { Usuario } from '../classes/usuario';
import { convertirFilaEnArticulo, FilaArticulo } from './articulo.service';
import { convertirFilaEnFuncion, FilaFuncion, SELECT_FUNCION } from './funcion.service';
import { SupabaseService } from './supabase.service';
import { convertirFilaEnUsuario, FilaUsuario } from './usuario.service';

export interface SolicitudCrearOrden {
  funcion: Funcion;
  butacas: string[];
  articulos: Articulo[];
  usuario: Usuario | null;
  emailContacto: string | null;
  pagoConPuntos: boolean;
  /** Descuenta el total de la orden del saldo del usuario. Excluyente con `pagoConPuntos`. */
  pagoConSaldo: boolean;
}

export interface OrdenConReserva {
  orden: Orden;
  reserva: Reserva;
}

export interface FiltroOrdenes {
  idUsuario?: string;
}

interface FilaReserva {
  id: string;
  butacas: string[];
  precio_butacas: number;
  precio_articulos: number;
  funcion: FilaFuncion;
  reserva_articulo: { articulo: FilaArticulo }[];
}

interface FilaOrden {
  id: string;
  email_contacto: string | null;
  descuento_aplicado: number;
  total: number;
  qr_data: string;
  verificada: boolean;
  pago_con_puntos: boolean;
  puntos_utilizados: number | null;
  fecha_verificacion: string | null;
  fecha_creacion: string;
  usuario: FilaUsuario | null;
  /** PostgREST devuelve un objeto si la relación es 1 a 1, o una lista si la detecta como 1 a N. */
  reserva: FilaReserva | FilaReserva[];
}

const SELECT_ORDEN = `id, email_contacto, descuento_aplicado, total, qr_data, verificada, pago_con_puntos, puntos_utilizados, fecha_verificacion, fecha_creacion, usuario(id, email, nombre, fecha_nacimiento, rol, saldo, puntos), reserva(id, butacas, precio_butacas, precio_articulos, funcion(${SELECT_FUNCION}), reserva_articulo(articulo(id, nombre, precio, puntos, disponible, categoria_articulo(id, nombre))))`;

/** Devuelve `null` si la orden no tiene reserva: al anular una reserva se elimina y la orden queda verificada. */
function convertirFilaEnOrdenConReserva(fila: FilaOrden): OrdenConReserva | null {
  const filaReserva = Array.isArray(fila.reserva) ? fila.reserva[0] : fila.reserva;
  if (!filaReserva) return null;

  const orden: Orden = {
    id: fila.id,
    usuario: fila.usuario ? convertirFilaEnUsuario(fila.usuario) : null,
    emailContacto: fila.email_contacto,
    descuentoAplicado: fila.descuento_aplicado,
    total: fila.total,
    qrData: fila.qr_data,
    verificada: fila.verificada,
    pagoConPuntos: fila.pago_con_puntos,
    puntosUtilizados: fila.puntos_utilizados,
    fechaVerificacion: fila.fecha_verificacion ? new Date(fila.fecha_verificacion) : null,
    fechaCreacion: new Date(fila.fecha_creacion),
  };

  const reserva: Reserva = {
    id: filaReserva.id,
    orden,
    funcion: convertirFilaEnFuncion(filaReserva.funcion),
    butacas: filaReserva.butacas,
    articulos: filaReserva.reserva_articulo.map(({ articulo }) => convertirFilaEnArticulo(articulo)),
    precioButacas: filaReserva.precio_butacas,
    precioArticulos: filaReserva.precio_articulos,
  };

  return { orden, reserva };
}

/** Suma los puntos de las butacas (puntos de la función por butaca) y de los artículos. */
export function calcularPuntosOrden(funcion: Funcion, cantidadButacas: number, articulos: Articulo[]): number {
  return cantidadButacas * funcion.puntos + articulos.reduce((total, articulo) => total + articulo.puntos, 0);
}

/** Calcula el total en dinero de las butacas (con recargo) y los artículos, sin descuentos. */
export function calcularTotalOrden(funcion: Funcion, butacas: string[], articulos: Articulo[]): number {
  return calcularPrecioButacas(funcion, butacas) + articulos.reduce((total, articulo) => total + articulo.precio, 0);
}

@Injectable({ providedIn: 'root' })
export class OrdenService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Crea la orden de compra y la reserva de butacas/artículos asociada.
   * TODO: calcular `descuentoAplicado` según las reglas de negocio (primera
   * compra, mayores de 50 años) a partir de la tabla `configuracion`.
   * Con `pagoConPuntos`, guarda los puntos de las butacas y los artículos en `puntos_utilizados`.
   * La base de datos acredita y descuenta los puntos del usuario.
   * Con `pagoConSaldo`, descuenta el total del `saldo` del usuario al terminar de crear la reserva.
   */
  async crearOrden({ funcion, butacas, articulos, usuario, emailContacto, pagoConPuntos, pagoConSaldo }: SolicitudCrearOrden): Promise<OrdenConReserva> {
    if (pagoConSaldo && (!usuario || pagoConPuntos)) {
      throw new Error('El pago con saldo requiere un usuario registrado y no puede combinarse con puntos.');
    }

    const descuentoAplicado = 0;
    const precioButacas = calcularPrecioButacas(funcion, butacas);
    const precioArticulos = articulos.reduce((total, articulo) => total + articulo.precio, 0);
    const total = precioButacas + precioArticulos - descuentoAplicado;
    const puntosUtilizados = pagoConPuntos ? calcularPuntosOrden(funcion, butacas.length, articulos) : null;
    const qrData = generarCodigoOrden();

    const { data: filaOrden, error: errorOrden } = await this.supabase.cliente
      .from('orden')
      .insert({
        usuario_id: usuario?.id ?? null,
        email_contacto: usuario ? null : emailContacto,
        descuento_aplicado: descuentoAplicado,
        total,
        qr_data: qrData,
        verificada: false,
        pago_con_puntos: pagoConPuntos,
        puntos_utilizados: puntosUtilizados,
      })
      .select('id, fecha_creacion')
      .single<{ id: string; fecha_creacion: string }>();
    if (errorOrden) throw errorOrden;

    try {
      const { data: filaReserva, error: errorReserva } = await this.supabase.cliente
        .from('reserva')
        .insert({
          orden_id: filaOrden.id,
          funcion_id: funcion.id,
          butacas,
          precio_butacas: precioButacas,
          precio_articulos: precioArticulos,
        })
        .select('id')
        .single<{ id: string }>();
      if (errorReserva) throw errorReserva;

      if (articulos.length > 0) {
        const { error: errorArticulos } = await this.supabase.cliente
          .from('reserva_articulo')
          .insert(articulos.map((articulo) => {
            return {
              reserva_id: filaReserva.id,
              articulo_id: articulo.id,
              cantidad: 1,
              precio_unitario: pagoConPuntos ? articulo.puntos : articulo.precio};
          }));
        if (errorArticulos) throw errorArticulos;
      }

      if (pagoConSaldo && usuario) await this.descontarSaldo(usuario, total);

      const orden: Orden = {
        id: filaOrden.id,
        usuario,
        emailContacto: usuario ? null : emailContacto,
        descuentoAplicado,
        total,
        qrData,
        verificada: false,
        pagoConPuntos,
        puntosUtilizados,
        fechaVerificacion: null,
        fechaCreacion: new Date(filaOrden.fecha_creacion),
      };
      const reserva: Reserva = { id: filaReserva.id, orden, funcion, butacas, articulos, precioButacas, precioArticulos };
      return { orden, reserva };
    } catch (error) {
      // Sin transacción en el cliente: se elimina la orden para no dejarla sin reserva.
      await this.supabase.cliente.from('orden').delete().eq('id', filaOrden.id);
      throw error;
    }
  }

  /**
   * Descuenta `monto` del saldo del usuario. Solo actualiza si el saldo no cambió desde que
   * se leyó, para no pisar un movimiento concurrente ni dejar el saldo negativo.
   */
  private async descontarSaldo(usuario: Usuario, monto: number): Promise<void> {
    if (usuario.saldo < monto) throw new Error('El saldo no alcanza para cubrir el total de la orden.');

    const { data, error } = await this.supabase.cliente
      .from('usuario')
      .update({ saldo: usuario.saldo - monto })
      .eq('id', usuario.id)
      .eq('saldo', usuario.saldo)
      .select('id');

    if (error) throw error;
    if (data.length === 0) throw new Error('El saldo del usuario cambió. Intentá nuevamente.');
  }

  /** Marca la orden como verificada al confirmar el ingreso en sala. */
  async verificarOrden(idOrden: string): Promise<Orden> {
    const { data, error } = await this.supabase.cliente
      .from('orden')
      .update({ verificada: true, fecha_verificacion: new Date().toISOString() })
      .eq('id', idOrden)
      .select(SELECT_ORDEN)
      .maybeSingle<FilaOrden>();

    if (error) throw error;
    if (!data) throw new Error('La orden no existe.');
    const ordenConReserva = convertirFilaEnOrdenConReserva(data);
    if (!ordenConReserva) throw new Error('La orden no tiene una reserva asociada.');
    return ordenConReserva.orden;
  }

  /** Devuelve las órdenes (con su reserva), de la más reciente a la más antigua. Con `idUsuario`, solo las de ese usuario. */
  async obtenerOrdenes({ idUsuario }: FiltroOrdenes = {}): Promise<OrdenConReserva[]> {
    let consulta = this.supabase.cliente.from('orden').select(SELECT_ORDEN);
    if (idUsuario) consulta = consulta.eq('usuario_id', idUsuario);

    const { data, error } = await consulta.order('fecha_creacion', { ascending: false }).returns<FilaOrden[]>();
    if (error) throw error;
    return data.flatMap((fila) => convertirFilaEnOrdenConReserva(fila) ?? []);
  }

  /** Devuelve las órdenes del usuario cuya función aún no comenzó y no fueron verificadas, de la función más próxima a la más lejana. */
  async obtenerReservasProximas(idUsuario: string): Promise<OrdenConReserva[]> {
    const ahora = Date.now();
    const ordenes = await this.obtenerOrdenes({ idUsuario });

    return ordenes
      .filter(({ orden, reserva }) => !orden.verificada && reserva.funcion.fechaInicio.getTime() > ahora)
      .sort((a, b) => a.reserva.funcion.fechaInicio.getTime() - b.reserva.funcion.fechaInicio.getTime());
  }

  /**
   * Anula la orden con la función de Postgres `cancelar_orden`.
   * La base de datos valida el límite de 2 horas y devuelve el saldo o los puntos al usuario.
   */
  async cancelarOrden(idOrden: string): Promise<void> {
    const { error } = await this.supabase.cliente.rpc('cancelar_orden', { p_orden_id: idOrden });
    if (error) throw error;
  }

  /** Devuelve la orden (con su reserva) con el id indicado, o `null` si no existe. */
  async obtenerOrdenPorId(idOrden: string): Promise<OrdenConReserva | null> {
    const { data, error } = await this.supabase.cliente
      .from('orden')
      .select(SELECT_ORDEN)
      .eq('id', idOrden)
      .maybeSingle<FilaOrden>();

    if (error) throw error;
    return data ? convertirFilaEnOrdenConReserva(data) : null;
  }

  /** Busca la orden cuyo código alfanumérico (`qrData`) coincide, ignorando mayúsculas y espacios. */
  async buscarOrdenPorCodigo(codigo: string): Promise<OrdenConReserva | null> {
    const { data, error } = await this.supabase.cliente
      .from('orden')
      .select(SELECT_ORDEN)
      .eq('qr_data', codigo.trim().toUpperCase())
      .maybeSingle<FilaOrden>();

    if (error) throw error;
    return data ? convertirFilaEnOrdenConReserva(data) : null;
  }

  /** Devuelve la cantidad total de butacas reservadas en todas las órdenes. */
  async contarEntradasVendidas(): Promise<number> {
    const { data, error } = await this.supabase.cliente.from('reserva').select('butacas').returns<{ butacas: string[] }[]>();

    if (error) throw error;
    return data.reduce((total, { butacas }) => total + butacas.length, 0);
  }
}
