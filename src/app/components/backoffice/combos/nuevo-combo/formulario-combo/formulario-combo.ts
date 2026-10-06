import { Component, inject, output, resource, signal } from '@angular/core';
import { form, FormField, FormRoot, min, required, validate } from '@angular/forms/signals';

import { Articulo } from '../../../../../classes/articulo';
import { Combo } from '../../../../../classes/combo';
import { ArticuloService } from '../../../../../services/articulo.service';
import { ComboService } from '../../../../../services/combo.service';
import { SelectorArticulos } from '../../../../shared/selector-articulos/selector-articulos';

const PRECIO_MINIMO = 1;
const ENTRADAS_MINIMO = 1;

interface ModeloCombo {
  nombre: string;
  descripcion: string;
  cantidadEntradas: number | null;
  articulos: Articulo[];
  precio: number | null;
}

function crearModeloVacio(): ModeloCombo {
  return { nombre: '', descripcion: '', cantidadEntradas: ENTRADAS_MINIMO, articulos: [], precio: null };
}

@Component({
  selector: 'app-formulario-combo',
  imports: [FormField, FormRoot, SelectorArticulos],
  templateUrl: './formulario-combo.html',
})
export class FormularioCombo {
  private readonly comboService = inject(ComboService);
  private readonly articuloService = inject(ArticuloService);

  readonly guardado = output<Combo>();

  protected readonly modelo = signal<ModeloCombo>(crearModeloVacio());
  protected readonly articulosDisponibles = resource({
    loader: () => this.articuloService.obtenerArticulosDisponibles(),
  });
  protected readonly errorGeneral = signal<string | null>(null);

  protected readonly formulario = form(
    this.modelo,
    (ruta) => {
      required(ruta.nombre, { message: 'Ingresá el nombre del combo.' });

      required(ruta.cantidadEntradas, { message: 'Ingresá la cantidad de butacas.' });
      min(ruta.cantidadEntradas, ENTRADAS_MINIMO, {
        message: `El combo debe ofrecer al menos ${ENTRADAS_MINIMO} butaca.`,
      });
      validate(ruta.cantidadEntradas, ({ value }) => {
        const cantidad = value();
        if (cantidad === null || Number.isInteger(cantidad)) return null;
        return { kind: 'entradasNoEntero', message: 'La cantidad de butacas debe ser un número entero.' };
      });

      validate(ruta.articulos, ({ value }) => {
        if (value().length > 0) return null;
        return { kind: 'articulosRequeridos', message: 'Seleccioná al menos un artículo.' };
      });

      required(ruta.precio, { message: 'Ingresá el precio.' });
      min(ruta.precio, PRECIO_MINIMO, { message: `El precio debe ser de al menos ${PRECIO_MINIMO}.` });
    },
    {
      submission: {
        ignoreValidators: 'none',
        action: async () => {
          this.errorGeneral.set(null);

          const { nombre, descripcion, cantidadEntradas, articulos, precio } = this.modelo();
          if (cantidadEntradas === null || precio === null) return undefined;

          try {
            const combo = await this.comboService.crearCombo({
              nombre: nombre.trim(),
              descripcion: descripcion.trim() || null,
              precio,
              cantidadEntradas,
              articulos,
            });
            this.guardado.emit(combo);
          } catch {
            this.errorGeneral.set('No se pudo guardar el combo. Verificá que el nombre no exista e intentá nuevamente.');
          }
          return undefined;
        },
      },
    },
  );
}
