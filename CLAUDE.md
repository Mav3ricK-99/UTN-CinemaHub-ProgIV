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
- **Pasarela de pagos**: integración simple, no se requiere procesamiento
  complejo (TBD: proveedor específico o mock).

### Entidades

#### Pelicula
| Campo | Tipo | Notas |
|---|---|---|
| nombre | string | |
| sinopsis | string | |
| duracionMinutos | number | |
| imagenUrl | string | |
| formato | enum | `2D` \| `3D` \| `4D` \| `5D` |
| idioma | enum | `Castellano` \| `Subtitulada` |
| categorias | Categoria[] | relación muchos a muchos |

#### Categoria
| Campo | Tipo | Notas |
|---|---|---|
| nombre | string | nombre del género |

#### Sala
| Campo | Tipo | Notas |
|---|---|---|
| nombre | string | |
| butacas | Butaca[] | siempre 560 butacas, grid fijo de 20 filas x 28 columnas |

#### Butaca
| Campo | Tipo | Notas |
|---|---|---|
| id | string | identificador único: `Letra fila` + `número columna` (ej: `A28`). Filas `A`–`T` (20), columnas `1`–`28` |
| esEspecial | boolean | |

#### Funcion
| Campo | Tipo | Notas |
|---|---|---|
| pelicula | Pelicula | |
| sala | Sala | |
| fechaInicio | datetime | |
| fechaFin | datetime | |
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

Datos de registro acotados a los tres campos de arriba (+ auth de Supabase
para la contraseña/sesión).

#### Reserva

| Campo | Tipo | Notas |
|---|---|---|
| funcion | Funcion | |
| butaca | string | identificador de butaca (ej: `A28`) |
| usuario | Usuario \| null | `null` si la compra es anónima |
| emailContacto | string | requerido si `usuario` es `null`, para poder entregar el ticket |
| precio | number | precio final ya aplicado el descuento si corresponde |
| descuentoAplicado | number | 0 si no aplica |
| qrData | string | contenido/identificador único codificado en el QR |
| verificada | boolean | default `false`. `true` cuando un empleado escanea el QR en el ingreso |
| fechaCompra | datetime | |

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
1. **Descuento para Mayores**: Los usuarios registrados mayores de 50 años obtienen un descuento. El porcentaje/monto es **configurable por un administrador** desde el backoffice (no hardcodeado).

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
  - No usar Storage, Edge Functions ni Realtime salvo que se indique explícitamente.
- **PWA**: manifest.json + service worker (usar `@angular/service-worker` / `ng add @angular/pwa`).
- **Tailwind CSS** como única librería de estilos:
  - Usar clases utilitarias inline en los templates.
  - No escribir CSS/SCSS custom salvo casos puntuales que Tailwind no resuelva bien (animaciones complejas, etc.).
  - Es indistinto si los archivos de estilos de componente están en `.css` o `.scss`; no es un criterio relevante para este proyecto.
- **Prime NG** como única librería de componentes UI:
  - Usar en caso de que el prompt lo requiera.

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

## Convención de modelos con esquemas de base de datos
- Dentro de la carpeta `supabase/migrations` estan todos los .sql de las tablas ya ejecutados en Supabase