import { Component, computed, input } from '@angular/core';

import { EstadoSala } from '../estado-sala';

const MILISEGUNDOS_POR_MINUTO = 60 * 1000;

@Component({
  selector: 'app-tarjeta-sala',
  templateUrl: './tarjeta-sala.html',
})
export class TarjetaSala {
  readonly estado = input.required<EstadoSala>();

  protected readonly minutosRestantes = computed(() => {
    const finalizaEn = this.estado().finalizaEn;
    if (!finalizaEn) return 0;
    return Math.max(0, Math.round((finalizaEn.getTime() - Date.now()) / MILISEGUNDOS_POR_MINUTO));
  });
}
