import { Injectable, signal } from '@angular/core';

import { Articulo } from '../classes/articulo';
import { Funcion } from '../classes/funcion';
import { ItemOrden, Orden } from '../classes/orden';
import { Reserva } from '../classes/reserva';
import { Usuario } from '../classes/usuario';

export interface SolicitudCrearOrden {
  funcion: Funcion;
  butacas: string[];
  articulos: Articulo[];
  usuario: Usuario | null;
  emailContacto: string | null;
}

function esButacaEspecial(funcion: Funcion, idButaca: string): boolean {
  return funcion.sala.butacas.some((butaca) => butaca.id === idButaca && butaca.esEspecial);
}

function descripcionEntrada(idButaca: string, especial: boolean): string {
  return `Entrada butaca ${idButaca}${especial ? ' (especial)' : ''}`;
}

@Injectable({ providedIn: 'root' })
export class OrdenService {
  // Usa almacenamiento en memoria hasta definir las tablas `reserva`/`orden` en Supabase.
  private readonly ordenes = signal(new Map<string, Orden>());

  /**
   * Crea la reserva de las butacas indicadas y la orden de compra asociada.
   * TODO: calcular `descuentoAplicado` según las reglas de negocio (primera
   * compra, mayores de 50 años) cuando se defina la consulta a Supabase.
   */
  async crearOrden({ funcion, butacas, articulos, usuario, emailContacto }: SolicitudCrearOrden): Promise<Orden> {
    const items: ItemOrden[] = [
      ...butacas.map((idButaca) => ({
        descripcion: descripcionEntrada(idButaca, esButacaEspecial(funcion, idButaca)),
        cantidad: 1,
        precioUnitario: funcion.precio,
      })),
      ...articulos.map((articulo) => ({
        descripcion: articulo.nombre,
        cantidad: 1,
        precioUnitario: articulo.precio,
      })),
    ];

    const descuentoAplicado = 0;
    const subtotal = items.reduce((total, item) => total + item.cantidad * item.precioUnitario, 0);
    const precio = subtotal - descuentoAplicado;
    const fechaCompra = new Date();

    const reserva: Reserva = {
      id: crypto.randomUUID(),
      funcion,
      butaca: butacas,
      usuario,
      emailContacto: usuario ? null : emailContacto,
      precio,
      descuentoAplicado,
      qrData: crypto.randomUUID(),
      verificada: false,
      fechaCompra,
    };

    const orden: Orden = {
      id: crypto.randomUUID(),
      reserva,
      items,
      total: precio,
      fechaCompra,
    };

    this.ordenes.update((mapa) => new Map(mapa).set(orden.id, orden));
    return orden;
  }

  /** Devuelve la orden con el id indicado, o `null` si no existe. */
  async obtenerOrdenPorId(id: string): Promise<Orden | null> {
    return this.ordenes().get(id) ?? null;
  }
}
