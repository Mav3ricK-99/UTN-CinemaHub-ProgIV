-- Usuario extiende auth.users de Supabase con los datos propios del dominio.
-- Requiere que el cliente (Angular) envíe `nombre` y `fecha_nacimiento` en
-- options.data al llamar a supabase.auth.signUp(), ya que se completan
-- automáticamente vía trigger al crearse el usuario en auth.users.

create table usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nombre text not null,
  fecha_nacimiento date not null,
  rol rol_usuario not null default 'cliente',
  created_at timestamptz not null default now()
);

create or replace function crear_usuario_desde_auth()
returns trigger as $$
begin
  insert into usuario (id, email, nombre, fecha_nacimiento)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'nombre',
    (new.raw_user_meta_data->>'fecha_nacimiento')::date
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_crear_usuario_desde_auth
after insert on auth.users
for each row execute function crear_usuario_desde_auth();
