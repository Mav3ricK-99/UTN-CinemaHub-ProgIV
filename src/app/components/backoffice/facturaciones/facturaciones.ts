import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

import { Facturacion, obtenerEstadoFacturacion } from '../../../classes/facturacion';
import { OrdenService } from '../../../services/orden.service';
import { ReporteFacturacionesService } from '../../../services/reporte-facturaciones.service';
import { SelectorFecha } from '../../shared/selector-fecha/selector-fecha';
import { SelectorFiltroBooleano } from '../../shared/selector-filtro-booleano/selector-filtro-booleano';

interface ModeloFiltroFacturaciones {
  fechaDesde: Date | null;
  fechaHasta: Date | null;
  pagoConPuntos: boolean | null;
  verificada: boolean | null;
}

@Component({
  selector: 'app-facturaciones',
  imports: [CurrencyPipe, DatePipe, FormField, ButtonModule, TableModule, SelectorFecha, SelectorFiltroBooleano],
  templateUrl: './facturaciones.html',
})
export class Facturaciones {
  private readonly ordenService = inject(OrdenService);
  private readonly reporteService = inject(ReporteFacturacionesService);

  protected readonly modeloFiltro = signal<ModeloFiltroFacturaciones>({
    fechaDesde: null,
    fechaHasta: null,
    pagoConPuntos: null,
    verificada: null,
  });
  protected readonly filtro = form(this.modeloFiltro);

  protected readonly facturaciones = resource({
    params: () => ({ ...this.modeloFiltro() }),
    loader: ({ params }) => this.ordenService.obtenerFacturaciones(params),
  });

  protected readonly exportando = signal(false);
  protected readonly errorExportacion = signal<string | null>(null);
  protected readonly sinResultados = computed(() => (this.facturaciones.value() ?? []).length === 0);

  protected claseFila(facturacion: Facturacion): string {
    const estado = obtenerEstadoFacturacion(facturacion);
    if (estado === 'cancelada') return '!bg-red-100';
    if (estado === 'verificada') return '!bg-green-100';
    return '';
  }

  protected exportarExcel(): Promise<void> {
    return this.exportar((facturaciones) => this.reporteService.exportarExcel(facturaciones));
  }

  protected exportarPdf(): Promise<void> {
    return this.exportar((facturaciones) => this.reporteService.exportarPdf(facturaciones));
  }

  private async exportar(accion: (facturaciones: Facturacion[]) => Promise<void>): Promise<void> {
    this.errorExportacion.set(null);
    this.exportando.set(true);
    try {
      await accion(this.facturaciones.value() ?? []);
    } catch {
      this.errorExportacion.set('No se pudo generar el archivo. Intentá nuevamente.');
    } finally {
      this.exportando.set(false);
    }
  }
}
