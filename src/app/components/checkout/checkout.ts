import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import * as QRCode from 'qrcode';

import { Orden } from '../../classes/orden';
import { OrdenService } from '../../services/orden.service';
import { TicketPdfService } from '../../services/ticket-pdf.service';

interface DatosCheckout {
  orden: Orden;
  qrDataUrl: string;
}

@Component({
  selector: 'app-checkout',
  imports: [DatePipe, CurrencyPipe, RouterLink],
  templateUrl: './checkout.html',
})
export class Checkout {
  private readonly ordenService = inject(OrdenService);
  private readonly ticketPdfService = inject(TicketPdfService);

  /** Id de la orden, tomado del parámetro `:idOrden` de la ruta. */
  readonly idOrden = input.required<string>();

  protected readonly datosCheckout = resource<DatosCheckout | null, string>({
    params: () => this.idOrden(),
    loader: async ({ params: idOrden }) => {
      const orden = await this.ordenService.obtenerOrdenPorId(idOrden);
      if (!orden) return null;

      const qrDataUrl = await QRCode.toDataURL(orden.reserva.qrData, { margin: 1, width: 320 });
      return { orden, qrDataUrl };
    },
  });

  protected readonly descargandoTicket = signal(false);

  protected async descargarTicket(orden: Orden): Promise<void> {
    this.descargandoTicket.set(true);
    try {
      await this.ticketPdfService.descargarTicket(orden);
    } finally {
      this.descargandoTicket.set(false);
    }
  }
}
