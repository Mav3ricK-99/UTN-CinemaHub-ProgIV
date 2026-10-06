import { Component, inject, resource } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Pelicula } from '../../../../classes/pelicula';
import { PeliculaService } from '../../../../services/pelicula.service';
import { FormularioPelicula } from '../nueva-pelicula/formulario-pelicula/formulario-pelicula';

@Component({
  selector: 'app-editar-pelicula',
  imports: [RouterLink, FormularioPelicula],
  templateUrl: './editar-pelicula.html',
})
export class EditarPelicula {
  private readonly peliculaService = inject(PeliculaService);
  private readonly router = inject(Router);
  private readonly idPelicula = inject(ActivatedRoute).snapshot.paramMap.get('idPelicula') ?? '';

  protected readonly pelicula = resource({
    loader: () => this.peliculaService.obtenerPeliculaPorId(this.idPelicula),
  });

  protected alGuardarPelicula(_pelicula: Pelicula): void {
    this.router.navigate(['/backoffice/peliculas']);
  }
}
