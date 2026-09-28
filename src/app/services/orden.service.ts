import { inject, Injectable } from '@angular/core';

import { Articulo } from '../classes/articulo';
import { Funcion } from '../classes/funcion';
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
  fecha_verificacion: string | null;
  fecha_creacion: string;
  usuario: FilaUsuario | null;
  /** PostgREST devuelve un objeto si la relación es 1 a 1, o una lista si la detecta como 1 a N. */
  reserva: FilaReserva | FilaReserva[];
}

const SELECT_ORDEN = `id, email_contacto, descuento_aplicado, total, qr_data, verificada, fecha_verificacion, fecha_creacion, usuario(id, email, nombre, fecha_nacimiento, rol), reserva(id, butacas, precio_butacas, precio_articulos, funcion(${SELECT_FUNCION}), reserva_articulo(articulo(id, nombre, precio, disponible, categoria_articulo(id, nombre))))`;

function convertirFilaEnOrdenConReserva(fila: FilaOrden): OrdenConReserva {
  const filaReserva = Array.isArray(fila.reserva) ? fila.reserva[0] : fila.reserva;
  if (!filaReserva) throw new Error('La orden no tiene una reserva asociada.');

  const orden: Orden = {
    id: fila.id,
    usuario: fila.usuario ? convertirFilaEnUsuario(fila.usuario) : null,
    emailContacto: fila.email_contacto,
    descuentoAplicado: fila.descuento_aplicado,
    total: fila.total,
    qrData: fila.qr_data,
    verificada: fila.verificada,
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

@Injectable({ providedIn: 'root' })
export class OrdenService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Crea la orden de compra y la reserva de butacas/artículos asociada.
   * TODO: calcular `descuentoAplicado` según las reglas de negocio (primera
   * compra, mayores de 50 años) a partir de la tabla `configuracion`.
   */
  async crearOrden({ funcion, butacas, articulos, usuario, emailContacto }: SolicitudCrearOrden): Promise<OrdenConReserva> {
    const descuentoAplicado = 0;
    const precioButacas = butacas.length * funcion.precio;
    const precioArticulos = articulos.reduce((total, articulo) => total + articulo.precio, 0);
    const total = precioButacas + precioArticulos - descuentoAplicado;
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
          .insert(articulos.map((articulo) => ({ reserva_id: filaReserva.id, articulo_id: articulo.id })));
        if (errorArticulos) throw errorArticulos;
      }

      const orden: Orden = {
        id: filaOrden.id,
        usuario,
        emailContacto: usuario ? null : emailContacto,
        descuentoAplicado,
        total,
        qrData,
        verificada: false,
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
    return convertirFilaEnOrdenConReserva(data).orden;
  }

  /** Devuelve las órdenes (con su reserva), de la más reciente a la más antigua. Con `idUsuario`, solo las de ese usuario. */
  async obtenerOrdenes({ idUsuario }: FiltroOrdenes = {}): Promise<OrdenConReserva[]> {
    let consulta = this.supabase.cliente.from('orden').select(SELECT_ORDEN);
    if (idUsuario) consulta = consulta.eq('usuario_id', idUsuario);

    const { data, error } = await consulta.order('fecha_creacion', { ascending: false }).returns<FilaOrden[]>();
    if (error) throw error;
    return data.map(convertirFilaEnOrdenConReserva);
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
