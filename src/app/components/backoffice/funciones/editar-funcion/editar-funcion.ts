import { Component, inject, resource } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Funcion } from '../../../../classes/funcion';
import { FuncionService } from '../../../../services/funcion.service';
import { FormularioFuncion } from '../nueva-funcion/formulario-funcion/formulario-funcion';

@Component({
  selector: 'app-editar-funcion',
  imports: [RouterLink, FormularioFuncion],
  templateUrl: './editar-funcion.html',
})
export class EditarFuncion {
  private readonly funcionService = inject(FuncionService);
  private readonly router = inject(Router);
  private readonly idFuncion = inject(ActivatedRoute).snapshot.paramMap.get('idFuncion') ?? '';

  protected readonly funcion = resource({
    loader: () => this.funcionService.obtenerDetalleFuncion(this.idFuncion),
  });

  protected alGuardarFuncion(_funcion: Funcion): void {
    this.router.navigate(['/backoffice/funciones']);
  }
}
