import { CurrencyPipe, DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { email, form, FormField, FormRoot, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { Articulo } from '../../classes/articulo';
import { obtenerEdadMinima } from '../../classes/clasificacion';
import { ComboDetalle, repartirPrecioCombo } from '../../classes/combo';
import { ArticuloService } from '../../services/articulo.service';
import { AuthService } from '../../services/auth.service';
import { ComboService } from '../../services/combo.service';
import { FuncionService } from '../../services/funcion.service';
import { calcularPreciosOrden, calcularPuntosOrden, OrdenService } from '../../services/orden.service';
import { calcularEdad } from '../registro/validadores-registro';
import { EstrellasCalificacion } from '../shared/estrellas-calificacion/estrellas-calificacion';
import { CarrouselArticulos } from './carrousel-articulos/carrousel-articulos';
import { CarrouselCombos } from './carrousel-combos/carrousel-combos';
import { MapaButacas, MAXIMO_BUTACAS_SELECCIONADAS } from './mapa-butacas/mapa-butacas';
import { ResenasPelicula } from './resenas-pelicula/resenas-pelicula';
import { requeridoSiAnonimo, requeridoSiRequiereAcompanante } from './validadores-seleccion-butaca';

const MILISEGUNDOS_POR_MINUTO = 60 * 1000;
const MINUTOS_POR_HORA = 60;
const MINUTOS_POR_DIA = 24 * MINUTOS_POR_HORA;
const INTERVALO_CRONOMETRO_MS = 1000;

function pluralizar(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

@Component({
  selector: 'app-seleccion-butaca',
  imports: [
    RouterLink,
    MapaButacas,
    FormField,
    FormRoot,
    CarrouselArticulos,
    CarrouselCombos,
    EstrellasCalificacion,
    DecimalPipe,
    CurrencyPipe,
    ResenasPelicula,
  ],
  templateUrl: './seleccion-butaca.html',
})
export class SeleccionButaca {
  private readonly funcionService = inject(FuncionService);
  private readonly ordenService = inject(OrdenService);
  private readonly articuloService = inject(ArticuloService);
  private readonly comboService = inject(ComboService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /** Id de la función, tomado del parámetro `:idFuncion` de la ruta. */
  readonly idFuncion = input.required<string>();

  protected readonly funcion = resource({
    params: () => this.idFuncion(),
    loader: ({ params: idFuncion }) => this.funcionService.obtenerDetalleFuncion(idFuncion),
  });

  protected readonly articulosCandy = resource({
    loader: () => this.articuloService.obtenerArticulosDisponibles(),
  });

  protected readonly combosDisponibles = resource({
    loader: () => this.comboService.obtenerCombosDisponibles(),
  });

  /** Porcentaje de descuento de primera compra del usuario. 0 si es anónimo o no le corresponde. */
  protected readonly porcentajeDescuento = resource({
    params: () => this.authService.usuario(),
    loader: ({ params: usuario }) => this.ordenService.obtenerPorcentajeDescuentoPrimeraCompra(usuario),
  });

  /** Butacas ocupadas de la función. Parte de la carga inicial y se actualiza en tiempo real. */
  protected readonly butacasReservadas = linkedSignal(() => this.funcion.value()?.butacasReservadas ?? []);

  protected readonly butacasSeleccionadas = signal<string[]>([]);
  protected readonly articulosSeleccionados = signal<Articulo[]>([]);
  protected readonly comboSeleccionado = signal<ComboDetalle | null>(null);

  /** Con un combo, la cantidad de butacas queda fijada por `cantidadEntradas`. */
  protected readonly maximoButacas = computed(
    () => this.comboSeleccionado()?.cantidadEntradas ?? MAXIMO_BUTACAS_SELECCIONADAS,
  );
  protected readonly usuario = this.authService.usuario;
  protected readonly errorReserva = signal<string | null>(null);

  private readonly ahora = signal(Date.now());

  /** Tiempo restante hasta el inicio, en días, horas y minutos. Se detiene en 0 minutos. */
  protected readonly tiempoRestante = computed(() => {
    const funcion = this.funcion.value();
    if (!funcion) return '';

    const minutosRestantes = Math.max(
      0,
      Math.floor((funcion.fechaInicio.getTime() - this.ahora()) / MILISEGUNDOS_POR_MINUTO),
    );
    const dias = Math.floor(minutosRestantes / MINUTOS_POR_DIA);
    const horas = Math.floor((minutosRestantes % MINUTOS_POR_DIA) / MINUTOS_POR_HORA);
    const minutos = minutosRestantes % MINUTOS_POR_HORA;

    const partes: string[] = [];
    if (dias > 0) partes.push(pluralizar(dias, 'día', 'días'));
    if (dias > 0 || horas > 0) partes.push(pluralizar(horas, 'hora', 'horas'));
    partes.push(pluralizar(minutos, 'minuto', 'minutos'));
    return partes.join(' ');
  });

  /** `true` si el comprador no alcanza la edad mínima de la clasificación. Un comprador anónimo no acredita edad. */
  protected readonly requiereAcompanante = computed(() => {
    const edadMinima = obtenerEdadMinima(this.funcion.value()?.pelicula.clasificacion ?? null);
    if (edadMinima === 0) return false;

    const usuario = this.usuario();
    return !usuario || calcularEdad(usuario.fechaNacimiento) < edadMinima;
  });

  /** Puntos que cuestan las butacas y los artículos seleccionados. */
  protected readonly puntosTotales = computed(() => {
    const funcion = this.funcion.value();
    if (!funcion) return 0;
    const combo = this.comboSeleccionado();
    const articulos = combo
      ? combo.articulos.flatMap(({ articulo, cantidad }) => Array<Articulo>(cantidad).fill(articulo))
      : this.articulosSeleccionados();
    return calcularPuntosOrden(funcion, this.butacasSeleccionadas().length, articulos);
  });

  /** `true` si el usuario registrado tiene puntos para cubrir la totalidad de la reserva. */
  protected readonly puedePagarConPuntos = computed(() => {
    const usuario = this.usuario();
    return usuario !== null && this.butacasSeleccionadas().length > 0 && usuario.puntos >= this.puntosTotales();
  });

  /** Precios en dinero de las butacas y los artículos seleccionados, con el descuento de primera compra. */
  private readonly preciosDinero = computed(() => {
    const funcion = this.funcion.value();
    if (!funcion) return null;

    const combo = this.comboSeleccionado();
    if (combo) return { ...repartirPrecioCombo(combo), total: combo.precio, descuentoAplicado: 0 };

    return calcularPreciosOrden(
      funcion,
      this.butacasSeleccionadas(),
      this.articulosSeleccionados(),
      this.porcentajeDescuento.value() ?? 0,
    );
  });

  /** Total en dinero de las butacas y los artículos seleccionados, con el descuento de primera compra. */
  protected readonly totalDinero = computed(() => this.preciosDinero()?.total ?? 0);

  /** Monto que se descuenta del total en dinero. 0 si no corresponde descuento. */
  protected readonly descuentoDinero = computed(() => this.preciosDinero()?.descuentoAplicado ?? 0);

  /** `true` si el usuario registrado tiene saldo para cubrir la totalidad de la reserva. */
  protected readonly puedePagarConSaldo = computed(() => {
    const usuario = this.usuario();
    return usuario !== null && this.butacasSeleccionadas().length > 0 && usuario.saldo >= this.totalDinero();
  });

  protected readonly modelo = signal({ emailContacto: '', acompanado: false, pagoConPuntos: false, pagoConSaldo: false });

  /** `true` si la opción de puntos está tildada y el usuario puede cubrirla. */
  protected readonly pagaConPuntos = computed(() => this.puedePagarConPuntos() && this.modelo().pagoConPuntos);

  /** `true` si la opción de saldo está tildada y el usuario puede cubrirla. */
  protected readonly pagaConSaldo = computed(() => this.puedePagarConSaldo() && this.modelo().pagoConSaldo);

  protected readonly formulario = form(
    this.modelo,
    (ruta) => {
      email(ruta.emailContacto, { message: 'Ingresá un correo electrónico válido.' });
      validate(ruta.emailContacto, requeridoSiAnonimo(this.usuario));
      validate(ruta.acompanado, requeridoSiRequiereAcompanante(this.requiereAcompanante));
    },
    {
      submission: {
        ignoreValidators: 'none',
        action: async () => {
          this.errorReserva.set(null);
          const funcionActual = this.funcion.value();
          if (!funcionActual || this.butacasSeleccionadas().length === 0) return undefined;

          try {
            const { orden } = await this.ordenService.crearOrden({
              funcion: funcionActual,
              butacas: this.butacasSeleccionadas(),
              articulos: this.comboSeleccionado() ? [] : this.articulosSeleccionados(),
              combo: this.comboSeleccionado(),
              usuario: this.usuario(),
              emailContacto: this.usuario() ? null : this.modelo().emailContacto.trim(),
              pagoConPuntos: this.pagaConPuntos(),
              pagoConSaldo: this.pagaConSaldo(),
            });
            await this.authService.actualizarUsuario();
            await this.router.navigate(['/checkout', orden.id]);
          } catch {
            this.errorReserva.set('No se pudo completar la reserva. Intentá nuevamente.');
          }
          return undefined;
        },
      },
    },
  );

  /** Exige butacas elegidas, la confirmación de acompañante (si corresponde) y ninguna reserva en curso. */
  protected readonly reservaHabilitada = computed(
    () =>
      this.butacasSeleccionadas().length > 0 &&
      (!this.comboSeleccionado() || this.butacasSeleccionadas().length === this.maximoButacas()) &&
      (!this.requiereAcompanante() || this.modelo().acompanado) &&
      !this.formulario().submitting(),
  );

  /** Al elegir un combo (o quitarlo) se limpian las butacas y los artículos ya seleccionados. */
  protected alSeleccionarCombo(combo: ComboDetalle | null): void {
    this.comboSeleccionado.set(combo);
    this.butacasSeleccionadas.set([]);
    this.articulosSeleccionados.set([]);
  }

  constructor() {
    effect((alLimpiar) => {
      const cancelarSuscripcion = this.funcionService.suscribirseAButacasReservadas(this.idFuncion(), (reservadas) =>
        this.butacasReservadas.set(reservadas),
      );
      alLimpiar(cancelarSuscripcion);
    });

    // Si otro usuario ocupa una butaca que está seleccionada, se quita de la selección.
    effect(() => {
      const reservadas = new Set(this.butacasReservadas());
      const seleccionadas = untracked(this.butacasSeleccionadas);
      if (seleccionadas.some((idButaca) => reservadas.has(idButaca))) {
        this.butacasSeleccionadas.set(seleccionadas.filter((idButaca) => !reservadas.has(idButaca)));
      }
    });

    const temporizador = setInterval(() => this.ahora.set(Date.now()), INTERVALO_CRONOMETRO_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(temporizador));
  }
}
