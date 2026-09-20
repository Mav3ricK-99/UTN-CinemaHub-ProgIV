-- Reserva: compra/reserva de una butaca para una función, por un usuario
-- registrado o anónimo (requiere email de contacto en ese caso).

create table reserva (
  id uuid primary key default gen_random_uuid(),
  funcion_id uuid not null references funcion(id) on delete restrict,
  butaca_identificador varchar(3) not null,
  usuario_id uuid references usuario(id) on delete set null,
  email_contacto text,
  precio numeric(10,2) not null check (precio >= 0),
  descuento_aplicado numeric(10,2) not null default 0 check (descuento_aplicado >= 0),
  qr_data text not null unique,
  fecha_compra timestamptz not null default now(),
  verificada boolean not null default false,
  fecha_verificacion timestamptz,
  unique (funcion_id, butaca_identificador),
  check (usuario_id is not null or email_contacto is not null)
);

create index idx_reserva_funcion on reserva (funcion_id);
create index idx_reserva_usuario on reserva (usuario_id);

-- Valida que la butaca exista en la sala de la función, y mantiene
-- sincronizado el array `butacas_reservadas` de `funcion` (cache de
-- lectura rápida; la fuente de verdad sigue siendo esta tabla).
create or replace function validar_y_sincronizar_reserva()
returns trigger as $$
declare
  v_sala_id uuid;
begin
  select sala_id into v_sala_id from funcion where id = new.funcion_id;

  if not exists (
    select 1 from butaca
    where sala_id = v_sala_id and identificador = new.butaca_identificador
  ) then
    raise exception 'La butaca % no existe en la sala de esta función', new.butaca_identificador;
  end if;

  update funcion
  set butacas_reservadas = array_append(butacas_reservadas, new.butaca_identificador)
  where id = new.funcion_id;

  return new;
end;
$$ language plpgsql;

create trigger trg_validar_y_sincronizar_reserva
after insert on reserva
for each row execute function validar_y_sincronizar_reserva();

-- Si se cancela/borra una reserva, libera la butaca del cache de la función.
create or replace function liberar_butaca_al_borrar_reserva()
returns trigger as $$
begin
  update funcion
  set butacas_reservadas = array_remove(butacas_reservadas, old.butaca_identificador)
  where id = old.funcion_id;
  return old;
end;
$$ language plpgsql;

create trigger trg_liberar_butaca
after delete on reserva
for each row execute function liberar_butaca_al_borrar_reserva();
