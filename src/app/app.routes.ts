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
        path: 'reservas',
        canActivate: [soloRegistradoGuard],
        loadComponent: () => import('./components/reservas/reservas').then((modulo) => modulo.Reservas),
      },
      {
        path: 'mis-peliculas',
        canActivate: [soloRegistradoGuard],
        loadComponent: () =>
          import('./components/mis-peliculas/mis-peliculas').then((modulo) => modulo.MisPeliculas),
      },
      {
        path: 'historial-puntos',
        canActivate: [soloRegistradoGuard],
        loadComponent: () =>
          import('./components/historial-puntos/historial-puntos').then((modulo) => modulo.HistorialPuntos),
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
      {
        path: 'peliculas/nueva',
        loadComponent: () =>
          import('./components/backoffice/peliculas/nueva-pelicula/nueva-pelicula').then(
            (modulo) => modulo.NuevaPelicula,
          ),
      },
      {
        path: 'peliculas/:idPelicula/editar',
        loadComponent: () =>
          import('./components/backoffice/peliculas/editar-pelicula/editar-pelicula').then(
            (modulo) => modulo.EditarPelicula,
          ),
      },
      {
        path: 'funciones',
        loadComponent: () =>
          import('./components/backoffice/funciones/funciones').then((modulo) => modulo.Funciones),
      },
      {
        path: 'articulos',
        loadComponent: () =>
          import('./components/backoffice/articulos/articulos').then((modulo) => modulo.Articulos),
      },
      {
        path: 'articulos/:idArticulo/editar',
        loadComponent: () =>
          import('./components/backoffice/articulos/editar-articulo/editar-articulo').then(
            (modulo) => modulo.EditarArticulo,
          ),
      },
      {
        path: 'articulos/nuevo',
        loadComponent: () =>
          import('./components/backoffice/articulos/nuevo-articulo/nuevo-articulo').then(
            (modulo) => modulo.NuevoArticulo,
          ),
      },
      {
        path: 'combos',
        loadComponent: () => import('./components/backoffice/combos/combos').then((modulo) => modulo.Combos),
      },
      {
        path: 'combos/nuevo',
        loadComponent: () =>
          import('./components/backoffice/combos/nuevo-combo/nuevo-combo').then((modulo) => modulo.NuevoCombo),
      },
      {
        path: 'facturaciones',
        loadComponent: () =>
          import('./components/backoffice/facturaciones/facturaciones').then((modulo) => modulo.Facturaciones),
      },
      {
        path: 'auditorias',
        loadComponent: () =>
          import('./components/backoffice/auditorias/auditorias').then((modulo) => modulo.Auditorias),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./components/backoffice/configuracion/configuracion').then((modulo) => modulo.Configuracion),
      },
      {
        path: 'funciones/:idFuncion/editar',
        loadComponent: () =>
          import('./components/backoffice/funciones/editar-funcion/editar-funcion').then(
            (modulo) => modulo.EditarFuncion,
          ),
      },
      {
        path: 'funciones/nueva',
        loadComponent: () =>
          import('./components/backoffice/funciones/nueva-funcion/nueva-funcion').then(
            (modulo) => modulo.NuevaFuncion,
          ),
      },
    ],
  },
];
