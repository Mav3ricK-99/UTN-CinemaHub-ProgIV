import { Component, inject, resource } from '@angular/core';
import { ChartModule } from '@primeui/angular-chart';

import { ArticuloService } from '../../../../services/articulo.service';

@Component({
  selector: 'app-grafico-candy',
  imports: [ChartModule],
  templateUrl: './grafico-candy.html',
})
export class GraficoCandy {
  private readonly articuloService = inject(ArticuloService);
  protected readonly formatoEntero = { maximumFractionDigits: 0 };

  protected readonly unidadesPorArticulo = resource({ loader: () => this.articuloService.obtenerArticulosMasVendidos() });
}
