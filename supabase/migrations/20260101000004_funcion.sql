-- Funcion: proyección de una película en una sala, en un horario dado.

create table funcion (
  id uuid primary key default gen_random_uuid(),
  pelicula_id uuid not null references pelicula(id) on delete restrict,
  sala_id uuid not null references sala(id) on delete restrict,
  fecha_inicio timestamptz not null,
  fecha_fin timestamptz not null,
  -- Cache de lectura rápida: identificadores de butacas ya reservadas
  -- para esta función. La fuente de verdad real es la tabla `reserva`;
  -- este array se mantiene sincronizado por trigger (ver 006_reserva.sql).
  butacas_reservadas text[] not null default '{}',
  created_at timestamptz not null default now(),
  check (fecha_fin > fecha_inicio)
);

create index idx_funcion_sala_fecha on funcion (sala_id, fecha_inicio);

-- Regla de negocio: no puede haber una función que comience antes de que
-- pasen 30 minutos desde que termina la función anterior en la misma sala.
create or replace function validar_gap_funcion()
returns trigger as $$
begin
  if exists (
    select 1 from funcion f
    where f.sala_id = new.sala_id
      and f.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and new.fecha_inicio < f.fecha_fin + interval '30 minutes'
      and f.fecha_inicio < new.fecha_fin + interval '30 minutes'
  ) then
    raise exception 'La función se superpone o no respeta los 30 minutos de intervalo con otra función de la misma sala';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validar_gap_funcion
before insert or update on funcion
for each row execute function validar_gap_funcion();
