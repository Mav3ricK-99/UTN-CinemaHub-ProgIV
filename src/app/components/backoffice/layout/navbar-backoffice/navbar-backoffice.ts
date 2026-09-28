import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Avatar } from 'primeng/avatar';
import { Menu } from 'primeng/menu';

import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-navbar-backoffice',
  imports: [Avatar, Menu],
  templateUrl: './navbar-backoffice.html',
})
export class NavbarBackoffice {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly usuario = this.authService.usuario;

  protected readonly itemsMenuUsuario: MenuItem[] = [
    { label: 'Volver al sitio', icon: 'pi pi-arrow-left', routerLink: '/' },
    { separator: true },
    { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: () => this.cerrarSesion() },
  ];

  /** Imagen aleatoria, estable por usuario: la semilla es su id. */
  protected readonly avatarUrl = computed(() => {
    const idUsuario = this.usuario()?.id ?? '';
    return `https://i.pravatar.cc/80?u=${encodeURIComponent(idUsuario)}`;
  });

  private async cerrarSesion(): Promise<void> {
    await this.authService.cerrarSesion();
    await this.router.navigate(['/']);
  }
}
