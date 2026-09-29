import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { FooterBackoffice } from './footer-backoffice/footer-backoffice';
import { NavbarBackoffice } from './navbar-backoffice/navbar-backoffice';
import { SidebarBackoffice } from './sidebar-backoffice/sidebar-backoffice';

const CLASE_MODO_OSCURO = 'modo-oscuro';

@Component({
  selector: 'app-backoffice-layout',
  imports: [RouterOutlet, NavbarBackoffice, SidebarBackoffice, FooterBackoffice],
  templateUrl: './backoffice-layout.html',
})
export class BackofficeLayout implements OnInit, OnDestroy {
  ngOnInit(): void {
    // El backoffice usa tema claro de PrimeNG: se quita la clase que activa el modo oscuro del sitio público.
    document.documentElement.classList.remove(CLASE_MODO_OSCURO);
  }

  ngOnDestroy(): void {
    document.documentElement.classList.add(CLASE_MODO_OSCURO);
  }
}
