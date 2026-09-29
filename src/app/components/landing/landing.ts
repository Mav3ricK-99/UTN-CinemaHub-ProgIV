import { Component, computed, inject, resource } from '@angular/core';

import { Funcion } from '../../classes/funcion';
import { FuncionService } from '../../services/funcion.service';
import { CarteleraSlider } from './cartelera-slider/cartelera-slider';
import { FuncionesPasadas } from './funciones-pasadas/funciones-pasadas';
import { InformacionCine } from './informacion-cine/informacion-cine';

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
  imports: [CarteleraSlider, FuncionesPasadas, InformacionCine],
  templateUrl: './landing.html',
})
export class Landing {
  private readonly funcionService = inject(FuncionService);

  protected readonly funcionesProximas = resource({
    loader: () => this.funcionService.obtenerFuncionesProximas(),
  });

  protected readonly funcionesPasadas = resource({
    loader: () => this.funcionService.obtenerFuncionesPasadas(),
  });

  protected readonly funcionesProximasUnicas = computed(() => unaPorPelicula(this.funcionesProximas.value() ?? []));

  protected readonly funcionesPasadasUnicas = computed(() => unaPorPelicula(this.funcionesPasadas.value() ?? []));
}
