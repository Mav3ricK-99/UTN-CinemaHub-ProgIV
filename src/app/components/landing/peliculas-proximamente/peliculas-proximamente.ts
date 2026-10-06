import { Component, computed, HostListener, input, signal } from '@angular/core';

import { Pelicula } from '../../../classes/pelicula';
import { Parallax } from '../../../directives/parallax';

// Separación vertical fija de cada columna, para que no queden alineadas.
const DESFASES_COLUMNA = ['mt-0', 'mt-16', 'mt-6', 'mt-24', 'mt-10'];
// Velocidad de desplazamiento por scroll de cada columna.
const VELOCIDADES_COLUMNA = [0.06, 0.14, 0.09, 0.16, 0.11];

function calcularCantidadColumnas(): number {
  const ancho = window.innerWidth;
  if (ancho < 640) return 2;
  if (ancho < 1024) return 3;
  if (ancho < 1280) return 4;
  return 5;
}

@Component({
  selector: 'app-peliculas-proximamente',
  imports: [Parallax],
  templateUrl: './peliculas-proximamente.html',
})
export class PeliculasProximamente {
  readonly peliculas = input.required<Pelicula[]>();

  protected readonly cantidadColumnas = signal(calcularCantidadColumnas());

  protected readonly columnas = computed(() => {
    const cantidad = this.cantidadColumnas();
    const columnas = Array.from({ length: cantidad }, () => [] as Pelicula[]);
    this.peliculas().forEach((pelicula, indice) => columnas[indice % cantidad].push(pelicula));
    return columnas.map((peliculas, indice) => ({
      peliculas,
      desfase: DESFASES_COLUMNA[indice % DESFASES_COLUMNA.length],
      velocidad: VELOCIDADES_COLUMNA[indice % VELOCIDADES_COLUMNA.length],
    }));
  });

  @HostListener('window:resize')
  protected alCambiarTamano(): void {
    this.cantidadColumnas.set(calcularCantidadColumnas());
  }
}
