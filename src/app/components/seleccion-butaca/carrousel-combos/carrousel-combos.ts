import { CurrencyPipe } from '@angular/common';
import { Component, input, model } from '@angular/core';

import { ComboDetalle } from '../../../classes/combo';

@Component({
  selector: 'app-carrousel-combos',
  imports: [CurrencyPipe],
  templateUrl: './carrousel-combos.html',
})
export class CarrouselCombos {
  readonly combos = input.required<ComboDetalle[]>();
  readonly comboSeleccionado = model<ComboDetalle | null>(null);

  protected estaSeleccionado(combo: ComboDetalle): boolean {
    return this.comboSeleccionado()?.id === combo.id;
  }

  /** Selecciona el combo. Si ya estaba seleccionado, lo deselecciona. */
  protected alternarCombo(combo: ComboDetalle): void {
    this.comboSeleccionado.set(this.estaSeleccionado(combo) ? null : combo);
  }
}
