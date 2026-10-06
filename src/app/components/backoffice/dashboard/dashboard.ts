import { DatePipe } from '@angular/common';
import { Component, inject, resource } from '@angular/core';
import { TabsModule } from 'primeng/tabs';

import { TOTAL_BUTACAS_SALA } from '../../../classes/sala';
import { FuncionService } from '../../../services/funcion.service';
import { OrdenService } from '../../../services/orden.service';
import { ResenaService } from '../../../services/resena.service';
import { SalaService } from '../../../services/sala.service';
import { EstadoSala } from './estado-sala';
import { GraficoCandy } from './grafico-candy/grafico-candy';
import { GraficoPeliculas } from './grafico-peliculas/grafico-peliculas';
import { TarjetaMetrica } from './tarjeta-metrica/tarjeta-metrica';
import { TarjetaSala } from './tarjeta-sala/tarjeta-sala';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, GraficoCandy, GraficoPeliculas, TabsModule, TarjetaMetrica, TarjetaSala],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly funcionService = inject(FuncionService);
  private readonly ordenService = inject(OrdenService);
  private readonly resenaService = inject(ResenaService);
  private readonly salaService = inject(SalaService);
  protected readonly totalButacasSala = TOTAL_BUTACAS_SALA;

  protected readonly funcionesRealizadas = resource({ loader: () => this.funcionService.contarFuncionesPasadas() });
  protected readonly comentariosRealizados = resource({ loader: () => this.resenaService.contarResenas() });
  protected readonly entradasVendidas = resource({ loader: () => this.ordenService.contarEntradasVendidas() });

  protected readonly estadoSalas = resource<EstadoSala[], void>({
    loader: async () => {
      const [salas, funcionesEnCurso] = await Promise.all([
        this.salaService.obtenerSalas(),
        this.funcionService.obtenerFuncionesEnCurso(),
      ]);
      const enCursoPorSala = new Map(funcionesEnCurso.map((funcion) => [funcion.sala.id, funcion]));

      return salas.map((sala) => {
        const funcion = enCursoPorSala.get(sala.id);
        return { sala, pelicula: funcion?.pelicula ?? null, finalizaEn: funcion?.fechaFin ?? null };
      });
    },
  });

  protected readonly proximasFunciones = resource({ loader: () => this.funcionService.obtenerFuncionesProximas() });
}
