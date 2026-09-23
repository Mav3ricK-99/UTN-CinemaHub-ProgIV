import { Injectable, signal } from '@angular/core';

import { Articulo } from '../classes/articulo';
import { Funcion } from '../classes/funcion';
import { Orden } from '../classes/orden';
import { Reserva } from '../classes/reserva';
import { Usuario } from '../classes/usuario';

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

@Injectable({ providedIn: 'root' })
export class OrdenService {
  // Usa almacenamiento en memoria hasta definir las tablas `reserva`/`orden` en Supabase.
  private readonly ordenes = signal(new Map<string, OrdenConReserva>());

  /**
   * Crea la orden de compra y la reserva de butacas/artículos asociada.
   * TODO: calcular `descuentoAplicado` según las reglas de negocio (primera
   * compra, mayores de 50 años) cuando se defina la consulta a Supabase.
   */
  async crearOrden({ funcion, butacas, articulos, usuario, emailContacto }: SolicitudCrearOrden): Promise<OrdenConReserva> {
    const descuentoAplicado = 0;
    const precioButacas = butacas.length * funcion.precio;
    const precioArticulos = articulos.reduce((total, articulo) => total + articulo.precio, 0);
    const total = precioButacas + precioArticulos - descuentoAplicado;
    const fechaCreacion = new Date();

    const orden: Orden = {
      id: crypto.randomUUID(),
      usuario,
      emailContacto: usuario ? null : emailContacto,
      descuentoAplicado,
      total,
      qrData: crypto.randomUUID(),
      verificada: false,
      fechaVerificacion: null,
      fechaCreacion,
    };

    const reserva: Reserva = {
      id: crypto.randomUUID(),
      orden,
      funcion,
      butacas,
      articulos,
      precioButacas,
      precioArticulos,
    };

    const ordenConReserva: OrdenConReserva = { orden, reserva };
    this.ordenes.update((mapa) => new Map(mapa).set(orden.id, ordenConReserva));
    return ordenConReserva;
  }

  /** Devuelve la orden (con su reserva) con el id indicado, o `null` si no existe. */
  async obtenerOrdenPorId(id: string): Promise<OrdenConReserva | null> {
    return this.ordenes().get(id) ?? null;
  }
}
