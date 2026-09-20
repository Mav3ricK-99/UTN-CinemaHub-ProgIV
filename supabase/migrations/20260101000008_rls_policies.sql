-- Row Level Security. Roles: cliente (default), empleado, admin.

create or replace function auth_rol()
returns rol_usuario as $$
  select rol from usuario where id = auth.uid();
$$ language sql stable security definer;

-- Catálogo: lectura pública, escritura solo admin.
alter table pelicula enable row level security;
create policy "pelicula_lectura_publica" on pelicula for select using (true);
create policy "pelicula_escritura_admin" on pelicula for all
  using (auth_rol() = 'admin') with check (auth_rol() = 'admin');

alter table categoria enable row level security;
create policy "categoria_lectura_publica" on categoria for select using (true);
create policy "categoria_escritura_admin" on categoria for all
  using (auth_rol() = 'admin') with check (auth_rol() = 'admin');

alter table pelicula_categoria enable row level security;
create policy "pelicula_categoria_lectura_publica" on pelicula_categoria for select using (true);
create policy "pelicula_categoria_escritura_admin" on pelicula_categoria for all
  using (auth_rol() = 'admin') with check (auth_rol() = 'admin');

alter table sala enable row level security;
create policy "sala_lectura_publica" on sala for select using (true);
create policy "sala_escritura_admin" on sala for all
  using (auth_rol() = 'admin') with check (auth_rol() = 'admin');

alter table butaca enable row level security;
create policy "butaca_lectura_publica" on butaca for select using (true);
create policy "butaca_escritura_admin" on butaca for all
  using (auth_rol() = 'admin') with check (auth_rol() = 'admin');

alter table funcion enable row level security;
create policy "funcion_lectura_publica" on funcion for select using (true);
create policy "funcion_escritura_admin" on funcion for all
  using (auth_rol() = 'admin') with check (auth_rol() = 'admin');

-- Usuario: cada uno ve/edita su propia fila; empleado/admin ven todas.
alter table usuario enable row level security;
create policy "usuario_lectura_propia" on usuario for select
  using (auth.uid() = id or auth_rol() in ('empleado', 'admin'));
create policy "usuario_actualizacion_propia" on usuario for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "usuario_gestion_admin" on usuario for all
  using (auth_rol() = 'admin') with check (auth_rol() = 'admin');

-- Reserva: cualquiera (anónimo o autenticado) puede crear una, sin poder
-- adjudicársela a otro usuario. Cada uno ve las propias; empleado/admin
-- ven todas (necesario para verificar QR en el ingreso) y son los únicos
-- que pueden marcarla como verificada.
alter table reserva enable row level security;
create policy "reserva_insercion_publica" on reserva for insert
  with check (usuario_id is null or usuario_id = auth.uid());
create policy "reserva_lectura_propia_o_staff" on reserva for select
  using (usuario_id = auth.uid() or auth_rol() in ('empleado', 'admin'));
create policy "reserva_actualizacion_staff" on reserva for update
  using (auth_rol() in ('empleado', 'admin'))
  with check (auth_rol() in ('empleado', 'admin'));

-- Configuración: lectura pública, escritura solo admin.
alter table configuracion enable row level security;
create policy "configuracion_lectura_publica" on configuracion for select using (true);
create policy "configuracion_escritura_admin" on configuracion for update
  using (auth_rol() = 'admin') with check (auth_rol() = 'admin');
