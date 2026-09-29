import { DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FuncionRecurrenteCreada } from '../../../../services/funcion.service';
import { FormularioFuncion } from './formulario-funcion/formulario-funcion';

@Component({
  selector: 'app-nueva-funcion',
  imports: [DatePipe, RouterLink, FormularioFuncion],
  templateUrl: './nueva-funcion.html',
})
export class NuevaFuncion {
  protected readonly mostrarFormulario = signal(true);
  protected readonly funcionesCreadas = signal<FuncionRecurrenteCreada[] | null>(null);

  protected alCrearFunciones(funciones: FuncionRecurrenteCreada[]): void {
    this.funcionesCreadas.set(funciones);
    this.mostrarFormulario.set(false);
    setTimeout(() => this.mostrarFormulario.set(true));
  }
}
