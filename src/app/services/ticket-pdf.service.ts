import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import * as QRCode from 'qrcode';

import { Orden } from '../classes/orden';

const ANCHO_HOJA_MM = 210;
const MARGEN_MM = 20;
const TAMANO_QR_MM = 55;
const COLOR_MARCA: [number, number, number] = [220, 38, 38];
const COLOR_TEXTO: [number, number, number] = [23, 23, 23];
const COLOR_TEXTO_SECUNDARIO: [number, number, number] = [100, 100, 100];
const COLOR_LINEA: [number, number, number] = [225, 225, 225];

function formatearFechaFuncion(fecha: Date): string {
  const texto = fecha.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)} · ${hora} hs`;
}

function formatearPrecio(monto: number): string {
  return monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

@Injectable({ providedIn: 'root' })
export class TicketPdfService {
  /** Arma el PDF del ticket de una orden y dispara su descarga en el navegador. */
  async descargarTicket(orden: Orden): Promise<void> {
    const { reserva, items, total } = orden;
    const { funcion } = reserva;

    const qrDataUrl = await QRCode.toDataURL(reserva.qrData, { margin: 1, width: 400 });

    const documento = new jsPDF({ unit: 'mm', format: 'a4' });
    const anchoUtil = ANCHO_HOJA_MM - MARGEN_MM * 2;
    let y = MARGEN_MM;

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(20);
    documento.setTextColor(...COLOR_MARCA);
    documento.text('CinemaHub', MARGEN_MM, y);
    documento.setFont('helvetica', 'normal');
    documento.setFontSize(11);
    documento.setTextColor(...COLOR_TEXTO_SECUNDARIO);
    documento.text('Ticket de compra', ANCHO_HOJA_MM - MARGEN_MM, y, { align: 'right' });
    y += 5;
    documento.setDrawColor(...COLOR_LINEA);
    documento.line(MARGEN_MM, y, ANCHO_HOJA_MM - MARGEN_MM, y);
    y += 10;

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(16);
    documento.setTextColor(...COLOR_TEXTO);
    documento.text(funcion.pelicula.nombre, MARGEN_MM, y);
    y += 7;

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(10);
    documento.setTextColor(...COLOR_TEXTO_SECUNDARIO);
    const datosFuncion = [
      `Formato ${funcion.pelicula.formato} · ${funcion.pelicula.idioma}`,
      `Sala: ${funcion.sala.nombre}`,
      `Función: ${formatearFechaFuncion(funcion.fechaInicio)}`,
      `Butacas: ${reserva.butaca.join(', ')}`,
    ];
    for (const linea of datosFuncion) {
      documento.text(linea, MARGEN_MM, y);
      y += 5.5;
    }
    y += 5;

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(12);
    documento.setTextColor(...COLOR_TEXTO);
    documento.text('Detalle de la compra', MARGEN_MM, y);
    y += 6;

    const xCantidad = ANCHO_HOJA_MM - MARGEN_MM - 35;
    documento.setFontSize(9);
    documento.setTextColor(...COLOR_TEXTO_SECUNDARIO);
    documento.text('Artículo', MARGEN_MM, y);
    documento.text('Cant.', xCantidad, y, { align: 'right' });
    documento.text('Subtotal', ANCHO_HOJA_MM - MARGEN_MM, y, { align: 'right' });
    y += 2;
    documento.setDrawColor(...COLOR_LINEA);
    documento.line(MARGEN_MM, y, ANCHO_HOJA_MM - MARGEN_MM, y);
    y += 6;

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(10);
    documento.setTextColor(...COLOR_TEXTO);
    for (const item of items) {
      documento.text(item.descripcion, MARGEN_MM, y);
      documento.text(String(item.cantidad), xCantidad, y, { align: 'right' });
      documento.text(formatearPrecio(item.cantidad * item.precioUnitario), ANCHO_HOJA_MM - MARGEN_MM, y, {
        align: 'right',
      });
      y += 6;
    }

    if (reserva.descuentoAplicado > 0) {
      documento.setTextColor(...COLOR_TEXTO_SECUNDARIO);
      documento.text('Descuento aplicado', MARGEN_MM, y);
      documento.text(`-${formatearPrecio(reserva.descuentoAplicado)}`, ANCHO_HOJA_MM - MARGEN_MM, y, {
        align: 'right',
      });
      y += 6;
    }

    y += 2;
    documento.setDrawColor(...COLOR_LINEA);
    documento.line(MARGEN_MM, y, ANCHO_HOJA_MM - MARGEN_MM, y);
    y += 9;

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(13);
    documento.setTextColor(...COLOR_TEXTO);
    documento.text('Total', MARGEN_MM, y);
    documento.text(formatearPrecio(total), ANCHO_HOJA_MM - MARGEN_MM, y, { align: 'right' });
    y += 14;

    const xQr = MARGEN_MM + (anchoUtil - TAMANO_QR_MM) / 2;
    documento.addImage(qrDataUrl, 'PNG', xQr, y, TAMANO_QR_MM, TAMANO_QR_MM);
    y += TAMANO_QR_MM + 7;

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(10);
    documento.setTextColor(...COLOR_TEXTO);
    documento.text('Presentar al momento de ingresar a la sala', ANCHO_HOJA_MM / 2, y, { align: 'center' });
    y += 7;

    documento.setFontSize(8);
    documento.setTextColor(...COLOR_TEXTO_SECUNDARIO);
    documento.text(`Orden ${orden.id}`, ANCHO_HOJA_MM / 2, y, { align: 'center' });

    documento.save(`ticket-${orden.id}.pdf`);
  }
}
