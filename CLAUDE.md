# CLAUDE.md

## Proyecto

**Nombre**: CinemaHub
**Descripción**: Sistema de venta de entradas para cine — selección de
butaca, generación de ticket en PDF con QR, y backoffice de administración.
Trabajo práctico universitario, desarrollo por sprints.

## Dominio del proyecto

### Descripción general
Sistema de venta de entradas para un cine. El usuario (registrado o anónimo)
puede elegir una butaca libre para una función próxima, reservarla/comprarla
a través de una pasarela de pagos simple, y el sistema genera un PDF con los
datos de la compra y un código QR para presentar en el ingreso a la sala.

Incluye:
- **Landing pública**: listado de funciones próximas y funciones pasadas,
  con buscador. (TBD: criterios de búsqueda/filtrado exactos, diseño de la
  landing).
- **Backoffice**: panel de administración para ajustar configuraciones del
  sistema (ver "Reglas de negocio").
- **Checkout**: Al reservar la butaca se redireccionara al checkout donde mostrara el monto total facturado y el QR posibilitando descargar la factura.

### Entidades

#### Pelicula
| Campo | Tipo | Notas |
|---|---|---|
| id | string | |
| nombre | string | |
| sinopsis | string | |
| duracionMinutos | number | |
| imagenUrl | string | |
| formato | enum | `2D` \| `3D` \| `4D` \| `5D` |
| idioma | enum | `Castellano` \| `Subtitulada` |
| categorias | Categoria[] | relación muchos a muchos |
| clasificacion | Clasificacion \| null | referencia a la clasificación de edad de la película |
| promedioResenas | number | cache — sincronizado por trigger a partir de `Resena` |
| cantidadResenas | number | cache — cantidad total de reseñas, útil para mostrar "(124 reseñas)" en la UI |
| proximamente | (`boolean`, default `false`) — `true` si la película es
  un estreno próximo del cine (todavía no en cartelera). Flag manual que
  edita el admin; no se deriva de `funcion`.

#### Clasificacion
| Campo | Tipo | Notas |
|---|---|---|
| codigo | string | ej: `ATP`, `+13`, `+18` — único |
| descripcion | string | |

#### Categoria
| Campo | Tipo | Notas |
|---|---|---|
| nombre | string | nombre del género |

#### Sala
| Campo | Tipo | Notas |
|---|---|---|
| id | string | |
| nombre | string | |
| butacas | Butaca[] | 518 butacas: grid de 18 filas (A-I, L-T) x 28 columnas,
más 14 butacas accesibles en la fila J. La fila K se elimina — su espacio
físico se fusiona con J para dar lugar a butacas accesibles más anchas. |

#### Butaca
| Campo | Tipo | Notas |
|---|---|---|
| id | string | `Letra fila` + `número columna` (ej: `A28`, `J10`) |
| esEspecial | boolean | `true` solo para las filas `R`, `S` y `T` |
| esDiscapacitados | boolean | `true` solo para las 14 butacas de la fila `J` |

#### Funcion
| Campo | Tipo | Notas |
|---|---|---|
| id | string | |
| pelicula | Pelicula | |
| sala | Sala | |
| fechaInicio | datetime | |
| fechaFin | datetime | |
| precio | number | Precio de la funcion |
| puntos | number | puntos que una butaca en esa funcion |
| butacasReservadas | string[] | identificadores de butacas (ej: `A28`) ya reservadas para esta función |

**Regla de negocio crítica**: no puede crearse una función que comience antes
de que hayan pasado **30 minutos** desde el `fechaFin` de la función anterior
programada en la **misma sala**. Esta validación debe aplicarse tanto en el
formulario del backoffice (validación custom con Signal Forms) como a nivel
de base de datos (constraint o política en Supabase) para evitar condiciones
de carrera.

> Nota sobre `butacasReservadas`: es un dato derivado/denormalizado pensado
> para consultar rápido qué butacas están libres sin tener que hacer join
> contra `Reserva`. La fuente de verdad de una reserva sigue siendo la
> entidad `Reserva` (función + butaca + comprador); `butacasReservadas`
> debe mantenerse sincronizado con ella (trigger en Supabase o lógica en el
> servicio al confirmar/cancelar una reserva).

#### Usuario
| Campo | Tipo | Notas |
|---|---|---|
| email | string | |
| nombre | string | |
| fechaNacimiento | date | |
| rol | enum | `cliente` \| `empleado` \| `admin` |
| saldo | number | (`integer`, default `0`, `>= 0`) — saldo actual de dinero (cache).
| puntos | number | (`integer`, default `0`, `>= 0`) — saldo actual de puntos (cache).

Datos de registro acotados a los tres campos de arriba (+ auth de Supabase
para la contraseña/sesión).

#### Orden
| Campo | Tipo | Notas |
|---|---|---|
| id | string | |
| usuario | Usuario \| null | `null` si la compra es anónima |
| emailContacto | string | requerido si `usuario` es `null` |
| descuentoAplicado | number | 0 si no aplica |
| total | number | suma de la reserva (butacas) + artículos |
| qrData | string | único QR para toda la orden (entrada + candy) |
| verificada | boolean | |
| pagoConPuntos | boolean | si esta orden se pagó con puntos en vez de dinero.
| puntosUtilizados | number | cuántos puntos se cobraron en esta orden. |
| fechaVerificacion | datetime \| null | |
| fechaCreacion | datetime | |

#### Reserva
| Campo | Tipo | Notas |
|---|---|---|
| id | string | |
| orden | Orden | relación 1 a 1 — cada Orden tiene como máximo una Reserva |
| funcion | Funcion | |
| butacas | Butaca[] | identificadores de butacas incluidas (ej: `['A28', 'A29']`) |
| articulos | Articulo[] | |
| precioButacas | number | precio total de las butacas de esta reserva (sin contar artículos) |
| precioArticulos | number | precio total de las butacas de esta reserva (sin contar butacas) |

#### CategoriaArticulo
| Campo | Tipo | Notas |
|---|---|---|
| nombre | string | ej: "Bebidas", "Snacks", "Combos" |

#### Articulo
| Campo | Tipo | Notas |
|---|---|---|
| id | string | |
| nombre | string | |
| precio | number | |
| puntos | number | puntos que vale ese articulo de candy |
| categoria | CategoriaArticulo | relación muchos a uno *(distinta de la Categoria de Pelicula)* |
| disponible | boolean | TBD si en algún momento se suma stock/inventario real |

#### Resena
| Campo | Tipo | Notas |
|---|---|---|
| id | string | |
| pelicula | Pelicula | |
| usuario | Usuario | requerido — no hay reseña anónima |
| puntaje | number | entero, 1 a 5 |
| comentario | string | límite sugerido: 280 caracteres |
| fechaCreacion | datetime | |
| fechaEdicion | datetime \| null | se actualiza si el usuario edita su reseña |

### Reglas de negocio

1. **Descuento primera compra**: los usuarios registrados obtienen un
   descuento en su primera compra. El porcentaje/monto es **configurable por
   un administrador** desde el backoffice (no hardcodeado).
2. **Reserva sin registro**: tanto un usuario registrado como uno anónimo
   pueden reservar/comprar una butaca. El usuario anónimo no accede a
   beneficios de descuento (ver punto 1).
3. **Restricción de horarios de función**: ver regla en la entidad `Funcion`
   (gap mínimo de 30 minutos entre funciones de una misma sala).
4. **Butaca única por función**: una butaca no puede reservarse dos veces
   para la misma función (constraint de unicidad `funcion + butaca`).
5. **Descuento para Mayores**: Los usuarios registrados mayores de 50 años obtienen un descuento. El porcentaje/monto es **configurable por un administrador** desde el backoffice (no hardcodeado).
6. **Reseña solo con compra previa**: un usuario únicamente puede dejar
   reseña de una película si tiene registrada al menos una Orden con una
   Reserva asociada a una Función de esa película.
7. **El cine contará con 8 salas**: El cine dispondrá solamente de 8 salas fisicas.
8. **Sistema de Fidelizacion**: 1 peso pagado en dinero = 1 punto ganado (floor(total)), y solo para usuarios registrados (orden.usuario_id no nulo). Un comprador anónimo (email_contacto) nunca gana puntos. El usuario registrado podrá canjear puntos por el monto total que debe abonar solo si alcanzan los puntos que tiene.
9. **Historial de puntos**: no hay tabla de movimientos separada. Como todo movimiento pasa por orden, alcanza con la vista historial_puntos_usuario (usuario_id, orden_id, fecha_creacion, tipo 'ganancia'|'canje', puntos con signo: positivo si ganó, negativo si canjeó).
10. **Butacas especiales**: las butacas con `esEspecial` (filas `R`, `S` y `T`) cuestan un 15% más que el `precio` de la función. Las butacas con `esDiscapacitados` (fila `J`) no tienen recargo. `Reserva.precioButacas` guarda la suma con el recargo incluido.
11. **Cancelacion de reservas**: Se puede cancelar hasta 2 horas antes del comienzo de la función (exactamente 2 horas todavía vale). Pasado ese límite, o con la función ya empezada no se podrá cancelar. El monto se devuelve al usuario en saldo si pago con dinero o en puntos si abono con puntos del sistema.

### Pendientes de definición (TBD)
- Estructura interna de `Sala` (filas, columnas, numeración de butacas).
- Criterios y alcance del buscador en la landing.
- Proveedor/mecánica exacta de la pasarela de pagos.
- Diseño final de la landing (qué datos se muestran por función).

## Requisitos técnicos

### Stack principal
- **Angular 21** (última versión estable) — standalone components por defecto, zoneless change detection.
- **Supabase** como backend, limitado a:
  - Auth (autenticación de usuarios)
  - Base de datos (Postgres vía cliente JS de Supabase)
  - **Storage** (imágenes de películas, y potencialmente de artículos de
    candy si en algún momento se agregan)
- **PWA**: manifest.json + service worker (usar `@angular/service-worker` / `ng add @angular/pwa`).
- **Tailwind CSS** como única librería de estilos:
  - Usar clases utilitarias inline en los templates.
  - No escribir CSS/SCSS custom salvo casos puntuales que Tailwind no resuelva bien (animaciones complejas, etc.).
  - Es indistinto si los archivos de estilos de componente están en `.css` o `.scss`; no es un criterio relevante para este proyecto.
- **Prime NG** como única librería de componentes UI:
  - Usar en caso de que el prompt lo requiera.

### Convenciones de Storage
- Bucket `peliculas-imagenes`: público para lectura (se muestran en la
  landing sin necesidad de sesión), escritura restringida a rol `admin`.
- Nomenclatura de archivos: `{pelicula_id}.{extensión}` — evita colisiones
  de nombre y facilita saber a qué película pertenece cada imagen.
- El campo `imagenUrl` de `Pelicula` guarda la URL pública del archivo en
  el bucket, no la ruta interna.

### Arquitectura de componentes
- Todos los componentes deben ser **standalone**.
- Usar preferentemente, cuando la funcionalidad lo permita:
  - `input()` / `output()` (signal-based, en vez de decoradores `@Input()`/`@Output()` cuando sea posible).
  - **Servicios HTTP** (`HttpClient`) para toda comunicación con Supabase que no use el SDK directamente.
  - **Signal Forms** (`@angular/forms/signals`) para formularios y validaciones, incluyendo validadores custom.
    > ⚠️ Nota: Signal Forms es una API **experimental** en Angular 21. Si el comportamiento no coincide con lo esperado, verificar contra la documentación oficial de Angular antes de asumir un bug.
  - **Guards** (`CanActivateFn`, etc.) para proteger rutas según autenticación/rol.
  - **Pipes** custom donde aporte legibilidad (formateo, transformación de datos).
  - **Lazy-loading** de rutas para features que lo justifiquen (no es obligatorio en todas).

### Estructura de carpetas (dentro de `src/app/`)
```
app/
├── classes/       # Clases/modelos de las entidades del dominio
├── components/       # Componentes Angular (standalone), agrupados por feature/vista
│   ├── landing/
│   ├── pelicula-detalle/
│   ├── seleccion-butaca/
│   ├── checkout/
│   ├── backoffice/
│   │   ├── peliculas/
│   │   ├── funciones/
│   │   └── configuracion/
│   └── shared/       # Componentes reutilizables entre features (botones, cards genéricas, etc.)
├── directives/    # Directivas custom (si las hubiera)
├── guards/        # Guards
├── services/      # Servicios (mayormente HTTP, conexión a Supabase)
```

## Estilo de comunicación

Al responder en el chat, usar español técnico controlado, siguiendo estas normas estrictas:
- Transmitir solo una acción o idea por oración.
- Usar la estructura verbo imperativo + objetos directos.
- Mantener la misma palabra para el mismo concepto, sin sinónimos.
- Eliminar adjetivos innecesarios, adverbios y conectores de relleno.

## Convenciones de código

- Nombres de funciones y variables en camelCase.
- Nombres concisos y descriptivos (ej: `obtenerFuncionesActivas`, `butacaSeleccionada`).
  Evitar nombres abreviados que sacrifiquen legibilidad (ej: no usar `func`, `btc`, `usr`).

## Convención de agrupación de componentes
- Cada carpeta dentro de `components/` corresponde a una feature/vista
  concreta (ej: `seleccion-butaca`, no `botones` ni `paso-2`).
- Un componente que se usa en más de una feature va a `components/shared/`.
- Si una feature tiene subcomponentes propios (ej: `backoffice/peliculas/`
  con un formulario y una tabla), estos van anidados dentro de la carpeta
  de esa feature, no sueltos en la raíz de `components/`.
- Nomenclatura de carpetas: kebab-case, igual que el resto del proyecto.
