import { Component, input } from '@angular/core';

import { Pelicula } from '../../../../../../classes/pelicula';

@Component({
  selector: 'app-previsualizacion-pelicula',
  templateUrl: './previsualizacion-pelicula.html',
})
export class PrevisualizacionPelicula {
  readonly pelicula = input.required<Pelicula>();
}
