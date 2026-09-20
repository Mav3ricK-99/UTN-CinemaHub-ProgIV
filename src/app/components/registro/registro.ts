import { Component, inject, resource, signal } from '@angular/core';
import {
  debounce,
  email,
  form,
  FormField,
  FormRoot,
  maxLength,
  pattern,
  required,
  validate,
  validateAsync,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { SelectorFecha } from '../shared/selector-fecha/selector-fecha';
import {
  contrasenasCoinciden,
  contrasenaSegura,
  mayorDeEdad,
  nombreConLetrasMinimas,
} from './validadores-registro';

const LARGO_MAXIMO_NOMBRE = 255;
const ESPERA_EMAIL_MS = 500;
const EDAD_INICIAL_CALENDARIO = 18;
const MENSAJE_EMAIL_REGISTRADO = 'Este correo ya está registrado.';

@Component({
  selector: 'app-registro',
  imports: [FormField, FormRoot, RouterLink, SelectorFecha],
  templateUrl: './registro.html',
})
export class Registro {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly modelo = signal({
    email: '',
    nombre: '',
    contrasena: '',
    repetirContrasena: '',
    fechaNacimiento: null as Date | null,
  });

  protected readonly hoy = new Date();
  protected readonly fechaInicialCalendario = new Date(
    this.hoy.getFullYear() - EDAD_INICIAL_CALENDARIO,
    this.hoy.getMonth(),
    this.hoy.getDate(),
  );

  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly confirmacionPendiente = signal(false);

  protected readonly formulario = form(
    this.modelo,
    (ruta) => {
      required(ruta.email, { message: 'Ingresá tu correo electrónico.' });
      email(ruta.email, { message: 'Ingresá un correo electrónico válido.' });
      debounce(ruta.email, ESPERA_EMAIL_MS);
      validateAsync(ruta.email, {
        params: ({ value }) => value().trim(),
        factory: (params) =>
          resource({
            params,
            loader: ({ params: correo }) => this.authService.emailRegistrado(correo),
          }),
        onSuccess: (registrado) => (registrado ? { kind: 'emailRegistrado', message: MENSAJE_EMAIL_REGISTRADO } : undefined),
        // Si la consulta falla, el registro vuelve a detectar el correo duplicado al enviar el formulario.
        onError: () => undefined,
      });

      required(ruta.nombre, { message: 'Ingresá tu nombre y apellido.' });
      validate(ruta.nombre, nombreConLetrasMinimas());
      maxLength(ruta.nombre, LARGO_MAXIMO_NOMBRE, {
        message: `El nombre no puede superar los ${LARGO_MAXIMO_NOMBRE} caracteres.`,
      });

      required(ruta.contrasena, { message: 'Ingresá una contraseña.' });
      validate(ruta.contrasena, contrasenaSegura());

      required(ruta.repetirContrasena, { message: 'Repetí la contraseña.' });
      validate(ruta.repetirContrasena, contrasenasCoinciden(ruta.contrasena));

      required(ruta.fechaNacimiento, { message: 'Ingresá tu fecha de nacimiento.' });
      validate(ruta.fechaNacimiento, mayorDeEdad());
    },
    {
      submission: {
        ignoreValidators: 'none',
        action: async (campos) => {
          this.errorGeneral.set(null);
          const { email: correo, nombre, contrasena, fechaNacimiento } = this.modelo();
          if (!fechaNacimiento) return undefined;

          try {
            const estado = await this.authService.registrar({
              email: correo.trim(),
              nombre: nombre.trim(),
              contrasena,
              fechaNacimiento,
            });

            if (estado === 'emailRegistrado') {
              return { fieldTree: campos.email, kind: 'emailRegistrado', message: MENSAJE_EMAIL_REGISTRADO };
            }
            if (estado === 'confirmacionPendiente') {
              this.confirmacionPendiente.set(true);
            } else {
              await this.router.navigateByUrl('/');
            }
          } catch {
            this.errorGeneral.set('No se pudo completar el registro. Intentá nuevamente.');
          }
          return undefined;
        },
      },
    },
  );
}
