import { Component, computed, ElementRef, HostListener, inject, resource, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';

import { FuncionService } from '../../../services/funcion.service';

const LARGO_MINIMO_BUSQUEDA = 2;
const ESPERA_BUSQUEDA_MS = 250;
const UMBRAL_SCROLL_PX = 10;

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, FormField],
  templateUrl: './navbar.html',
})
export class Navbar {
  private readonly funcionService = inject(FuncionService);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly busqueda = form(signal({ termino: '' }));
  protected readonly resultadosAbiertos = signal(false);
  protected readonly conScroll = signal(false);

  protected readonly resultados = resource({
    params: () => {
      const termino = this.busqueda.termino().value().trim();
      return termino.length >= LARGO_MINIMO_BUSQUEDA ? termino : undefined;
    },
    loader: async ({ params: termino, abortSignal }) => {
      await new Promise((resolver) => setTimeout(resolver, ESPERA_BUSQUEDA_MS));
      if (abortSignal.aborted) return [];
      return this.funcionService.buscarPeliculasPorNombre(termino);
    },
  });

  protected readonly panelVisible = computed(() =>
    this.resultadosAbiertos() && this.resultados.status() !== 'idle',
  );

  @HostListener('window:scroll')
  protected alHacerScroll(): void {
    this.conScroll.set(window.scrollY > UMBRAL_SCROLL_PX);
  }

  @HostListener('document:click', ['$event'])
  protected alHacerClickEnDocumento(evento: MouseEvent): void {
    if (!this.elemento.nativeElement.contains(evento.target as Node)) {
      this.resultadosAbiertos.set(false);
    }
  }

  protected abrirResultados(): void {
    this.resultadosAbiertos.set(true);
  }

  protected cerrarResultados(): void {
    this.resultadosAbiertos.set(false);
  }

  protected limpiarBusqueda(): void {
    this.busqueda.termino().value.set('');
    this.resultadosAbiertos.set(false);
  }
}
