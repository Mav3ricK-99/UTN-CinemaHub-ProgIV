import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, resource, signal } from '@angular/core';

import { Pelicula } from '../../../classes/pelicula';
import { ResenaService } from '../../../services/resena.service';
import { EstrellasCalificacion } from '../../shared/estrellas-calificacion/estrellas-calificacion';

const SEGUNDOS_POR_RESENA = 5;
const DURACION_MINIMA_SEGUNDOS = 15;

@Component({
  selector: 'app-resenas-pelicula',
  imports: [DatePipe, EstrellasCalificacion],
  templateUrl: './resenas-pelicula.html',
  styleUrl: './resenas-pelicula.css',
})
export class ResenasPelicula {
  private readonly resenaService = inject(ResenaService);

  readonly pelicula = input.required<Pelicula>();

  protected readonly resenas = resource({
    params: () => this.pelicula(),
    loader: ({ params: pelicula }) => this.resenaService.obtenerResenasDePelicula(pelicula),
  });

  protected readonly pausado = signal(false);

  /** Se duplica la lista para lograr un desplazamiento continuo y sin cortes. */
  protected readonly resenasParaMarquesina = computed(() => {
    const resenas = this.resenas.value() ?? [];
    return [...resenas, ...resenas];
  });

  protected readonly duracionSegundos = computed(
    () => (this.resenas.value()?.length ?? 0) * SEGUNDOS_POR_RESENA + DURACION_MINIMA_SEGUNDOS,
  );

  protected esDuplicado(indice: number): boolean {
    return indice >= (this.resenas.value()?.length ?? 0);
  }

  protected avatarUrl(idUsuario: string): string {
    return `https://i.pravatar.cc/80?u=${encodeURIComponent(idUsuario)}`;
  }

  protected pausar(): void {
    this.pausado.set(true);
  }

  protected reanudar(): void {
    this.pausado.set(false);
  }
}
