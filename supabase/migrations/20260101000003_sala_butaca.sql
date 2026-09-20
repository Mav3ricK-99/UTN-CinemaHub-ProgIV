-- Sala y Butaca. Cada sala tiene siempre 560 butacas (grid 20 filas x 28
-- columnas). Las butacas se generan automáticamente al crear la sala,
-- no hace falta insertarlas a mano.

create table sala (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table butaca (
  sala_id uuid not null references sala(id) on delete cascade,
  identificador varchar(3) not null, -- ej: 'A28' (fila A-T, columna 1-28)
  es_especial boolean not null default false,
  primary key (sala_id, identificador)
);

create or replace function generar_butacas_sala()
returns trigger as $$
declare
  fila char(1);
  columna int;
begin
  for fila in select chr(ascii('A') + n) from generate_series(0, 19) as n loop
    for columna in 1..28 loop
      insert into butaca (sala_id, identificador, es_especial)
      values (new.id, fila || columna::text, false);
    end loop;
  end loop;
  return new;
end;
$$ language plpgsql;

create trigger trg_generar_butacas
after insert on sala
for each row execute function generar_butacas_sala();
