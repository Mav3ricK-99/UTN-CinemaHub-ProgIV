-- Entidades Pelicula y Categoria, con relación muchos a muchos.

create table pelicula (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  sinopsis text not null,
  duracion_minutos integer not null check (duracion_minutos > 0),
  imagen_url text,
  formato formato_pelicula not null,
  idioma idioma_pelicula not null,
  created_at timestamptz not null default now()
);

create table categoria (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table pelicula_categoria (
  pelicula_id uuid not null references pelicula(id) on delete cascade,
  categoria_id uuid not null references categoria(id) on delete cascade,
  primary key (pelicula_id, categoria_id)
);
