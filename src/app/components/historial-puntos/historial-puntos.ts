import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { PuntosService } from '../../services/puntos.service';

@Component({
  selector: 'app-historial-puntos',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './historial-puntos.html',
})
export class HistorialPuntos {
  private readonly authService = inject(AuthService);
  private readonly puntosService = inject(PuntosService);
  protected readonly usuario = this.authService.usuario;

  protected readonly movimientos = resource({
    params: () => this.usuario(),
    loader: ({ params: usuario }) => (usuario ? this.puntosService.obtenerHistorial(usuario.id) : Promise.resolve([])),
  });
}
