import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { OrdenService } from '../../services/orden.service';
import { TarjetaReserva } from './tarjeta-reserva/tarjeta-reserva';

@Component({
  selector: 'app-reservas',
  imports: [RouterLink, TarjetaReserva],
  templateUrl: './reservas.html',
})
export class Reservas {
  private readonly authService = inject(AuthService);
  private readonly ordenService = inject(OrdenService);
  protected readonly usuario = this.authService.usuario;

  protected readonly reservas = resource({
    params: () => this.usuario()?.id,
    loader: ({ params: idUsuario }) => this.ordenService.obtenerReservasProximas(idUsuario),
  });
}
