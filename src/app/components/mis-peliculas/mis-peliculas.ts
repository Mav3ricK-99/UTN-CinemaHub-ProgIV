import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { ResenaService } from '../../services/resena.service';
import { TarjetaPeliculaVista } from './tarjeta-pelicula-vista/tarjeta-pelicula-vista';

@Component({
  selector: 'app-mis-peliculas',
  imports: [RouterLink, TarjetaPeliculaVista],
  templateUrl: './mis-peliculas.html',
})
export class MisPeliculas {
  private readonly resenaService = inject(ResenaService);
  protected readonly usuario = inject(AuthService).usuario;

  protected readonly misPeliculas = resource({
    params: () => this.usuario(),
    loader: ({ params: usuario }) => (usuario ? this.resenaService.obtenerMisPeliculas(usuario) : Promise.resolve([])),
  });
}
