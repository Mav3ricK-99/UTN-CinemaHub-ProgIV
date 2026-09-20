-- Extensiones necesarias y tipos enumerados usados en todo el esquema.

create extension if not exists "pgcrypto";

create type formato_pelicula as enum ('2D', '3D', '4D', '5D');
create type idioma_pelicula as enum ('Castellano', 'Subtitulada');
create type rol_usuario as enum ('cliente', 'empleado', 'admin');
