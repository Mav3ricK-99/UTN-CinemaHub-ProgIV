import { Component, input } from '@angular/core';

export type EstadoEstrella = 'llena' | 'media' | 'vacia';

const PUNTAJE_MAXIMO = 5;

function calcularEstadoEstrella(puntaje: number, indiceEstrella: number): EstadoEstrella {
  const diferencia = puntaje - indiceEstrella;
  if (diferencia >= 1) return 'llena';
  if (diferencia >= 0.5) return 'media';
  return 'vacia';
}

@Component({
  selector: 'app-estrellas-calificacion',
  templateUrl: './estrellas-calificacion.html',
})
export class EstrellasCalificacion {
  /** Puntaje a representar, de 0 a 5. Admite decimales (ej: 4.5 muestra media estrella). */
  readonly puntaje = input.required<number>();

  protected readonly estrellas = Array.from({ length: PUNTAJE_MAXIMO }, (_valor, indice) => indice);
  protected readonly estadoEstrella = calcularEstadoEstrella;
}
