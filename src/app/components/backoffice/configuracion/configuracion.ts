import { Component, inject, linkedSignal, resource, signal } from '@angular/core';
import { form, FormField, FormRoot, max, min, required } from '@angular/forms/signals';

import { ConfiguracionService } from '../../../services/configuracion.service';

const DESCUENTO_MINIMO = 0;
const DESCUENTO_MAXIMO = 100;

interface ModeloConfiguracion {
  descuentoPrimeraCompra: number | null;
}

@Component({
  selector: 'app-configuracion',
  imports: [FormField, FormRoot],
  templateUrl: './configuracion.html',
})
export class Configuracion {
  private readonly configuracionService = inject(ConfiguracionService);

  protected readonly configuracion = resource({
    loader: () => this.configuracionService.obtenerConfiguracion(),
  });
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly mensajeExito = signal<string | null>(null);

  protected readonly modelo = linkedSignal<ModeloConfiguracion>(() => ({
    descuentoPrimeraCompra: this.configuracion.value()?.descuentoPrimeraCompra ?? null,
  }));

  protected readonly formulario = form(
    this.modelo,
    (ruta) => {
      required(ruta.descuentoPrimeraCompra, { message: 'Ingresá el descuento.' });
      min(ruta.descuentoPrimeraCompra, DESCUENTO_MINIMO, {
        message: `El descuento debe ser de al menos ${DESCUENTO_MINIMO}.`,
      });
      max(ruta.descuentoPrimeraCompra, DESCUENTO_MAXIMO, {
        message: `El descuento no puede superar ${DESCUENTO_MAXIMO}.`,
      });
    },
    {
      submission: {
        ignoreValidators: 'none',
        action: async () => {
          this.errorGeneral.set(null);
          this.mensajeExito.set(null);

          const { descuentoPrimeraCompra } = this.modelo();
          if (descuentoPrimeraCompra === null) return undefined;

          try {
            await this.configuracionService.modificarConfiguracion({ descuentoPrimeraCompra });
            this.mensajeExito.set('La configuración se guardó correctamente.');
          } catch {
            this.errorGeneral.set('No se pudo guardar la configuración. Intentá nuevamente.');
          }
          return undefined;
        },
      },
    },
  );
}
