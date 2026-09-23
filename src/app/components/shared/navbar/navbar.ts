import { Component, computed, ElementRef, HostListener, inject, resource, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Avatar } from 'primeng/avatar';
import { Menu } from 'primeng/menu';

import { AuthService } from '../../../services/auth.service';
import { FuncionService } from '../../../services/funcion.service';

const LARGO_MINIMO_BUSQUEDA = 2;
const ESPERA_BUSQUEDA_MS = 250;
const UMBRAL_SCROLL_PX = 10;

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, FormField, Avatar, Menu],
  templateUrl: './navbar.html',
})
export class Navbar {
  private readonly funcionService = inject(FuncionService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly usuario = this.authService.usuario;

  protected readonly itemsMenuUsuario: MenuItem[] = [
    { label: 'Mis películas', icon: 'pi pi-video', routerLink: '/mis-peliculas' },
    { separator: true },
    { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: () => this.cerrarSesion() },
  ];

  /** Imagen aleatoria, estable por usuario: la semilla es su id. */
  protected readonly avatarUrl = computed(() => {
    const idUsuario = this.usuario()?.id ?? '';
    return `https://i.pravatar.cc/80?u=${encodeURIComponent(idUsuario)}`;
  });

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

  private async cerrarSesion(): Promise<void> {
    await this.authService.cerrarSesion();
    await this.router.navigate(['/']);
  }
}
