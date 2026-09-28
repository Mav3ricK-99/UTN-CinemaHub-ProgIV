import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputOtp } from 'primeng/inputotp';

import { LARGO_CODIGO_ORDEN } from '../../classes/orden';
import { OrdenConReserva, OrdenService } from '../../services/orden.service';

type EstadoValidacion = 'inicial' | 'buscando' | 'encontrada' | 'noEncontrada' | 'verificando';

@Component({
  selector: 'app-validar-entrada',
  imports: [FormsModule, InputOtp, DatePipe, CurrencyPipe],
  templateUrl: './validar-entrada.html',
})
export class ValidarEntrada {
  private readonly ordenService = inject(OrdenService);

  protected readonly largoCodigo = LARGO_CODIGO_ORDEN;
  protected readonly codigo = signal('');
  protected readonly estado = signal<EstadoValidacion>('inicial');
  protected readonly resultado = signal<OrdenConReserva | null>(null);

  protected alCambiarCodigo(valorIngresado: string): void {
    const valor = valorIngresado.toUpperCase();
    this.codigo.set(valor);

    if (this.estado() === 'encontrada' || this.estado() === 'noEncontrada') {
      this.resultado.set(null);
      this.estado.set('inicial');
    }

    if (valor.length === this.largoCodigo) void this.buscar();
  }

  protected async buscar(): Promise<void> {
    this.estado.set('buscando');
    const ordenConReserva = await this.ordenService.buscarOrdenPorCodigo(this.codigo());
    this.resultado.set(ordenConReserva);
    this.estado.set(ordenConReserva ? 'encontrada' : 'noEncontrada');
  }

  protected async confirmarIngreso(): Promise<void> {
    const actual = this.resultado();
    if (!actual) return;

    this.estado.set('verificando');
    const ordenVerificada = await this.ordenService.verificarOrden(actual.orden.id);
    this.resultado.set({ ...actual, orden: ordenVerificada });
    this.estado.set('encontrada');
  }

  protected reiniciar(): void {
    this.codigo.set('');
    this.resultado.set(null);
    this.estado.set('inicial');
  }
}
