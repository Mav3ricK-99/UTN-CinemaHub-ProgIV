import { Component, inject, output, resource, signal } from '@angular/core';
import { form, FormField, FormRoot, min, required } from '@angular/forms/signals';

import { Articulo } from '../../../../../classes/articulo';
import { CategoriaArticulo } from '../../../../../classes/categoria-articulo';
import { ArticuloService } from '../../../../../services/articulo.service';
import { CategoriaArticuloService } from '../../../../../services/categoria-articulo.service';
import { SelectorCategoriaArticulo } from '../../../../shared/selector-categoria-articulo/selector-categoria-articulo';
import { SelectorDisponibilidad } from '../../../../shared/selector-disponibilidad/selector-disponibilidad';

const PRECIO_MINIMO = 1;
const PUNTOS_MINIMO = 1;

interface ModeloArticulo {
  nombre: string;
  disponible: boolean;
  precio: number | null;
  puntos: number | null;
  categoria: CategoriaArticulo | null;
}

function crearModeloVacio(): ModeloArticulo {
  return { nombre: '', disponible: true, precio: null, puntos: null, categoria: null };
}

@Component({
  selector: 'app-formulario-articulo',
  imports: [FormField, FormRoot, SelectorCategoriaArticulo, SelectorDisponibilidad],
  templateUrl: './formulario-articulo.html',
})
export class FormularioArticulo {
  private readonly articuloService = inject(ArticuloService);
  private readonly categoriaArticuloService = inject(CategoriaArticuloService);

  readonly creado = output<Articulo>();

  protected readonly modelo = signal(crearModeloVacio());
  protected readonly categoriasDisponibles = resource({
    loader: () => this.categoriaArticuloService.obtenerCategoriasArticulo(),
  });
  protected readonly errorGeneral = signal<string | null>(null);

  protected readonly formulario = form(
    this.modelo,
    (ruta) => {
      required(ruta.nombre, { message: 'Ingresá el nombre del artículo.' });

      required(ruta.precio, { message: 'Ingresá el precio.' });
      min(ruta.precio, PRECIO_MINIMO, { message: `El precio debe ser de al menos ${PRECIO_MINIMO}.` });

      required(ruta.puntos, { message: 'Ingresá los puntos.' });
      min(ruta.puntos, PUNTOS_MINIMO, { message: `Los puntos deben ser al menos ${PUNTOS_MINIMO}.` });

      required(ruta.categoria, { message: 'Seleccioná la categoría.' });
    },
    {
      submission: {
        ignoreValidators: 'none',
        action: async () => {
          this.errorGeneral.set(null);

          const { nombre, disponible, precio, puntos, categoria } = this.modelo();
          if (precio === null || puntos === null || !categoria) return undefined;

          try {
            const articulo = await this.articuloService.crearArticulo({
              nombre: nombre.trim(),
              precio,
              puntos,
              categoria,
              disponible,
            });
            this.creado.emit(articulo);
          } catch {
            this.errorGeneral.set('No se pudo guardar el artículo. Intentá nuevamente.');
          }
          return undefined;
        },
      },
    },
  );
}
