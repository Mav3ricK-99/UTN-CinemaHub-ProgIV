import { Component, inject, input, linkedSignal, output, resource, signal } from '@angular/core';
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

function crearModeloDesdeArticulo(articulo: Articulo): ModeloArticulo {
  return {
    nombre: articulo.nombre,
    disponible: articulo.disponible,
    precio: articulo.precio,
    puntos: articulo.puntos,
    categoria: articulo.categoria,
  };
}

@Component({
  selector: 'app-formulario-articulo',
  imports: [FormField, FormRoot, SelectorCategoriaArticulo, SelectorDisponibilidad],
  templateUrl: './formulario-articulo.html',
})
export class FormularioArticulo {
  private readonly articuloService = inject(ArticuloService);
  private readonly categoriaArticuloService = inject(CategoriaArticuloService);

  /** Artículo a editar. Si es `null`, el formulario funciona como alta. */
  readonly articulo = input<Articulo | null>(null);
  readonly guardado = output<Articulo>();

  protected readonly modelo = linkedSignal<ModeloArticulo>(() => {
    const articulo = this.articulo();
    return articulo ? crearModeloDesdeArticulo(articulo) : crearModeloVacio();
  });
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
            const datos = { nombre: nombre.trim(), precio, puntos, categoria, disponible };
            const articuloEditado = this.articulo();
            const articulo = articuloEditado
              ? await this.articuloService.modificarArticulo({ ...datos, id: articuloEditado.id })
              : await this.articuloService.crearArticulo(datos);
            this.guardado.emit(articulo);
          } catch {
            this.errorGeneral.set('No se pudo guardar el artículo. Intentá nuevamente.');
          }
          return undefined;
        },
      },
    },
  );
}
