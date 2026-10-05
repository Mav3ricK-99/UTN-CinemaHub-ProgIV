import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { Funcion } from '../../../classes/funcion';
import { Pelicula } from '../../../classes/pelicula';
import { FuncionService } from '../../../services/funcion.service';
import { PeliculaService } from '../../../services/pelicula.service';
import { EstrellasCalificacion } from '../../shared/estrellas-calificacion/estrellas-calificacion';

interface PeliculaConProximaFuncion {
  pelicula: Pelicula;
  proximaFuncion: Funcion | null;
}

@Component({
  selector: 'app-peliculas',
  imports: [DatePipe, DecimalPipe, RouterLink, TableModule, TagModule, EstrellasCalificacion],
  templateUrl: './peliculas.html',
})
export class Peliculas {
  private readonly peliculaService = inject(PeliculaService);
  private readonly funcionService = inject(FuncionService);

  protected readonly peliculas = resource({ loader: () => this.obtenerPeliculasConProximaFuncion() });

  private async obtenerPeliculasConProximaFuncion(): Promise<PeliculaConProximaFuncion[]> {
    const [peliculas, funcionesProximas] = await Promise.all([
      this.peliculaService.obtenerPeliculas(),
      this.funcionService.obtenerFuncionesProximas(),
    ]);

    // Las funciones llegan ordenadas por fecha: la primera de cada película es la más cercana.
    const proximaFuncionPorPelicula = new Map<string, Funcion>();
    for (const funcion of funcionesProximas) {
      if (!proximaFuncionPorPelicula.has(funcion.pelicula.id)) {
        proximaFuncionPorPelicula.set(funcion.pelicula.id, funcion);
      }
    }

    return peliculas.map((pelicula) => ({
      pelicula,
      proximaFuncion: proximaFuncionPorPelicula.get(pelicula.id) ?? null,
    }));
  }
}
