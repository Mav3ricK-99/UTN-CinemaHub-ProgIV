import { DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, resource, signal } from '@angular/core';
import { email, form, FormField, FormRoot, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { Articulo } from '../../classes/articulo';
import { ArticuloService } from '../../services/articulo.service';
import { AuthService } from '../../services/auth.service';
import { FuncionService } from '../../services/funcion.service';
import { OrdenService } from '../../services/orden.service';
import { EstrellasCalificacion } from '../shared/estrellas-calificacion/estrellas-calificacion';
import { CarrouselArticulos } from './carrousel-articulos/carrousel-articulos';
import { MapaButacas } from './mapa-butacas/mapa-butacas';
import { ResenasPelicula } from './resenas-pelicula/resenas-pelicula';
import { requeridoSiAnonimo } from './validadores-seleccion-butaca';

const MILISEGUNDOS_POR_MINUTO = 60 * 1000;
const MINUTOS_POR_HORA = 60;
const MINUTOS_POR_DIA = 24 * MINUTOS_POR_HORA;
const INTERVALO_CRONOMETRO_MS = 1000;

function pluralizar(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

@Component({
  selector: 'app-seleccion-butaca',
  imports: [
    RouterLink,
    MapaButacas,
    FormField,
    FormRoot,
    CarrouselArticulos,
    EstrellasCalificacion,
    DecimalPipe,
    ResenasPelicula,
  ],
  templateUrl: './seleccion-butaca.html',
})
export class SeleccionButaca {
  private readonly funcionService = inject(FuncionService);
  private readonly ordenService = inject(OrdenService);
  private readonly articuloService = inject(ArticuloService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /** Id de la función, tomado del parámetro `:idFuncion` de la ruta. */
  readonly idFuncion = input.required<string>();

  protected readonly funcion = resource({
    params: () => this.idFuncion(),
    loader: ({ params: idFuncion }) => this.funcionService.obtenerFuncionPorId(idFuncion),
  });

  protected readonly articulosCandy = resource({
    loader: () => this.articuloService.obtenerArticulosCandy(),
  });

  protected readonly butacasSeleccionadas = signal<string[]>([]);
  protected readonly articulosSeleccionados = signal<Articulo[]>([]);
  protected readonly usuario = this.authService.usuario;
  protected readonly errorReserva = signal<string | null>(null);

  private readonly ahora = signal(Date.now());

  /** Tiempo restante hasta el inicio, en días, horas y minutos. Se detiene en 0 minutos. */
  protected readonly tiempoRestante = computed(() => {
    const funcion = this.funcion.value();
    if (!funcion) return '';

    const minutosRestantes = Math.max(
      0,
      Math.floor((funcion.fechaInicio.getTime() - this.ahora()) / MILISEGUNDOS_POR_MINUTO),
    );
    const dias = Math.floor(minutosRestantes / MINUTOS_POR_DIA);
    const horas = Math.floor((minutosRestantes % MINUTOS_POR_DIA) / MINUTOS_POR_HORA);
    const minutos = minutosRestantes % MINUTOS_POR_HORA;

    const partes: string[] = [];
    if (dias > 0) partes.push(pluralizar(dias, 'día', 'días'));
    if (dias > 0 || horas > 0) partes.push(pluralizar(horas, 'hora', 'horas'));
    partes.push(pluralizar(minutos, 'minuto', 'minutos'));
    return partes.join(' ');
  });

  protected readonly modelo = signal({ emailContacto: '' });

  protected readonly formulario = form(
    this.modelo,
    (ruta) => {
      email(ruta.emailContacto, { message: 'Ingresá un correo electrónico válido.' });
      validate(ruta.emailContacto, requeridoSiAnonimo(this.usuario));
    },
    {
      submission: {
        ignoreValidators: 'none',
        action: async () => {
          this.errorReserva.set(null);
          const funcionActual = this.funcion.value();
          if (!funcionActual || this.butacasSeleccionadas().length === 0) return undefined;

          try {
            const { orden } = await this.ordenService.crearOrden({
              funcion: funcionActual,
              butacas: this.butacasSeleccionadas(),
              articulos: this.articulosSeleccionados(),
              usuario: this.usuario(),
              emailContacto: this.usuario() ? null : this.modelo().emailContacto.trim(),
            });
            await this.router.navigate(['/checkout', orden.id]);
          } catch {
            this.errorReserva.set('No se pudo completar la reserva. Intentá nuevamente.');
          }
          return undefined;
        },
      },
    },
  );

  constructor() {
    const temporizador = setInterval(() => this.ahora.set(Date.now()), INTERVALO_CRONOMETRO_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(temporizador));
  }
}
