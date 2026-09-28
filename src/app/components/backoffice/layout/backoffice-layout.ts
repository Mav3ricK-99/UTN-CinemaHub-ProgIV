import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { FooterBackoffice } from './footer-backoffice/footer-backoffice';
import { NavbarBackoffice } from './navbar-backoffice/navbar-backoffice';
import { SidebarBackoffice } from './sidebar-backoffice/sidebar-backoffice';

@Component({
  selector: 'app-backoffice-layout',
  imports: [RouterOutlet, NavbarBackoffice, SidebarBackoffice, FooterBackoffice],
  templateUrl: './backoffice-layout.html',
})
export class BackofficeLayout {}
