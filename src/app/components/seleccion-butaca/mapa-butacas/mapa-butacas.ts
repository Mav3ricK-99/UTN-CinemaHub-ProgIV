import { Component, computed, input, model } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { Butaca, Sala } from '../../../classes/sala';

export const MAXIMO_BUTACAS_SELECCIONADAS = 5;

/** Cantidad de columnas de cada bloque separado por pasillos (4 + 20 + 4 = 28 columnas). */
const COLUMNAS_POR_BLOQUE = [4, 20, 4];

type EstadoButaca =
  | 'disponible'
  | 'seleccionada'
  | 'ocupada'
  | 'especialDisponible'
  | 'especialOcupada'
  | 'discapacitadosDisponible'
  | 'discapacitadosOcupada';

interface ButacaMapa {
  id: string;
  estado: EstadoButaca;
  deshabilitada: boolean;
}

interface FilaMapa {
  letra: string;
  bloques: ButacaMapa[][];
}

/** Color del ícono de cada estado. Las clases se escriben completas para que Tailwind las detecte. */
const CLASE_COLOR_ESTADO: Record<EstadoButaca, string> = {
  disponible: 'text-[#4a5a72]',
  seleccionada: 'text-green-300',
  ocupada: 'text-[#305543]',
  especialDisponible: 'text-[#f0d878]',
  especialOcupada: 'text-[#857233]',
  discapacitadosDisponible: 'text-sky-400',
  discapacitadosOcupada: 'text-[#2c5a73]',
};

const DESCRIPCION_ESTADO: Record<EstadoButaca, string> = {
  disponible: 'disponible',
  seleccionada: 'seleccionada',
  ocupada: 'ocupada',
  especialDisponible: 'especial disponible',
  especialOcupada: 'especial ocupada',
  discapacitadosDisponible: 'para discapacitados disponible',
  discapacitadosOcupada: 'para discapacitados ocupada',
};

function obtenerEstadoButaca(butaca: Butaca, ocupada: boolean): EstadoButaca {
  if (butaca.esDiscapacitados) return ocupada ? 'discapacitadosOcupada' : 'discapacitadosDisponible';
  if (butaca.esEspecial) return ocupada ? 'especialOcupada' : 'especialDisponible';
  return ocupada ? 'ocupada' : 'disponible';
}

@Component({
  selector: 'app-mapa-butacas',
  imports: [ButtonModule],
  templateUrl: './mapa-butacas.html',
})
export class MapaButacas {
  readonly sala = input.required<Sala>();
  readonly butacasReservadas = input.required<string[]>();
  readonly butacasSeleccionadas = model<string[]>([]);
  /** Cantidad máxima de butacas seleccionables. Con un combo, es la cantidad de entradas del combo. */
  readonly maximoButacas = input(MAXIMO_BUTACAS_SELECCIONADAS);
  protected readonly claseColorEstado = CLASE_COLOR_ESTADO;

  protected readonly leyenda: { estado: EstadoButaca; texto: string }[] = [
    { estado: 'disponible', texto: 'Disponible' },
    { estado: 'seleccionada', texto: 'Seleccionada' },
    { estado: 'ocupada', texto: 'Ocupada' },
    { estado: 'especialDisponible', texto: 'Especial disponible (+15%)' },
    { estado: 'especialOcupada', texto: 'Especial ocupada' },
    { estado: 'discapacitadosDisponible', texto: 'Para discapacitados disponible' },
    { estado: 'discapacitadosOcupada', texto: 'Para discapacitados ocupada' },
  ];

  protected readonly limiteAlcanzado = computed(
    () => this.butacasSeleccionadas().length >= this.maximoButacas(),
  );

  protected readonly filas = computed<FilaMapa[]>(() => {
    const reservadas = new Set(this.butacasReservadas());
    const seleccionadas = new Set(this.butacasSeleccionadas());
    const limiteAlcanzado = this.limiteAlcanzado();

    const butacasPorFila = new Map<string, Butaca[]>();
    for (const butaca of this.sala().butacas) {
      const letra = butaca.id[0];
      butacasPorFila.set(letra, [...(butacasPorFila.get(letra) ?? []), butaca]);
    }

    return [...butacasPorFila.entries()]
      .sort(([letraA], [letraB]) => letraA.localeCompare(letraB))
      .map(([letra, butacas]) => {
        const butacasFila = butacas
          .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)))
          .map<ButacaMapa>((butaca) => {
            const seleccionada = seleccionadas.has(butaca.id);
            const ocupada = reservadas.has(butaca.id);
            const estado = seleccionada ? 'seleccionada' : obtenerEstadoButaca(butaca, ocupada);
            return { id: butaca.id, estado, deshabilitada: ocupada || (limiteAlcanzado && !seleccionada) };
          });

        let inicio = 0;
        const bloques = COLUMNAS_POR_BLOQUE.map((columnas) => {
          const bloque = butacasFila.slice(inicio, inicio + columnas);
          inicio += columnas;
          return bloque;
        });
        return { letra, bloques };
      });
  });

  protected descripcionButaca(butaca: ButacaMapa): string {
    return `Butaca ${butaca.id}, ${DESCRIPCION_ESTADO[butaca.estado]}`;
  }

  protected alternarButaca(idButaca: string): void {
    this.butacasSeleccionadas.update((seleccionadas) => {
      if (seleccionadas.includes(idButaca)) {
        return seleccionadas.filter((id) => id !== idButaca);
      }
      if (seleccionadas.length >= this.maximoButacas()) return seleccionadas;
      return [...seleccionadas, idButaca];
    });
  }
}
