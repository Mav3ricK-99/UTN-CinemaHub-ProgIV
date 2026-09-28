import { Component, input } from '@angular/core';

@Component({
  selector: 'app-tarjeta-metrica',
  templateUrl: './tarjeta-metrica.html',
})
export class TarjetaMetrica {
  readonly titulo = input.required<string>();
  readonly valor = input.required<number>();
  readonly icono = input.required<string>();
}
