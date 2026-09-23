import { DatePipe } from '@angular/common';
import { Component, inject, input, linkedSignal, signal } from '@angular/core';

import { Usuario } from '../../../classes/usuario';
import { AsistenciaPelicula, ResenaService } from '../../../services/resena.service';

const PUNTAJE_MAXIMO = 5;

@Component({
  selector: 'app-tarjeta-pelicula-vista',
  imports: [DatePipe],
  templateUrl: './tarjeta-pelicula-vista.html',
})
export class TarjetaPeliculaVista {
  private readonly resenaService = inject(ResenaService);

  readonly asistencia = input.required<AsistenciaPelicula>();
  readonly usuario = input.required<Usuario>();

  protected readonly estrellas = Array.from({ length: PUNTAJE_MAXIMO }, (_valor, indice) => indice + 1);

  protected readonly resena = linkedSignal(() => this.asistencia().resena);
  protected readonly comentario = signal('');
  protected readonly puntajeSeleccionado = signal(0);
  protected readonly puntajeResaltado = signal(0);
  protected readonly guardando = signal(false);

  protected seleccionarPuntaje(puntaje: number): void {
    this.puntajeSeleccionado.set(puntaje);
  }

  protected resaltarPuntaje(puntaje: number): void {
    this.puntajeResaltado.set(puntaje);
  }

  protected quitarResaltado(): void {
    this.puntajeResaltado.set(0);
  }

  protected async calificar(): Promise<void> {
    if (this.puntajeSeleccionado() === 0) return;

    this.guardando.set(true);
    try {
      const resena = await this.resenaService.guardarResena({
        pelicula: this.asistencia().pelicula,
        usuario: this.usuario(),
        puntaje: this.puntajeSeleccionado(),
        comentario: this.comentario().trim(),
      });
      this.resena.set(resena);
    } finally {
      this.guardando.set(false);
    }
  }
}
