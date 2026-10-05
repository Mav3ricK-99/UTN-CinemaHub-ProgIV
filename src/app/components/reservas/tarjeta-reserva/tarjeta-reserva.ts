import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../services/auth.service';
import { OrdenConReserva, OrdenService } from '../../../services/orden.service';

const MILISEGUNDOS_POR_HORA = 60 * 60 * 1000;
const HORAS_LIMITE_ANULACION = 2;

@Component({
  selector: 'app-tarjeta-reserva',
  imports: [DatePipe, CurrencyPipe, DecimalPipe, RouterLink],
  templateUrl: './tarjeta-reserva.html',
})
export class TarjetaReserva {
  private readonly ordenService = inject(OrdenService);
  private readonly authService = inject(AuthService);

  readonly ordenConReserva = input.required<OrdenConReserva>();
  readonly reservaAnulada = output<void>();

  protected readonly confirmando = signal(false);
  protected readonly anulando = signal(false);
  protected readonly errorAnulacion = signal<string | null>(null);

  /** `true` si falta al menos el límite de horas para el inicio de la función (exactamente el límite todavía vale). */
  protected readonly dentroDelLimite = computed(() => this.faltaAlMenosElLimite());

  protected iniciarConfirmacion(): void {
    this.errorAnulacion.set(null);
    this.confirmando.set(this.faltaAlMenosElLimite());
    if (!this.confirmando()) this.errorAnulacion.set('Ya pasó el límite para anular esta reserva.');
  }

  protected cancelarConfirmacion(): void {
    this.confirmando.set(false);
  }

  protected async anular(): Promise<void> {
    this.anulando.set(true);
    this.errorAnulacion.set(null);
    try {
      await this.ordenService.cancelarOrden(this.ordenConReserva().orden.id);
      await this.authService.actualizarUsuario();
      this.reservaAnulada.emit();
    } catch (error) {
      const mensaje = (error as { message?: string } | null)?.message;
      this.errorAnulacion.set(mensaje || 'No se pudo anular la reserva. Intentá nuevamente.');
      this.confirmando.set(false);
    } finally {
      this.anulando.set(false);
    }
  }

  private faltaAlMenosElLimite(): boolean {
    const milisegundosRestantes = this.ordenConReserva().reserva.funcion.fechaInicio.getTime() - Date.now();
    return milisegundosRestantes >= HORAS_LIMITE_ANULACION * MILISEGUNDOS_POR_HORA;
  }
}
