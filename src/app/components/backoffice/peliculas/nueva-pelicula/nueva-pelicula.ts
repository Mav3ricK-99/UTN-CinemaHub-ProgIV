import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Pelicula } from '../../../../classes/pelicula';
import { FormularioPelicula } from './formulario-pelicula/formulario-pelicula';

@Component({
  selector: 'app-nueva-pelicula',
  imports: [RouterLink, FormularioPelicula],
  templateUrl: './nueva-pelicula.html',
})
export class NuevaPelicula {
  protected readonly mostrarFormulario = signal(true);
  protected readonly mensajeExito = signal<string | null>(null);

  protected alCrearPelicula(pelicula: Pelicula): void {
    this.mensajeExito.set(`"${pelicula.nombre}" se creó correctamente.`);
    // Recrea el formulario para que empiece limpio (valores y estado "touched") para la próxima película.
    this.mostrarFormulario.set(false);
    setTimeout(() => this.mostrarFormulario.set(true));
  }
}
