import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Combo } from '../../../../classes/combo';
import { FormularioCombo } from './formulario-combo/formulario-combo';

@Component({
  selector: 'app-nuevo-combo',
  imports: [RouterLink, FormularioCombo],
  templateUrl: './nuevo-combo.html',
})
export class NuevoCombo {
  protected readonly mostrarFormulario = signal(true);
  protected readonly mensajeExito = signal<string | null>(null);

  protected alCrearCombo(combo: Combo): void {
    this.mensajeExito.set(`"${combo.nombre}" se creó correctamente.`);
    // Recrea el formulario para que empiece limpio (valores y estado "touched") para el próximo combo.
    this.mostrarFormulario.set(false);
    setTimeout(() => this.mostrarFormulario.set(true));
  }
}
