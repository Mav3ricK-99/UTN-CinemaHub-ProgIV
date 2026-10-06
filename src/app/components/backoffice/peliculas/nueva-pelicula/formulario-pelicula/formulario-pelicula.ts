import { Component, computed, DestroyRef, inject, output, resource, signal } from '@angular/core';
import { form, FormField, FormRoot, max, maxLength, min, required, validate } from '@angular/forms/signals';
import { FileSelectEvent, FileUpload } from 'primeng/fileupload';

import { Categoria } from '../../../../../classes/categoria';
import { Clasificacion } from '../../../../../classes/clasificacion';
import { FormatoPelicula, IdiomaPelicula, Pelicula } from '../../../../../classes/pelicula';
import { CategoriaService } from '../../../../../services/categoria.service';
import { ClasificacionService } from '../../../../../services/clasificacion.service';
import { PeliculaService } from '../../../../../services/pelicula.service';
import { SelectorCategorias } from '../../../../shared/selector-categorias/selector-categorias';
import { SelectorClasificacion } from '../../../../shared/selector-clasificacion/selector-clasificacion';
import { SelectorFormato } from '../../../../shared/selector-formato/selector-formato';
import { SelectorIdioma } from '../../../../shared/selector-idioma/selector-idioma';
import { SelectorSiNo } from '../../../../shared/selector-si-no/selector-si-no';
import { PrevisualizacionPelicula } from './previsualizacion-pelicula/previsualizacion-pelicula';
import { alMenosUnaCategoria } from './validadores-pelicula';

const LARGO_MAXIMO_SINOPSIS = 500;
const DURACION_MINIMA_MINUTOS = 1;
const DURACION_MAXIMA_MINUTOS = 400;

interface ModeloPelicula {
  nombre: string;
  sinopsis: string;
  duracionMinutos: number | null;
  formato: FormatoPelicula | null;
  idioma: IdiomaPelicula | null;
  categorias: Categoria[];
  clasificacion: Clasificacion | null;
  proximamente: boolean;
}

function crearModeloVacio(): ModeloPelicula {
  return {
    nombre: '',
    sinopsis: '',
    duracionMinutos: null,
    formato: '2D',
    idioma: 'Castellano',
    categorias: [],
    clasificacion: null,
    proximamente: false,
  };
}

@Component({
  selector: 'app-formulario-pelicula',
  imports: [
    FormField,
    FormRoot,
    FileUpload,
    SelectorFormato,
    SelectorIdioma,
    SelectorClasificacion,
    SelectorCategorias,
    SelectorSiNo,
    PrevisualizacionPelicula,
  ],
  templateUrl: './formulario-pelicula.html',
})
export class FormularioPelicula {
  private readonly categoriaService = inject(CategoriaService);
  private readonly clasificacionService = inject(ClasificacionService);
  private readonly peliculaService = inject(PeliculaService);

  readonly creada = output<Pelicula>();

  protected readonly modelo = signal(crearModeloVacio());
  protected readonly categoriasDisponibles = resource({ loader: () => this.categoriaService.obtenerCategorias() });
  protected readonly clasificacionesDisponibles = resource({
    loader: () => this.clasificacionService.obtenerClasificaciones(),
  });

  protected readonly imagenArchivo = signal<File | null>(null);
  protected readonly imagenPreviewUrl = signal<string | null>(null);
  protected readonly imagenTocada = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);

  /** Arma una `Pelicula` con los datos ingresados hasta el momento, para la previsualización en vivo. */
  protected readonly peliculaPreview = computed<Pelicula>(() => {
    const { nombre, sinopsis, duracionMinutos, formato, idioma, categorias, clasificacion, proximamente } =
      this.modelo();
    return {
      id: 'preview',
      nombre: nombre.trim() || 'Nombre de la película',
      sinopsis: sinopsis.trim() || 'La sinopsis aparecerá acá.',
      duracionMinutos: duracionMinutos ?? 0,
      imagenUrl: this.imagenPreviewUrl() ?? '',
      formato: formato ?? '2D',
      idioma: idioma ?? 'Castellano',
      categorias,
      clasificacion,
      promedioResenas: 0,
      cantidadResenas: 0,
      proximamente,
    };
  });

  protected readonly formulario = form(
    this.modelo,
    (ruta) => {
      required(ruta.nombre, { message: 'Ingresá el nombre de la película.' });

      required(ruta.sinopsis, { message: 'Ingresá la sinopsis.' });
      maxLength(ruta.sinopsis, LARGO_MAXIMO_SINOPSIS, {
        message: `La sinopsis no puede superar los ${LARGO_MAXIMO_SINOPSIS} caracteres.`,
      });

      required(ruta.duracionMinutos, { message: 'Ingresá la duración en minutos.' });
      min(ruta.duracionMinutos, DURACION_MINIMA_MINUTOS, {
        message: `La duración debe ser de al menos ${DURACION_MINIMA_MINUTOS} minuto.`,
      });
      max(ruta.duracionMinutos, DURACION_MAXIMA_MINUTOS, {
        message: `La duración no puede superar los ${DURACION_MAXIMA_MINUTOS} minutos.`,
      });

      required(ruta.formato, { message: 'Seleccioná el formato.' });
      required(ruta.idioma, { message: 'Seleccioná el idioma.' });
      required(ruta.clasificacion, { message: 'Seleccioná la clasificación.' });

      validate(ruta.categorias, alMenosUnaCategoria());
    },
    {
      submission: {
        ignoreValidators: 'none',
        action: async () => {
          this.errorGeneral.set(null);

          const imagen = this.imagenArchivo();
          if (!imagen) {
            this.imagenTocada.set(true);
            return undefined;
          }

          const { nombre, sinopsis, duracionMinutos, formato, idioma, categorias, clasificacion, proximamente } =
            this.modelo();
          if (!duracionMinutos || !formato || !idioma || !clasificacion) return undefined;

          try {
            const pelicula = await this.peliculaService.crearPelicula({
              nombre: nombre.trim(),
              sinopsis: sinopsis.trim(),
              duracionMinutos,
              formato,
              idioma,
              categorias,
              clasificacion,
              proximamente,
              imagen,
            });
            this.creada.emit(pelicula);
          } catch {
            this.errorGeneral.set('No se pudo guardar la película. Intentá nuevamente.');
          }
          return undefined;
        },
      },
    },
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.limpiarPreviewImagen());
  }

  protected alSeleccionarImagen(evento: FileSelectEvent): void {
    const archivo = evento.files[0];
    if (!archivo) return;

    this.limpiarPreviewImagen();
    this.imagenArchivo.set(archivo);
    this.imagenPreviewUrl.set(URL.createObjectURL(archivo));
    this.imagenTocada.set(true);
  }

  private limpiarPreviewImagen(): void {
    const url = this.imagenPreviewUrl();
    if (url) URL.revokeObjectURL(url);
  }
}
