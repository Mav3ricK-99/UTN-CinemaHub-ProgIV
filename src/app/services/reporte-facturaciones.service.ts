import { Injectable } from '@angular/core';

import { EstadoFacturacion, Facturacion, obtenerEstadoFacturacion } from '../classes/facturacion';

const ENCABEZADOS = [
  'Nro de orden',
  'ID función',
  'Usuario registrado',
  'Email',
  'Pagó con puntos',
  'Puntos utilizados',
  'Descuento primera compra',
  'Total',
  'Verificada',
  'Precio butacas',
  'Precio artículos',
  'Fecha de orden',
];

const COLOR_FONDO_ESTADO: Record<EstadoFacturacion, [number, number, number] | null> = {
  cancelada: [254, 226, 226],
  verificada: [220, 252, 231],
  pendiente: null,
};

function textoSiNo(valor: boolean): string {
  return valor ? 'Sí' : 'No';
}

function textoMonto(monto: number | null): string {
  return monto === null ? '-' : monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

function textoFecha(fecha: Date): string {
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function armarFila(facturacion: Facturacion): string[] {
  return [
    facturacion.idOrden,
    facturacion.idFuncion ?? '-',
    textoSiNo(facturacion.usuarioRegistrado),
    facturacion.email,
    textoSiNo(facturacion.pagoConPuntos),
    facturacion.puntosUtilizados === null ? '-' : String(facturacion.puntosUtilizados),
    facturacion.descuentoAplicado > 0 ? textoMonto(facturacion.descuentoAplicado) : 'No',
    textoMonto(facturacion.total),
    textoSiNo(facturacion.verificada),
    textoMonto(facturacion.precioButacas),
    textoMonto(facturacion.precioArticulos),
    textoFecha(facturacion.fechaOrden),
  ];
}

function nombreArchivo(extension: string): string {
  const fecha = new Date().toISOString().slice(0, 10);
  return `facturaciones-${fecha}.${extension}`;
}

@Injectable({ providedIn: 'root' })
export class ReporteFacturacionesService {
  /** Genera un Excel con las mismas columnas de la tabla y dispara su descarga. */
  async exportarExcel(facturaciones: Facturacion[]): Promise<void> {
    const { Workbook } = await import('exceljs');
    const libro = new Workbook();
    const hoja = libro.addWorksheet('Facturaciones');

    hoja.columns = ENCABEZADOS.map((encabezado, indice) => ({
      header: encabezado,
      width: indice === 0 || indice === 1 ? 38 : indice === 3 ? 32 : indice === 6 ? 26 : 18,
    }));
    hoja.getRow(1).font = { bold: true };

    for (const facturacion of facturaciones) {
      const fila = hoja.addRow(armarFila(facturacion));
      const color = COLOR_FONDO_ESTADO[obtenerEstadoFacturacion(facturacion)];
      if (!color) continue;

      const argb = `FF${color.map((canal) => canal.toString(16).padStart(2, '0')).join('')}`;
      fila.eachCell((celda) => {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
      });
    }

    const contenido = await libro.xlsx.writeBuffer();
    this.descargar(
      new Blob([contenido], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      nombreArchivo('xlsx'),
    );
  }

  /** Genera un PDF apaisado con una tabla de las mismas columnas y dispara su descarga. */
  async exportarPdf(facturaciones: Facturacion[]): Promise<void> {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const documento = new jsPDF({ orientation: 'landscape', format: 'a4' });

    documento.setFontSize(14);
    documento.text('Reporte de facturaciones', 14, 14);

    autoTable(documento, {
      startY: 20,
      head: [ENCABEZADOS],
      body: facturaciones.map(armarFila),
      styles: { fontSize: 6, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 41, 59] },
      didParseCell: ({ section, row, cell }) => {
        if (section !== 'body') return;
        const color = COLOR_FONDO_ESTADO[obtenerEstadoFacturacion(facturaciones[row.index])];
        if (color) cell.styles.fillColor = color;
      },
    });

    documento.save(nombreArchivo('pdf'));
  }

  private descargar(archivo: Blob, nombre: string): void {
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
