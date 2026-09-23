import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { RolUsuario } from '../classes/usuario';
import { AuthService } from '../services/auth.service';

const RUTA_INICIO = '/';

function crearGuardPorRol(rolesPermitidos: RolUsuario[]): CanActivateFn {
  return async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    await authService.inicializado;
    const usuario = authService.usuario();

    return usuario && rolesPermitidos.includes(usuario.rol) ? true : router.createUrlTree([RUTA_INICIO]);
  };
}

/** Permite el acceso solo a usuarios con sesión iniciada, sin importar el rol. */
export const soloRegistradoGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.inicializado;

  return authService.usuario() ? true : router.createUrlTree([RUTA_INICIO]);
};

/** Permite el acceso solo a usuarios sin sesión iniciada (registro, login). */
export const soloAnonimoGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.inicializado;

  return authService.usuario() ? router.createUrlTree([RUTA_INICIO]) : true;
};

/** Permite el acceso solo a usuarios con rol `empleado` o `admin`. */
export const soloPersonalGuard: CanActivateFn = crearGuardPorRol(['empleado', 'admin']);

/** Permite el acceso solo a usuarios con rol `admin`. */
export const soloAdministradorGuard: CanActivateFn = crearGuardPorRol(['admin']);
