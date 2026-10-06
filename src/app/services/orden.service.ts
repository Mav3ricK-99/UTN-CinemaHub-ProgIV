import { inject, Injectable } from '@angular/core';

import { Articulo } from '../classes/articulo';
import { ArticuloCombo, ComboDetalle, repartirPrecioCombo } from '../classes/combo';
import { Facturacion } from '../classes/facturacion';
import { calcularPrecioButacas, Funcion } from '../classes/funcion';
import { ComboOrden, generarCodigoOrden, Orden } from '../classes/orden';
import { Reserva } from '../classes/reserva';
import { Usuario } from '../classes/usuario';
import { convertirFilaEnArticulo, FilaArticulo } from './articulo.service';
import { ConfiguracionService } from './configuracion.service';
import { convertirFilaEnFuncion, FilaFuncion, SELECT_FUNCION } from './funcion.service';
import { SupabaseService } from './supabase.service';
import { convertirFilaEnUsuario, FilaUsuario } from './usuario.service';

export interface SolicitudCrearOrden {
  funcion: Funcion;
  butacas: string[];
  articulos: Articulo[];
  /** Con combo, `articulos` se ignora: los artículos y los precios salen del combo. */
  combo: ComboDetalle | null;
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

export interface FiltroFacturaciones {
  fechaDesde: Date | null;
  fechaHasta: Date | null;
  pagoConPuntos: boolean | null;
  verificada: boolean | null;
}

export interface PreciosOrden {
  precioButacas: number;
  precioArticulos: number;
  /** Suma de `precioButacas` y `precioArticulos`, ya con el descuento aplicado. */
  total: number;
  /** Monto descontado respecto del total sin descuento. 0 si no hay descuento. */
  descuentoAplicado: number;
}

interface FilaReservaFacturacion {
  funcion_id: string;
  precio_butacas: number;
  precio_articulos: number;
}

interface FilaFacturacion {
  id: string;
  email_contacto: string | null;
  total: number;
  descuento_aplicado: number;
  verificada: boolean;
  pago_con_puntos: boolean;
  puntos_utilizados: number | null;
  fecha_creacion: string;
  usuario: { email: string } | null;
  /** PostgREST devuelve un objeto si la relación es 1 a 1, o una lista si la detecta como 1 a N. */
  reserva: FilaReservaFacturacion | FilaReservaFacturacion[] | null;
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
  combo: { id: string; nombre: string; precio: number; cantidad_entradas: number } | null;
  /** PostgREST devuelve un objeto si la relación es 1 a 1, o una lista si la detecta como 1 a N. */
  reserva: FilaReserva | FilaReserva[];
}

const SELECT_ORDEN = `id, email_contacto, descuento_aplicado, total, qr_data, verificada, pago_con_puntos, puntos_utilizados, fecha_verificacion, fecha_creacion, usuario(id, email, nombre, fecha_nacimiento, rol, saldo, puntos), combo(id, nombre, precio, cantidad_entradas), reserva(id, butacas, precio_butacas, precio_articulos, funcion(${SELECT_FUNCION}), reserva_articulo(articulo(id, nombre, precio, puntos, disponible, categoria_articulo(id, nombre))))`;

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
    combo: fila.combo
      ? { id: fila.combo.id, nombre: fila.combo.nombre, precio: fila.combo.precio, cantidadEntradas: fila.combo.cantidad_entradas }
      : null,
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

/**
 * Calcula los precios en dinero de las butacas (con recargo) y los artículos.
 * `porcentajeDescuento` (0 a 100) se aplica por separado sobre butacas y artículos, redondeado al peso.
 */
export function calcularPreciosOrden(
  funcion: Funcion,
  butacas: string[],
  articulos: Articulo[],
  porcentajeDescuento = 0,
): PreciosOrden {
  const factor = 1 - porcentajeDescuento / 100;
  const butacasSinDescuento = calcularPrecioButacas(funcion, butacas);
  const articulosSinDescuento = articulos.reduce((total, articulo) => total + articulo.precio, 0);

  const precioButacas = Math.round(butacasSinDescuento * factor);
  const precioArticulos = Math.round(articulosSinDescuento * factor);
  const total = precioButacas + precioArticulos;
  return {
    precioButacas,
    precioArticulos,
    total,
    descuentoAplicado: butacasSinDescuento + articulosSinDescuento - total,
  };
}

@Injectable({ providedIn: 'root' })
export class OrdenService {
  private readonly supabase = inject(SupabaseService);
  private readonly configuracionService = inject(ConfiguracionService);

  /**
   * Devuelve el porcentaje de descuento de primera compra que le corresponde al usuario.
   * Es 0 si es anónimo o si ya tiene una orden con reserva. Las órdenes canceladas no tienen reserva y no cuentan.
   */
  async obtenerPorcentajeDescuentoPrimeraCompra(usuario: Usuario | null): Promise<number> {
    if (!usuario) return 0;

    const { count, error } = await this.supabase.cliente
      .from('orden')
      .select('id, reserva!inner(id)', { count: 'exact', head: true })
      .eq('usuario_id', usuario.id);
    if (error) throw error;
    if (count) return 0;

    const { descuentoPrimeraCompra } = await this.configuracionService.obtenerConfiguracion();
    return descuentoPrimeraCompra;
  }

  /**
   * Crea la orden de compra y la reserva de butacas/artículos asociada.
   * En la primera compra del usuario, con dinero o saldo, aplica el descuento de `configuracion`
   * sobre `precioButacas`, `precioArticulos` y `total`, y guarda el monto en `descuentoAplicado`.
   * Con `pagoConPuntos`, guarda los puntos de las butacas y los artículos en `puntos_utilizados`.
   * La base de datos acredita y descuenta los puntos del usuario.
   * Con `combo`, guarda su id en `combo_id` y arma los precios a partir del combo.
   * Con `pagoConSaldo`, descuenta el total del `saldo` del usuario al terminar de crear la reserva.
   */
  async crearOrden({ funcion, butacas, articulos: articulosElegidos, combo, usuario, emailContacto, pagoConPuntos, pagoConSaldo }: SolicitudCrearOrden): Promise<OrdenConReserva> {
    if (pagoConSaldo && (!usuario || pagoConPuntos)) {
      throw new Error('El pago con saldo requiere un usuario registrado y no puede combinarse con puntos.');
    }
    if (combo && butacas.length !== combo.cantidadEntradas) {
      throw new Error(`El combo requiere exactamente ${combo.cantidadEntradas} butacas.`);
    }

    // Con combo, los artículos y los precios salen del combo; no se aplican recargos ni descuentos.
    const lineasArticulos: ArticuloCombo[] = combo
      ? combo.articulos
      : articulosElegidos.map((articulo) => ({ articulo, cantidad: 1 }));
    const articulos = lineasArticulos.map(({ articulo }) => articulo);
    const unidadesArticulos = lineasArticulos.flatMap(({ articulo, cantidad }) => Array<Articulo>(cantidad).fill(articulo));

    let precios: PreciosOrden;
    if (combo) {
      precios = { ...repartirPrecioCombo(combo), total: combo.precio, descuentoAplicado: 0 };
    } else {
      const porcentajeDescuento = pagoConPuntos ? 0 : await this.obtenerPorcentajeDescuentoPrimeraCompra(usuario);
      precios = calcularPreciosOrden(funcion, butacas, articulos, porcentajeDescuento);
    }
    const { precioButacas, precioArticulos, total, descuentoAplicado } = precios;
    const comboOrden: ComboOrden | null = combo
      ? { id: combo.id, nombre: combo.nombre, precio: combo.precio, cantidadEntradas: combo.cantidadEntradas }
      : null;
    const puntosUtilizados = pagoConPuntos ? calcularPuntosOrden(funcion, butacas.length, unidadesArticulos) : null;
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
        combo_id: combo?.id ?? null,
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
          .insert(lineasArticulos.map(({ articulo, cantidad }) => {
            return {
              reserva_id: filaReserva.id,
              articulo_id: articulo.id,
              cantidad,
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
        combo: comboOrden,
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

  /**
   * Devuelve las órdenes con los datos de su reserva, de la más reciente a la más antigua.
   * Incluye las órdenes sin reserva (canceladas). `fechaHasta` incluye el día completo.
   */
  async obtenerFacturaciones({ fechaDesde, fechaHasta, pagoConPuntos, verificada }: FiltroFacturaciones): Promise<Facturacion[]> {
    let consulta = this.supabase.cliente
      .from('orden')
      .select('id, email_contacto, total, descuento_aplicado, verificada, pago_con_puntos, puntos_utilizados, fecha_creacion, usuario(email), reserva(funcion_id, precio_butacas, precio_articulos)');

    if (fechaDesde) {
      const inicioDia = new Date(fechaDesde.getFullYear(), fechaDesde.getMonth(), fechaDesde.getDate());
      consulta = consulta.gte('fecha_creacion', inicioDia.toISOString());
    }
    if (fechaHasta) {
      const inicioDiaSiguiente = new Date(fechaHasta.getFullYear(), fechaHasta.getMonth(), fechaHasta.getDate() + 1);
      consulta = consulta.lt('fecha_creacion', inicioDiaSiguiente.toISOString());
    }
    if (pagoConPuntos !== null) consulta = consulta.eq('pago_con_puntos', pagoConPuntos);
    if (verificada !== null) consulta = consulta.eq('verificada', verificada);

    const { data, error } = await consulta.order('fecha_creacion', { ascending: false }).returns<FilaFacturacion[]>();
    if (error) throw error;

    return data.map((fila) => {
      const filaReserva = Array.isArray(fila.reserva) ? fila.reserva[0] : fila.reserva;
      return {
        idOrden: fila.id,
        idFuncion: filaReserva?.funcion_id ?? null,
        usuarioRegistrado: fila.email_contacto === null,
        email: fila.email_contacto ?? fila.usuario?.email ?? '',
        pagoConPuntos: fila.pago_con_puntos,
        puntosUtilizados: fila.puntos_utilizados,
        total: fila.total,
        descuentoAplicado: fila.descuento_aplicado,
        verificada: fila.verificada,
        precioButacas: filaReserva?.precio_butacas ?? null,
        precioArticulos: filaReserva?.precio_articulos ?? null,
        fechaOrden: new Date(fila.fecha_creacion),
      };
    });
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
