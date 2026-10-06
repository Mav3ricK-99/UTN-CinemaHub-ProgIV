import { Component, inject, resource } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Articulo } from '../../../../classes/articulo';
import { ArticuloService } from '../../../../services/articulo.service';
import { FormularioArticulo } from '../nuevo-articulo/formulario-articulo/formulario-articulo';

@Component({
  selector: 'app-editar-articulo',
  imports: [RouterLink, FormularioArticulo],
  templateUrl: './editar-articulo.html',
})
export class EditarArticulo {
  private readonly articuloService = inject(ArticuloService);
  private readonly router = inject(Router);
  private readonly idArticulo = inject(ActivatedRoute).snapshot.paramMap.get('idArticulo') ?? '';

  protected readonly articulo = resource({
    loader: () => this.articuloService.obtenerArticuloPorId(this.idArticulo),
  });

  protected alGuardarArticulo(_articulo: Articulo): void {
    this.router.navigate(['/backoffice/articulos']);
  }
}
