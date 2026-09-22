import { Routes } from '@angular/router';

import { Landing } from './components/landing/landing';
import { soloAnonimoGuard } from './guards/acceso.guard';

export const routes: Routes = [
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
    path: 'ingreso',
    canActivate: [soloAnonimoGuard],
    loadComponent: () => import('./components/ingreso/ingreso').then((modulo) => modulo.Ingreso),
  },
  {
    path: 'registro',
    canActivate: [soloAnonimoGuard],
    loadComponent: () => import('./components/registro/registro').then((modulo) => modulo.Registro),
  },
];
