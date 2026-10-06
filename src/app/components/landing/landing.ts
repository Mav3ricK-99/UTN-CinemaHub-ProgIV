import { Component, computed, inject, resource } from '@angular/core';

import { Funcion } from '../../classes/funcion';
import { FuncionService } from '../../services/funcion.service';
import { PeliculaService } from '../../services/pelicula.service';
import { CarteleraSlider } from './cartelera-slider/cartelera-slider';
import { FuncionesPasadas } from './funciones-pasadas/funciones-pasadas';
import { InformacionCine } from './informacion-cine/informacion-cine';
import { PeliculasProximamente } from './peliculas-proximamente/peliculas-proximamente';

/** Conserva solo la primera función de cada película (la lista ya viene ordenada por fecha). */
function unaPorPelicula(funciones: Funcion[]): Funcion[] {
  const peliculasVistas = new Set<string>();
  return funciones.filter((funcion) => {
    if (peliculasVistas.has(funcion.pelicula.id)) return false;
    peliculasVistas.add(funcion.pelicula.id);
    return true;
  });
}

@Component({
  selector: 'app-landing',
  imports: [CarteleraSlider, FuncionesPasadas, InformacionCine, PeliculasProximamente],
  templateUrl: './landing.html',
})
export class Landing {
  private readonly funcionService = inject(FuncionService);
  private readonly peliculaService = inject(PeliculaService);

  protected readonly peliculasProximamente = resource({
    loader: () => this.peliculaService.obtenerPeliculasProximamente(),
  });

  protected readonly funcionesProximas = resource({
    loader: () => this.funcionService.obtenerFuncionesProximas(),
  });

  protected readonly funcionesPasadas = resource({
    loader: () => this.funcionService.obtenerFuncionesPasadas(),
  });

  private readonly reservasPorPelicula = resource({
    loader: () => this.funcionService.obtenerButacasReservadasPorPelicula(),
  });

  /** Una función por película, con las películas más reservadas primero. */
  protected readonly funcionesProximasUnicas = computed(() => {
    const reservasPorPelicula = this.reservasPorPelicula.value();
    const funciones = unaPorPelicula(this.funcionesProximas.value() ?? []);
    if (!reservasPorPelicula) return funciones;

    // sort es estable: a igual cantidad de reservas se mantiene el orden por fecha.
    return funciones.sort(
      (a, b) => (reservasPorPelicula.get(b.pelicula.id) ?? 0) - (reservasPorPelicula.get(a.pelicula.id) ?? 0),
    );
  });

  protected readonly funcionesPasadasUnicas = computed(() => unaPorPelicula(this.funcionesPasadas.value() ?? []));
}
