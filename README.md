# CinemaHub

Aplicación web para la gestión y venta de entradas de un cine.

## Objetivo

Permitir que los clientes consulten la cartelera, reserven butacas y compren candy desde la web, y que el personal del cine administre la programación y valide las entradas.

## Funcionalidades

- Cartelera y próximos estrenos, con reseñas de los usuarios.
- Funciones por sala y reserva de butacas con disponibilidad en tiempo real.
- Compra como usuario registrado o como invitado.
- Candy (artículos) y combos (entrada + artículos).
- Entrada con código QR y verificación en el cine.
- Cancelación de reservas hasta 2 horas antes, con saldo a favor.
- Programa de puntos: se ganan al comprar y se canjean por compras.
- Roles de cliente, empleado y administrador.
- Auditoría de los cambios sobre los datos principales.

## Arquitectura

| Capa | Tecnología |
|---|---|
| Front end | Angular (última versión) |
| Componentes de UI | PrimeNG |
| Base de datos, autenticación y storage | Supabase (PostgreSQL) |
| Despliegue | Vercel |

### Supabase

La lógica de negocio vive en la base de datos, de modo que se cumple sin importar desde dónde se acceda. La seguridad se basa en RLS y en permisos por columna.

**Funciones (RPC)**
- `cancelar_orden(p_orden_id)`: cancela una compra dentro del plazo, libera las butacas, repone el saldo o los puntos y deja la orden marcada como verificada.
- `crear_funciones_recurrentes(...)`: crea funciones periódicas asignando una sala libre en cada fecha.
- `auth_rol()`: devuelve el rol del usuario; se usa en las policies de RLS.

**Triggers**
- Validación de reserva: bloquea la función y rechaza butacas ya ocupadas, para evitar compras duplicadas.
- Sincronización de `funcion.butacas_reservadas` al reservar o cancelar; es lo que se transmite en tiempo real al elegir butacas.
- Puntos: al comprar se validan y descuentan los puntos canjeados, y se acreditan los ganados por el pago en dinero.
- Auditoría (`registrar_auditoria`): registra quién creó, modificó, eliminó o validó un registro.

**Otros**
- Vista `historial_puntos_usuario`: movimientos de puntos por usuario, calculados desde las órdenes.
- Storage: imágenes de las películas.
- Realtime: cambios en `funcion` para mostrar las butacas ocupadas mientras el usuario elige.

## Despliegue

El front end se despliega en Vercel, conectado al repositorio. La base de datos, la autenticación y el storage corren en un proyecto de Supabase, y las migraciones del esquema están en `supabase/migrations`.