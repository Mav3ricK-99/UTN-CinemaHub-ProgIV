import { Component, computed, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartModule } from '@primeui/angular-chart';
import { SelectButton } from 'primeng/selectbutton';

import { EntradasDiariasPelicula, FuncionService } from '../../../../services/funcion.service';

type Periodo = 'semana' | 'mes';

interface SeriePelicula {
  campo: string;
  nombre: string;
  color: string;
}

type FilaDia = { fecha: string } & Record<string, number | string>;

const COLORES_PELICULAS = ['#5daeea', '#ffad5a', '#5ccf9f', '#7c8cff', '#e5484d'];
const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;
const CANTIDAD_MESES = 6;
const formatoMes = new Intl.DateTimeFormat('es', { month: 'long', timeZone: 'UTC' });

/** Devuelve el inicio (00:00 UTC) de la semana actual (lunes) o del primer mes mostrado. */
function obtenerInicioPeriodo(periodo: Periodo): Date {
  const hoy = new Date();
  if (periodo === 'mes') return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - (CANTIDAD_MESES - 1), 1));

  const inicioHoy = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  const diasDesdeLunes = (hoy.getUTCDay() + 6) % 7;
  return new Date(inicioHoy - diasDesdeLunes * MILISEGUNDOS_POR_DIA);
}

/** Devuelve el nombre del mes con la primera letra en mayúscula, y el año si no es el actual. */
function formatearMes(fecha: Date): string {
  const nombre = formatoMes.format(fecha);
  const etiqueta = nombre.charAt(0).toUpperCase() + nombre.slice(1);
  return fecha.getUTCFullYear() === new Date().getUTCFullYear() ? etiqueta : `${etiqueta} ${fecha.getUTCFullYear()}`;
}

@Component({
  selector: 'app-grafico-peliculas',
  imports: [ChartModule, FormsModule, SelectButton],
  templateUrl: './grafico-peliculas.html',
})
export class GraficoPeliculas {
  private readonly funcionService = inject(FuncionService);

  protected readonly periodo = signal<Periodo>('semana');
  protected readonly opcionesPeriodo = [
    { etiqueta: 'Esta semana', valor: 'semana' },
    { etiqueta: 'Por mes', valor: 'mes' },
  ];
  protected readonly formatoEntero = { maximumFractionDigits: 0 };

  protected readonly entradasDiarias = resource({
    params: () => this.periodo(),
    loader: ({ params: periodo }) => this.funcionService.obtenerEntradasDiariasPorPelicula(obtenerInicioPeriodo(periodo)),
  });

  /** Una serie por película: cada una lee su propia columna (`pelicula0`, `pelicula1`, ...) de las filas. */
  protected readonly series = computed<SeriePelicula[]>(() =>
    (this.entradasDiarias.value() ?? []).map(({ nombre }, indice) => ({
      campo: `pelicula${indice}`,
      nombre,
      color: COLORES_PELICULAS[indice % COLORES_PELICULAS.length],
    })),
  );

  /** Una fila por día (semana) o por mes (mes), con 0 donde no hay entradas. */
  protected readonly filas = computed<FilaDia[]>(() => {
    const peliculas = this.entradasDiarias.value() ?? [];
    return this.periodo() === 'semana' ? this.crearFilasPorDia(peliculas) : this.crearFilasPorMes(peliculas);
  });

  private crearFilasPorDia(peliculas: EntradasDiariasPelicula[]): FilaDia[] {
    const inicio = obtenerInicioPeriodo('semana').getTime();
    const hoy = new Date();
    const fin = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());

    const filas: FilaDia[] = [];
    for (let dia = inicio; dia <= fin; dia += MILISEGUNDOS_POR_DIA) {
      const fecha = new Date(dia).toISOString().slice(0, 10);
      const fila: FilaDia = { fecha: `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}` };
      peliculas.forEach(({ entradasPorDia }, indice) => {
        fila[`pelicula${indice}`] = entradasPorDia.get(fecha) ?? 0;
      });
      filas.push(fila);
    }
    return filas;
  }

  private crearFilasPorMes(peliculas: EntradasDiariasPelicula[]): FilaDia[] {
    const inicio = obtenerInicioPeriodo('mes');

    return Array.from({ length: CANTIDAD_MESES }, (_, desplazamiento) => {
      const mes = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + desplazamiento, 1));
      const prefijo = mes.toISOString().slice(0, 7);
      const fila: FilaDia = { fecha: formatearMes(mes) };
      peliculas.forEach(({ entradasPorDia }, indice) => {
        let entradas = 0;
        for (const [dia, cantidad] of entradasPorDia) {
          if (dia.startsWith(prefijo)) entradas += cantidad;
        }
        fila[`pelicula${indice}`] = entradas;
      });
      return fila;
    });
  }
}
