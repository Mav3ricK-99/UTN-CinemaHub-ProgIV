-- Ejecutar en el SQL Editor de Supabase.
-- Requiere que public.usuario tenga las columnas: id (uuid, FK a auth.users.id), email, nombre, "fechaNacimiento", rol.
-- Ajustar los nombres de columna si difieren.

-- 1. Validación asíncrona del formulario de registro: indica si el correo existe en auth.users.
create or replace function public.email_registrado(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users where lower(email) = lower(trim(p_email)));
$$;

revoke all on function public.email_registrado(text) from public;
grant execute on function public.email_registrado(text) to anon, authenticated;
