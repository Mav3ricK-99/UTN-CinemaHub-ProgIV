import { Routes } from '@angular/router';

import { Landing } from './components/landing/landing';
import { SiteLayout } from './components/shared/site-layout/site-layout';
import {
  soloAdministradorGuard,
  soloAnonimoGuard,
  soloPersonalGuard,
  soloRegistradoGuard,
} from './guards/acceso.guard';

export const routes: Routes = [
  {
    path: '',
    component: SiteLayout,
    children: [
      { path: '', component: Landing },
      {
        path: 'reserva/:idFuncion',
        loadComponent: () =>
          import('./components/seleccion-butaca/seleccion-butaca').then((modulo) => modulo.SeleccionButaca),
      },
      {
        path: 'checkout/:idOrden',
        loadComponent: () => import('./components/checkout/checkout').then((modulo) => modulo.Checkout),
      },
      {
        path: 'mis-peliculas',
        canActivate: [soloRegistradoGuard],
        loadComponent: () =>
          import('./components/mis-peliculas/mis-peliculas').then((modulo) => modulo.MisPeliculas),
      },
      {
        path: 'validar-entrada',
        canActivate: [soloPersonalGuard],
        loadComponent: () =>
          import('./components/validar-entrada/validar-entrada').then((modulo) => modulo.ValidarEntrada),
      },
      {
        path: 'ingreso',
        canActivate: [soloAnonimoGuard],
        loadComponent: () => import('./components/ingreso/ingreso').then((modulo) => modulo.Ingreso),
      },
      {
        path: 'registro',
        canActivate: [soloAnonimoGuard],
        loadComponent: () => import('./components/registro/registro').then((modulo) => modulo.Registro),
      },
    ],
  },
  {
    path: 'backoffice',
    canActivate: [soloAdministradorGuard],
    loadComponent: () =>
      import('./components/backoffice/layout/backoffice-layout').then((modulo) => modulo.BackofficeLayout),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/backoffice/dashboard/dashboard').then((modulo) => modulo.Dashboard),
      },
      {
        path: 'peliculas',
        loadComponent: () =>
          import('./components/backoffice/peliculas/peliculas').then((modulo) => modulo.Peliculas),
      },
    ],
  },
];
