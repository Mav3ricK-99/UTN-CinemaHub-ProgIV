import { Component, inject, output, resource, signal } from '@angular/core';
import { form, FormField, FormRoot, required, validate } from '@angular/forms/signals';

import { Pelicula } from '../../../../../classes/pelicula';
import { FuncionRecurrenteCreada, FuncionService } from '../../../../../services/funcion.service';
import { PeliculaService } from '../../../../../services/pelicula.service';
import { SelectorDiasSemana } from '../../../../shared/selector-dias-semana/selector-dias-semana';
import { SelectorPelicula } from '../../../../shared/selector-pelicula/selector-pelicula';
import { PeriodoFuncion, SelectorPeriodoFuncion } from '../../../../shared/selector-periodo-funcion/selector-periodo-funcion';
import { alMenosUnDia, periodoCompleto, precioValido, puntosValidos } from './validadores-funcion';

interface ModeloFuncion {
  pelicula: Pelicula | null;
  diasSemana: number[];
  periodo: PeriodoFuncion;
  precio: number | null;
  puntos: number | null;
}

function crearModeloVacio(): ModeloFuncion {
  return {
    pelicula: null,
    diasSemana: [],
    periodo: { fechaDesde: null, fechaHasta: null, horario: null },
    precio: null,
    puntos: null,
  };
}

function formatearFecha(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

@Component({
  selector: 'app-formulario-funcion',
  imports: [FormField, FormRoot, SelectorPelicula, SelectorDiasSemana, SelectorPeriodoFuncion],
  templateUrl: './formulario-funcion.html',
})
export class FormularioFuncion {
  private readonly peliculaService = inject(PeliculaService);
  private readonly funcionService = inject(FuncionService);

  readonly creadas = output<FuncionRecurrenteCreada[]>();

  protected readonly modelo = signal(crearModeloVacio());
  protected readonly peliculasDisponibles = resource({ loader: () => this.peliculaService.obtenerPeliculas() });
  protected readonly errorGeneral = signal<string | null>(null);

  protected readonly formulario = form(
    this.modelo,
    (ruta) => {
      required(ruta.pelicula, { message: 'Seleccioná la película.' });
      validate(ruta.diasSemana, alMenosUnDia());
      validate(ruta.periodo, periodoCompleto());
      required(ruta.precio, { message: 'Ingresá el precio.' });
      validate(ruta.precio, precioValido());
      required(ruta.puntos, { message: 'Ingresá los puntos.' });
      validate(ruta.puntos, puntosValidos());
    },
    {
      submission: {
        ignoreValidators: 'none',
        action: async () => {
          this.errorGeneral.set(null);

          const { pelicula, diasSemana, periodo, precio, puntos } = this.modelo();
          if (!pelicula || !periodo.fechaDesde || !periodo.fechaHasta || !periodo.horario || !precio || !puntos) {
            return undefined;
          }

          try {
            const funcionesCreadas = await this.funcionService.crearFuncionesRecurrentes({
              peliculaId: pelicula.id,
              diasSemana,
              horario: periodo.horario,
              fechaDesde: formatearFecha(periodo.fechaDesde),
              fechaHasta: formatearFecha(periodo.fechaHasta),
              precio,
              puntos,
            });
            this.creadas.emit(funcionesCreadas);
          } catch (error) {
            this.errorGeneral.set(
              error instanceof Error ? error.message : 'No se pudieron crear las funciones. Intentá nuevamente.',
            );
          }
          return undefined;
        },
      },
    },
  );
}
