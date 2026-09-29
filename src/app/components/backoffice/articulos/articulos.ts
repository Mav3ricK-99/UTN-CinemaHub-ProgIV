import { CurrencyPipe } from '@angular/common';
import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { ArticuloService } from '../../../services/articulo.service';

@Component({
  selector: 'app-articulos',
  imports: [CurrencyPipe, RouterLink, TableModule, TagModule],
  templateUrl: './articulos.html',
})
export class Articulos {
  private readonly articuloService = inject(ArticuloService);

  protected readonly articulos = resource({ loader: () => this.articuloService.obtenerArticulos() });
}
