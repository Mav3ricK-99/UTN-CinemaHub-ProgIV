import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, FormRoot, required, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { contrasenaSegura } from '../registro/validadores-registro';

@Component({
  selector: 'app-ingreso',
  imports: [FormField, FormRoot, RouterLink],
  templateUrl: './ingreso.html',
})
export class Ingreso {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly modelo = signal({
    email: '',
    contrasena: '',
  });

  protected readonly errorGeneral = signal<string | null>(null);

  protected readonly formulario = form(
    this.modelo,
    (ruta) => {
      required(ruta.email, { message: 'Ingresá tu correo electrónico.' });
      email(ruta.email, { message: 'Ingresá un correo electrónico válido.' });

      required(ruta.contrasena, { message: 'Ingresá tu contraseña.' });
      validate(ruta.contrasena, contrasenaSegura());
    },
    {
      submission: {
        ignoreValidators: 'none',
        action: async () => {
          this.errorGeneral.set(null);
          const { email: correo, contrasena } = this.modelo();

          try {
            const estado = await this.authService.iniciarSesion({ email: correo.trim(), contrasena });

            if (estado === 'credencialesInvalidas') {
              this.errorGeneral.set('Correo o contraseña incorrectos.');
            } else if (estado === 'emailSinConfirmar') {
              this.errorGeneral.set('Confirmá tu correo electrónico antes de ingresar.');
            } else {
              await this.router.navigateByUrl('/');
            }
          } catch {
            this.errorGeneral.set('No se pudo iniciar sesión. Intentá nuevamente.');
          }
          return undefined;
        },
      },
    },
  );
}
