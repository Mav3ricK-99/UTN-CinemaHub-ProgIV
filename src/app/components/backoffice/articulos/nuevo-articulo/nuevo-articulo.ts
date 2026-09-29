import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Articulo } from '../../../../classes/articulo';
import { FormularioArticulo } from './formulario-articulo/formulario-articulo';

@Component({
  selector: 'app-nuevo-articulo',
  imports: [RouterLink, FormularioArticulo],
  templateUrl: './nuevo-articulo.html',
})
export class NuevoArticulo {
  protected readonly mostrarFormulario = signal(true);
  protected readonly mensajeExito = signal<string | null>(null);

  protected alCrearArticulo(articulo: Articulo): void {
    this.mensajeExito.set(`"${articulo.nombre}" se creó correctamente.`);
    // Recrea el formulario para que empiece limpio (valores y estado "touched") para el próximo artículo.
    this.mostrarFormulario.set(false);
    setTimeout(() => this.mostrarFormulario.set(true));
  }
}
