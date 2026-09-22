import { Component, computed, input, model } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { Butaca, Sala } from '../../../classes/sala';

export const MAXIMO_BUTACAS_SELECCIONADAS = 5;

/** Cantidad de columnas de cada bloque separado por pasillos (4 + 20 + 4 = 28 columnas). */
const COLUMNAS_POR_BLOQUE = [4, 20, 4];

type EstadoButaca = 'disponible' | 'seleccionada' | 'ocupada' | 'especialDisponible' | 'especialOcupada';

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
};

const DESCRIPCION_ESTADO: Record<EstadoButaca, string> = {
  disponible: 'disponible',
  seleccionada: 'seleccionada',
  ocupada: 'ocupada',
  especialDisponible: 'especial disponible',
  especialOcupada: 'especial ocupada',
};

@Component({
  selector: 'app-mapa-butacas',
  imports: [ButtonModule],
  templateUrl: './mapa-butacas.html',
})
export class MapaButacas {
  readonly sala = input.required<Sala>();
  readonly butacasReservadas = input.required<string[]>();
  readonly butacasSeleccionadas = model<string[]>([]);

  protected readonly maximoButacas = MAXIMO_BUTACAS_SELECCIONADAS;
  protected readonly claseColorEstado = CLASE_COLOR_ESTADO;

  protected readonly leyenda: { estado: EstadoButaca; texto: string }[] = [
    { estado: 'disponible', texto: 'Disponible' },
    { estado: 'seleccionada', texto: 'Seleccionada' },
    { estado: 'ocupada', texto: 'Ocupada' },
    { estado: 'especialDisponible', texto: 'Especial disponible' },
    { estado: 'especialOcupada', texto: 'Especial ocupada' },
  ];

  protected readonly limiteAlcanzado = computed(
    () => this.butacasSeleccionadas().length >= MAXIMO_BUTACAS_SELECCIONADAS,
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
            const estado: EstadoButaca = seleccionada
              ? 'seleccionada'
              : butaca.esEspecial
                ? ocupada
                  ? 'especialOcupada'
                  : 'especialDisponible'
                : ocupada
                  ? 'ocupada'
                  : 'disponible';
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
      if (seleccionadas.length >= MAXIMO_BUTACAS_SELECCIONADAS) return seleccionadas;
      return [...seleccionadas, idButaca];
    });
  }
}
