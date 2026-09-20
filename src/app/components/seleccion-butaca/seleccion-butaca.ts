import { Component, computed, DestroyRef, inject, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FuncionService } from '../../services/funcion.service';
import { MapaButacas } from './mapa-butacas/mapa-butacas';

const MILISEGUNDOS_POR_MINUTO = 60 * 1000;
const MINUTOS_POR_HORA = 60;
const MINUTOS_POR_DIA = 24 * MINUTOS_POR_HORA;
const INTERVALO_CRONOMETRO_MS = 1000;

function pluralizar(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

@Component({
  selector: 'app-seleccion-butaca',
  imports: [RouterLink, MapaButacas],
  templateUrl: './seleccion-butaca.html',
})
export class SeleccionButaca {
  private readonly funcionService = inject(FuncionService);

  /** Id de la función, tomado del parámetro `:idFuncion` de la ruta. */
  readonly idFuncion = input.required<string>();

  protected readonly funcion = resource({
    params: () => this.idFuncion(),
    loader: ({ params: idFuncion }) => this.funcionService.obtenerFuncionPorId(idFuncion),
  });

  protected readonly butacasSeleccionadas = signal<string[]>([]);

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

  constructor() {
    const temporizador = setInterval(() => this.ahora.set(Date.now()), INTERVALO_CRONOMETRO_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(temporizador));
  }
}
