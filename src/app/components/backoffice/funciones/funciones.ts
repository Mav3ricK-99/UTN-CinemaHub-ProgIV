import { DatePipe } from '@angular/common';
import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { Funcion } from '../../../classes/funcion';
import { FuncionService } from '../../../services/funcion.service';

const MINUTOS_LIMPIEZA_SALA = 30;

@Component({
  selector: 'app-funciones',
  imports: [DatePipe, RouterLink, TableModule, TagModule],
  templateUrl: './funciones.html',
})
export class Funciones {
  private readonly funcionService = inject(FuncionService);

  protected readonly funciones = resource({ loader: () => this.funcionService.obtenerFunciones() });

  protected esProxima(funcion: Funcion): boolean {
    return funcion.fechaInicio.getTime() > Date.now();
  }

  protected salaLibreDesde(funcion: Funcion): Date {
    return new Date(funcion.fechaFin.getTime() + MINUTOS_LIMPIEZA_SALA * 60_000);
  }
}
