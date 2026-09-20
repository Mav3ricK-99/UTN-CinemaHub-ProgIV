import { Component, inject, resource } from '@angular/core';

import { FuncionService } from '../../services/funcion.service';
import { CarteleraSlider } from './cartelera-slider/cartelera-slider';
import { FuncionesPasadas } from './funciones-pasadas/funciones-pasadas';
import { InformacionCine } from './informacion-cine/informacion-cine';

@Component({
  selector: 'app-landing',
  imports: [CarteleraSlider, FuncionesPasadas, InformacionCine],
  templateUrl: './landing.html',
})
export class Landing {
  private readonly funcionService = inject(FuncionService);

  protected readonly funcionesProximas = resource({
    loader: () => this.funcionService.obtenerFuncionesProximas(),
  });

  protected readonly funcionesPasadas = resource({
    loader: () => this.funcionService.obtenerFuncionesPasadas(),
  });
}
