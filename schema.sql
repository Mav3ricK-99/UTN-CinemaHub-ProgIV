--
-- PostgreSQL database dump
--

\restrict yStcqAj2ZbodcinvpUDfdsQvkYrDxbasdLRsTsYnbVSSsTGGAyM9FxgpZ45VYiu

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: accion_auditoria; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.accion_auditoria AS ENUM (
    'Validacion',
    'Creacion',
    'Modificacion',
    'Eliminacion'
);


--
-- Name: formato_pelicula; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.formato_pelicula AS ENUM (
    '2D',
    '3D',
    '4D',
    '5D'
);


--
-- Name: idioma_pelicula; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.idioma_pelicula AS ENUM (
    'Castellano',
    'Subtitulada'
);


--
-- Name: rol_usuario; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rol_usuario AS ENUM (
    'cliente',
    'empleado',
    'admin'
);


--
-- Name: acreditar_puntos_por_compra(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.acreditar_puntos_por_compra() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not new.pago_con_puntos and new.usuario_id is not null then
    update usuario
    set puntos = puntos + floor(new.total)::integer
    where id = new.usuario_id;
  end if;

  return null;
end;
$$;


--
-- Name: actualizar_precio_articulos_reserva(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.actualizar_precio_articulos_reserva() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_reserva_id uuid;
begin
  v_reserva_id := coalesce(new.reserva_id, old.reserva_id);

  update reserva
  set precio_articulos = coalesce(
    (select sum(cantidad * precio_unitario) from reserva_articulo where reserva_id = v_reserva_id), 0)
  where id = v_reserva_id;

  return null;
end;
$$;


--
-- Name: actualizar_promedio_pelicula(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.actualizar_promedio_pelicula() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_pelicula_id uuid;
begin
  if tg_op = 'DELETE' then
    v_pelicula_id := old.pelicula_id;
  else
    v_pelicula_id := new.pelicula_id;
  end if;
 
  update pelicula
  set promedio_resenas = coalesce(
        (select round(avg(puntaje), 2) from resena where pelicula_id = v_pelicula_id), 0),
      cantidad_resenas = (select count(*) from resena where pelicula_id = v_pelicula_id)
  where id = v_pelicula_id;
 
  return null;
end;
$$;


--
-- Name: agregar_butacas_a_funcion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.agregar_butacas_a_funcion() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update funcion
  set butacas_reservadas = butacas_reservadas || new.butacas
  where id = new.funcion_id;
  return new;
end;
$$;


--
-- Name: auth_rol(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auth_rol() RETURNS public.rol_usuario
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select rol from usuario where id = auth.uid();
$$;


--
-- Name: bloquear_edicion_reserva(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bloquear_edicion_reserva() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if new.funcion_id <> old.funcion_id or new.butacas <> old.butacas then
    raise exception 'No se puede cambiar la función ni las butacas de una reserva';
  end if;
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: orden; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orden (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    email_contacto text,
    descuento_aplicado numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) NOT NULL,
    qr_data text DEFAULT (gen_random_uuid())::text NOT NULL,
    verificada boolean DEFAULT false NOT NULL,
    fecha_verificacion timestamp with time zone,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    pago_con_puntos boolean DEFAULT false NOT NULL,
    puntos_utilizados integer,
    combo_id uuid,
    CONSTRAINT orden_check CHECK (((usuario_id IS NOT NULL) OR (email_contacto IS NOT NULL))),
    CONSTRAINT orden_descuento_aplicado_check CHECK ((descuento_aplicado >= (0)::numeric)),
    CONSTRAINT orden_puntos_consistentes CHECK ((((pago_con_puntos = false) AND (puntos_utilizados IS NULL)) OR ((pago_con_puntos = true) AND (puntos_utilizados > 0) AND (usuario_id IS NOT NULL)))),
    CONSTRAINT orden_total_check CHECK ((total >= (0)::numeric))
);


--
-- Name: cancelar_orden(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancelar_orden(p_orden_id uuid) RETURNS public.orden
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_orden orden;
  v_es_staff boolean;
  v_inicio timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión para cancelar una orden'
      using errcode = '42501';
  end if;

  v_es_staff := coalesce(auth_rol() in ('empleado', 'admin'), false);

  -- for update: serializa con otra cancelación o con una verificación
  -- del staff sobre la misma orden.
  select * into v_orden from orden where id = p_orden_id for update;

  -- Mismo mensaje si no existe o si no es suya: no se revela cuáles
  -- órdenes existen.
  if not found
     or not (v_es_staff or coalesce(v_orden.usuario_id = auth.uid(), false)) then
    raise exception 'La orden no existe o no tenés permiso para cancelarla'
      using errcode = '42501';
  end if;

  if v_orden.verificada then
    raise exception 'La orden ya fue verificada o cancelada y no puede cancelarse';
  end if;

  select f.fecha_inicio into v_inicio
  from reserva r
  join funcion f on f.id = r.funcion_id
  where r.orden_id = v_orden.id;

  -- Hasta exactamente 2 horas antes se puede cancelar.
  if v_inicio is not null and v_inicio < now() + interval '2 hours' then
    raise exception 'Solo se puede cancelar una reserva hasta 2 horas antes del comienzo de la función';
  end if;

  if v_orden.usuario_id is not null then
    if v_orden.pago_con_puntos then
      update usuario
      set puntos = puntos + v_orden.puntos_utilizados
      where id = v_orden.usuario_id;
    else
      update usuario
      set saldo = saldo + v_orden.total,
          puntos = greatest(puntos - floor(v_orden.total)::integer, 0)
      where id = v_orden.usuario_id;
    end if;
  end if;

  delete from reserva where orden_id = v_orden.id;

  update orden
  set verificada = true, fecha_verificacion = now()
  where id = v_orden.id
  returning * into v_orden;

  return v_orden;
end;
$$;


--
-- Name: crear_funciones_recurrentes(uuid, integer[], time without time zone, date, date, numeric, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crear_funciones_recurrentes(p_pelicula_id uuid, p_dias_semana integer[], p_hora time without time zone, p_fecha_desde date, p_fecha_hasta date, p_precio numeric, p_puntos integer DEFAULT 0) RETURNS TABLE(funcion_id uuid, sala_id uuid, sala_nombre text, fecha_inicio timestamp with time zone, fecha_fin timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
declare
  v_duracion int;
  v_fechas date[];
  v_sala record;
  v_ocurrencias timestamptz[];
  v_fin timestamptz[];
  v_conflicto boolean;
  v_dia date;
  v_i int;
  v_nueva_id uuid;
  v_nueva_inicio timestamptz;
  v_nueva_fin timestamptz;
begin
  if auth_rol() is distinct from 'admin' then
    raise exception 'Solo un administrador puede crear funciones';
  end if;

  if p_fecha_hasta < p_fecha_desde then
    raise exception 'fecha_hasta no puede ser anterior a fecha_desde';
  end if;

  select duracion_minutos into v_duracion from pelicula where id = p_pelicula_id;
  if v_duracion is null then
    raise exception 'La película % no existe', p_pelicula_id;
  end if;

  -- Genera las fechas concretas de la recurrencia dentro del rango.
  v_fechas := array(
    select d::date
    from generate_series(p_fecha_desde, p_fecha_hasta, interval '1 day') as d
    where extract(isodow from d)::int = any(p_dias_semana)
  );

  if array_length(v_fechas, 1) is null then
    raise exception 'El rango de fechas no contiene ninguno de los días solicitados';
  end if;

  if p_precio < 0 then
    raise exception 'El precio no puede ser negativo';
  end if;

  if p_puntos < 0 then
    raise exception 'Los puntos no pueden ser negativos';
  end if;

  -- Armamos los pares (inicio, fin) de cada ocurrencia.
  v_ocurrencias := array(select (d + p_hora)::timestamptz from unnest(v_fechas) as d);
  v_fin := array(select x + (v_duracion || ' minutes')::interval from unnest(v_ocurrencias) as x);

  -- Recorremos las salas en orden fijo (por nombre) buscando una que
  -- esté libre en TODAS las ocurrencias.
  for v_sala in select s.id, s.nombre from sala s order by s.nombre loop
    v_conflicto := false;

    for v_i in 1 .. array_length(v_ocurrencias, 1) loop
      if exists (
        select 1 from funcion f
        where f.sala_id = v_sala.id
          and v_ocurrencias[v_i] < f.fecha_fin + interval '30 minutes'
          and f.fecha_inicio < v_fin[v_i] + interval '30 minutes'
      ) then
        v_conflicto := true;
        exit;
      end if;
    end loop;

    if not v_conflicto then
      -- Esta sala sirve para todas las fechas: insertamos toda la tanda.
      for v_i in 1 .. array_length(v_ocurrencias, 1) loop
        insert into funcion (pelicula_id, sala_id, fecha_inicio, fecha_fin, precio, puntos)
        values (p_pelicula_id, v_sala.id, v_ocurrencias[v_i], v_fin[v_i], p_precio, p_puntos)
        returning funcion.id, funcion.fecha_inicio, funcion.fecha_fin
        into v_nueva_id, v_nueva_inicio, v_nueva_fin;

        funcion_id := v_nueva_id;
        sala_id := v_sala.id;
        sala_nombre := v_sala.nombre;
        fecha_inicio := v_nueva_inicio;
        fecha_fin := v_nueva_fin;
        return next;
      end loop;
      return;
    end if;
  end loop;

  raise exception 'No hay ninguna sala libre en todas las fechas solicitadas (% ocurrencias entre % y %)',
    array_length(v_ocurrencias, 1), p_fecha_desde, p_fecha_hasta;
end;
$$;


--
-- Name: crear_usuario_desde_auth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crear_usuario_desde_auth() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.usuario (id, email, nombre, fecha_nacimiento)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'nombre',
    (new.raw_user_meta_data->>'fecha_nacimiento')::date
  );
  return new;
end;
$$;


--
-- Name: email_registrado(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.email_registrado(p_email text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (select 1 from auth.users where lower(email) = lower(trim(p_email)));
$$;


--
-- Name: generar_butacas_sala(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_butacas_sala() RETURNS trigger
    LANGUAGE plpgsql
    AS $$declare
  v_fila text;
  v_columna int;
begin
  -- Filas estándar: A-T excluyendo J y K
  for v_fila in
    select chr(n)
    from generate_series(ascii('A'), ascii('T')) as n
    where chr(n) not in ('J', 'K')
  loop
    for v_columna in 1..28 loop
      insert into butaca (sala_id, identificador, es_especial)
      values (new.id, v_fila || v_columna::text, false);
    end loop;
  end loop;
 
  -- Fila J: butacas accesibles (fusión de las filas J y K originales)
  for v_columna in
    select c
    from generate_series(1, 28) as c
    where c in (1, 2, 27, 28) or c between 10 and 19
  loop
    insert into butaca (sala_id, identificador, es_especial)
    values (new.id, 'J' || v_columna::text, true);
  end loop;
 
  return new;
end;$$;


--
-- Name: liberar_butacas_de_funcion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.liberar_butacas_de_funcion() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update funcion
  set butacas_reservadas = array(
    select b from unnest(butacas_reservadas) as b where b <> all(old.butacas)
  )
  where id = old.funcion_id;
  return old;
end;
$$;


--
-- Name: puede_agregar_a_orden(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.puede_agregar_a_orden(p_orden_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from orden
    where id = p_orden_id
      and (usuario_id is null or usuario_id = auth.uid())
      and fecha_creacion > now() - interval '10 minutes'
  );
$$;


--
-- Name: registrar_auditoria(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.registrar_auditoria() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_fila jsonb;
  v_old jsonb;
  v_new jsonb;
  v_accion accion_auditoria;
begin
  if tg_op = 'INSERT' then
    v_fila := to_jsonb(new);
    v_accion := 'Creacion';
  elsif tg_op = 'DELETE' then
    v_fila := to_jsonb(old);
    v_accion := 'Eliminacion';
  else
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_fila := v_new;

    -- Cambios de caché que hacen otros triggers: no se auditan.
    if tg_table_name = 'funcion' then
      v_old := v_old - 'butacas_reservadas';
      v_new := v_new - 'butacas_reservadas';
    end if;
    if v_old = v_new then
      return null;
    end if;

    if tg_table_name = 'orden'
       and not (v_old ->> 'verificada')::boolean
       and (v_new ->> 'verificada')::boolean
       and exists (select 1 from reserva where orden_id = (v_new ->> 'id')::uuid) then
      v_accion := 'Validacion';
    else
      v_accion := 'Modificacion';
    end if;
  end if;

  insert into auditoria (modelo, modelo_id, accion, usuario_id)
  values (
    tg_table_name,
    coalesce(v_fila ->> 'id', v_fila ->> 'orden_id'),  -- reserva: PK = orden_id
    v_accion,
    auth.uid()
  );

  return null;
end;
$$;


--
-- Name: validar_gap_funcion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_gap_funcion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$begin
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
end$$;


--
-- Name: validar_resena(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_resena() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from orden o
      join reserva r on r.orden_id = o.id
      join funcion f on f.id = r.funcion_id
      where o.usuario_id = new.usuario_id
        and f.pelicula_id = new.pelicula_id
    ) then
      raise exception 'Solo se puede reseñar una película para la que se compró entrada';
    end if;
  else
    if new.pelicula_id <> old.pelicula_id or new.usuario_id <> old.usuario_id then
      raise exception 'No se puede cambiar la película ni el usuario de una reseña';
    end if;
    new.fecha_edicion := now();
  end if;
  return new;
end;
$$;


--
-- Name: validar_reserva(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_reserva() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_sala_id uuid;
  v_reservadas text[];
  v_validas int;
begin
  select sala_id, butacas_reservadas
  into v_sala_id, v_reservadas
  from funcion
  where id = new.funcion_id
  for update;
 
  if cardinality(new.butacas) <> (select count(distinct b) from unnest(new.butacas) as b) then
    raise exception 'La reserva contiene butacas repetidas';
  end if;
 
  select count(*) into v_validas
  from butaca
  where sala_id = v_sala_id and identificador = any(new.butacas);
 
  if v_validas <> cardinality(new.butacas) then
    raise exception 'Alguna butaca no existe en la sala de esta función';
  end if;
 
  if v_reservadas && new.butacas then
    raise exception 'Alguna butaca ya está reservada para esta función';
  end if;
 
  return new;
end;
$$;


--
-- Name: validar_y_descontar_puntos_orden(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_y_descontar_puntos_orden() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_puntos_disponibles integer;
begin
  if new.pago_con_puntos then
    if new.usuario_id is null then
      raise exception 'Solo un usuario registrado puede pagar con puntos';
    end if;

    select puntos into v_puntos_disponibles
    from usuario where id = new.usuario_id
    for update;

    if v_puntos_disponibles is null or v_puntos_disponibles < new.puntos_utilizados then
      raise exception 'Puntos insuficientes: la compra requiere % puntos y el usuario tiene %',
        new.puntos_utilizados, coalesce(v_puntos_disponibles, 0);
    end if;

    update usuario set puntos = puntos - new.puntos_utilizados where id = new.usuario_id;
  end if;

  return new;
end;
$$;


--
-- Name: articulo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articulo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    precio numeric(10,2) NOT NULL,
    categoria_id uuid NOT NULL,
    disponible boolean DEFAULT true NOT NULL,
    puntos integer DEFAULT 0 NOT NULL,
    CONSTRAINT articulo_precio_check CHECK ((precio >= (0)::numeric)),
    CONSTRAINT articulo_puntos_check CHECK ((puntos >= 0))
);


--
-- Name: auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    modelo text NOT NULL,
    modelo_id text NOT NULL,
    accion public.accion_auditoria NOT NULL,
    usuario_id uuid,
    fecha timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auditoria_modelo_check CHECK ((modelo = ANY (ARRAY['reserva'::text, 'orden'::text, 'pelicula'::text, 'funcion'::text, 'articulo'::text, 'resena'::text, 'configuracion'::text])))
);


--
-- Name: butaca; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.butaca (
    sala_id uuid NOT NULL,
    identificador character varying(3) NOT NULL,
    es_especial boolean DEFAULT false NOT NULL,
    es_discapacitados boolean DEFAULT false NOT NULL
);


--
-- Name: categoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL
);


--
-- Name: categoria_articulo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categoria_articulo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL
);


--
-- Name: clasificacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clasificacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo text NOT NULL,
    descripcion text
);


--
-- Name: combo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.combo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    precio numeric(10,2) NOT NULL,
    cantidad_entradas integer DEFAULT 1 NOT NULL,
    disponible boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT combo_cantidad_entradas_check CHECK ((cantidad_entradas > 0)),
    CONSTRAINT combo_precio_check CHECK ((precio >= (0)::numeric))
);


--
-- Name: combo_articulo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.combo_articulo (
    combo_id uuid NOT NULL,
    articulo_id uuid NOT NULL,
    cantidad integer DEFAULT 1 NOT NULL,
    CONSTRAINT combo_articulo_cantidad_check CHECK ((cantidad > 0))
);


--
-- Name: configuracion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracion (
    id boolean DEFAULT true NOT NULL,
    descuento_primera_compra_porcentaje numeric(5,2) DEFAULT 10.00 NOT NULL,
    CONSTRAINT configuracion_descuento_primera_compra_porcentaje_check CHECK (((descuento_primera_compra_porcentaje >= (0)::numeric) AND (descuento_primera_compra_porcentaje <= (100)::numeric))),
    CONSTRAINT configuracion_id_check CHECK (id)
);


--
-- Name: funcion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.funcion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pelicula_id uuid NOT NULL,
    sala_id uuid NOT NULL,
    fecha_inicio timestamp with time zone NOT NULL,
    fecha_fin timestamp with time zone NOT NULL,
    butacas_reservadas text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    precio numeric(10,2) DEFAULT 0 NOT NULL,
    puntos integer DEFAULT 0 NOT NULL,
    CONSTRAINT funcion_check CHECK ((fecha_fin > fecha_inicio)),
    CONSTRAINT funcion_precio_check CHECK ((precio >= (0)::numeric)),
    CONSTRAINT funcion_puntos_check CHECK ((puntos >= 0))
);


--
-- Name: historial_puntos_usuario; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.historial_puntos_usuario WITH (security_invoker='true') AS
 SELECT usuario_id,
    id AS orden_id,
    fecha_creacion,
        CASE
            WHEN pago_con_puntos THEN 'canje'::text
            ELSE 'ganancia'::text
        END AS tipo,
        CASE
            WHEN pago_con_puntos THEN (- puntos_utilizados)
            ELSE (floor(total))::integer
        END AS puntos
   FROM public.orden o
  WHERE (usuario_id IS NOT NULL)
  ORDER BY fecha_creacion DESC;


--
-- Name: pelicula; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pelicula (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    sinopsis text NOT NULL,
    duracion_minutos integer NOT NULL,
    imagen_url text,
    formato public.formato_pelicula NOT NULL,
    idioma public.idioma_pelicula NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    promedio_resenas numeric(3,2) DEFAULT 0 NOT NULL,
    cantidad_resenas integer DEFAULT 0 NOT NULL,
    clasificacion_id uuid,
    proximamente boolean DEFAULT false NOT NULL,
    CONSTRAINT pelicula_duracion_minutos_check CHECK ((duracion_minutos > 0))
);


--
-- Name: pelicula_categoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pelicula_categoria (
    pelicula_id uuid NOT NULL,
    categoria_id uuid NOT NULL
);


--
-- Name: resena; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resena (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pelicula_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    puntaje smallint NOT NULL,
    comentario character varying(280),
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_edicion timestamp with time zone,
    CONSTRAINT resena_puntaje_check CHECK (((puntaje >= 1) AND (puntaje <= 5)))
);


--
-- Name: reserva; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reserva (
    orden_id uuid NOT NULL,
    funcion_id uuid NOT NULL,
    butacas text[] NOT NULL,
    precio_butacas numeric(10,2) NOT NULL,
    precio_articulos numeric(10,2) DEFAULT 0 NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    CONSTRAINT reserva_butacas_check CHECK ((cardinality(butacas) > 0)),
    CONSTRAINT reserva_precio_articulos_check CHECK ((precio_articulos >= (0)::numeric)),
    CONSTRAINT reserva_precio_butacas_check CHECK ((precio_butacas >= (0)::numeric))
);


--
-- Name: reserva_articulo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reserva_articulo (
    reserva_id uuid NOT NULL,
    articulo_id uuid NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    CONSTRAINT reserva_articulo_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT reserva_articulo_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric))
);


--
-- Name: sala; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sala (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL
);


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario (
    id uuid NOT NULL,
    email text NOT NULL,
    nombre text NOT NULL,
    fecha_nacimiento date NOT NULL,
    rol public.rol_usuario DEFAULT 'cliente'::public.rol_usuario NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    puntos integer DEFAULT 0 NOT NULL,
    saldo integer DEFAULT 0 NOT NULL,
    CONSTRAINT usuario_puntos_check CHECK ((puntos >= 0))
);


--
-- Name: articulo articulo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articulo
    ADD CONSTRAINT articulo_pkey PRIMARY KEY (id);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);


--
-- Name: butaca butaca_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.butaca
    ADD CONSTRAINT butaca_pkey PRIMARY KEY (sala_id, identificador);


--
-- Name: categoria_articulo categoria_articulo_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria_articulo
    ADD CONSTRAINT categoria_articulo_nombre_key UNIQUE (nombre);


--
-- Name: categoria_articulo categoria_articulo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria_articulo
    ADD CONSTRAINT categoria_articulo_pkey PRIMARY KEY (id);


--
-- Name: categoria categoria_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria
    ADD CONSTRAINT categoria_nombre_key UNIQUE (nombre);


--
-- Name: categoria categoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria
    ADD CONSTRAINT categoria_pkey PRIMARY KEY (id);


--
-- Name: clasificacion clasificacion_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clasificacion
    ADD CONSTRAINT clasificacion_codigo_key UNIQUE (codigo);


--
-- Name: clasificacion clasificacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clasificacion
    ADD CONSTRAINT clasificacion_pkey PRIMARY KEY (id);


--
-- Name: combo_articulo combo_articulo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_articulo
    ADD CONSTRAINT combo_articulo_pkey PRIMARY KEY (combo_id, articulo_id);


--
-- Name: combo combo_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo
    ADD CONSTRAINT combo_nombre_key UNIQUE (nombre);


--
-- Name: combo combo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo
    ADD CONSTRAINT combo_pkey PRIMARY KEY (id);


--
-- Name: configuracion configuracion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion
    ADD CONSTRAINT configuracion_pkey PRIMARY KEY (id);


--
-- Name: funcion funcion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcion
    ADD CONSTRAINT funcion_pkey PRIMARY KEY (id);


--
-- Name: orden orden_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden
    ADD CONSTRAINT orden_pkey PRIMARY KEY (id);


--
-- Name: orden orden_qr_data_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden
    ADD CONSTRAINT orden_qr_data_key UNIQUE (qr_data);


--
-- Name: pelicula_categoria pelicula_categoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pelicula_categoria
    ADD CONSTRAINT pelicula_categoria_pkey PRIMARY KEY (pelicula_id, categoria_id);


--
-- Name: pelicula pelicula_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pelicula
    ADD CONSTRAINT pelicula_pkey PRIMARY KEY (id);


--
-- Name: resena resena_pelicula_id_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resena
    ADD CONSTRAINT resena_pelicula_id_usuario_id_key UNIQUE (pelicula_id, usuario_id);


--
-- Name: resena resena_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resena
    ADD CONSTRAINT resena_pkey PRIMARY KEY (id);


--
-- Name: reserva_articulo reserva_articulo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_articulo
    ADD CONSTRAINT reserva_articulo_pkey PRIMARY KEY (reserva_id, articulo_id);


--
-- Name: reserva reserva_orden_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_orden_id_key UNIQUE (orden_id);


--
-- Name: reserva reserva_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_pkey PRIMARY KEY (id);


--
-- Name: sala sala_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sala
    ADD CONSTRAINT sala_nombre_key UNIQUE (nombre);


--
-- Name: sala sala_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sala
    ADD CONSTRAINT sala_pkey PRIMARY KEY (id);


--
-- Name: usuario usuario_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_email_key UNIQUE (email);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);


--
-- Name: auditoria_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditoria_fecha_idx ON public.auditoria USING btree (fecha DESC);


--
-- Name: auditoria_modelo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditoria_modelo_idx ON public.auditoria USING btree (modelo, modelo_id);


--
-- Name: auditoria_usuario_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditoria_usuario_idx ON public.auditoria USING btree (usuario_id);


--
-- Name: combo_articulo_articulo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX combo_articulo_articulo_idx ON public.combo_articulo USING btree (articulo_id);


--
-- Name: idx_orden_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orden_usuario ON public.orden USING btree (usuario_id);


--
-- Name: idx_resena_pelicula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resena_pelicula ON public.resena USING btree (pelicula_id);


--
-- Name: idx_reserva_articulo_reserva; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reserva_articulo_reserva ON public.reserva_articulo USING btree (reserva_id);


--
-- Name: idx_reserva_funcion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reserva_funcion ON public.reserva USING btree (funcion_id);


--
-- Name: orden_combo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orden_combo_idx ON public.orden USING btree (combo_id) WHERE (combo_id IS NOT NULL);


--
-- Name: orden trg_acreditar_puntos_por_compra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_acreditar_puntos_por_compra AFTER INSERT ON public.orden FOR EACH ROW EXECUTE FUNCTION public.acreditar_puntos_por_compra();


--
-- Name: reserva_articulo trg_actualizar_precio_articulos_reserva; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_actualizar_precio_articulos_reserva AFTER INSERT OR DELETE OR UPDATE ON public.reserva_articulo FOR EACH ROW EXECUTE FUNCTION public.actualizar_precio_articulos_reserva();


--
-- Name: resena trg_actualizar_promedio_pelicula; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_actualizar_promedio_pelicula AFTER INSERT OR DELETE OR UPDATE ON public.resena FOR EACH ROW EXECUTE FUNCTION public.actualizar_promedio_pelicula();


--
-- Name: reserva trg_agregar_butacas_a_funcion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_agregar_butacas_a_funcion AFTER INSERT ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.agregar_butacas_a_funcion();


--
-- Name: articulo trg_auditoria_articulo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria_articulo AFTER INSERT OR DELETE OR UPDATE ON public.articulo FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();


--
-- Name: configuracion trg_auditoria_configuracion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria_configuracion AFTER INSERT OR DELETE OR UPDATE ON public.configuracion FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();


--
-- Name: funcion trg_auditoria_funcion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria_funcion AFTER INSERT OR DELETE OR UPDATE ON public.funcion FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();


--
-- Name: orden trg_auditoria_orden; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria_orden AFTER INSERT OR DELETE OR UPDATE ON public.orden FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();


--
-- Name: pelicula trg_auditoria_pelicula; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria_pelicula AFTER INSERT OR DELETE OR UPDATE ON public.pelicula FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();


--
-- Name: resena trg_auditoria_resena; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria_resena AFTER INSERT OR DELETE OR UPDATE ON public.resena FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();


--
-- Name: reserva trg_auditoria_reserva; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria_reserva AFTER INSERT OR DELETE OR UPDATE ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();


--
-- Name: reserva trg_bloquear_edicion_reserva; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bloquear_edicion_reserva BEFORE UPDATE ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.bloquear_edicion_reserva();


--
-- Name: sala trg_generar_butacas; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generar_butacas AFTER INSERT ON public.sala FOR EACH ROW EXECUTE FUNCTION public.generar_butacas_sala();


--
-- Name: reserva trg_liberar_butacas_de_funcion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_liberar_butacas_de_funcion AFTER DELETE ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.liberar_butacas_de_funcion();


--
-- Name: resena trg_validar_resena; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validar_resena BEFORE INSERT OR UPDATE ON public.resena FOR EACH ROW EXECUTE FUNCTION public.validar_resena();


--
-- Name: reserva trg_validar_reserva; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validar_reserva BEFORE INSERT ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.validar_reserva();


--
-- Name: orden trg_validar_y_descontar_puntos_orden; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validar_y_descontar_puntos_orden BEFORE INSERT ON public.orden FOR EACH ROW EXECUTE FUNCTION public.validar_y_descontar_puntos_orden();


--
-- Name: articulo articulo_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articulo
    ADD CONSTRAINT articulo_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categoria_articulo(id) ON DELETE RESTRICT;


--
-- Name: auditoria auditoria_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: butaca butaca_sala_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.butaca
    ADD CONSTRAINT butaca_sala_id_fkey FOREIGN KEY (sala_id) REFERENCES public.sala(id) ON DELETE CASCADE;


--
-- Name: combo_articulo combo_articulo_articulo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_articulo
    ADD CONSTRAINT combo_articulo_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES public.articulo(id) ON DELETE RESTRICT;


--
-- Name: combo_articulo combo_articulo_combo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_articulo
    ADD CONSTRAINT combo_articulo_combo_id_fkey FOREIGN KEY (combo_id) REFERENCES public.combo(id) ON DELETE CASCADE;


--
-- Name: funcion funcion_pelicula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcion
    ADD CONSTRAINT funcion_pelicula_id_fkey FOREIGN KEY (pelicula_id) REFERENCES public.pelicula(id) ON DELETE RESTRICT;


--
-- Name: funcion funcion_sala_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcion
    ADD CONSTRAINT funcion_sala_id_fkey FOREIGN KEY (sala_id) REFERENCES public.sala(id) ON DELETE RESTRICT;


--
-- Name: orden orden_combo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden
    ADD CONSTRAINT orden_combo_id_fkey FOREIGN KEY (combo_id) REFERENCES public.combo(id) ON DELETE RESTRICT;


--
-- Name: orden orden_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden
    ADD CONSTRAINT orden_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: pelicula_categoria pelicula_categoria_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pelicula_categoria
    ADD CONSTRAINT pelicula_categoria_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categoria(id) ON DELETE CASCADE;


--
-- Name: pelicula_categoria pelicula_categoria_pelicula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pelicula_categoria
    ADD CONSTRAINT pelicula_categoria_pelicula_id_fkey FOREIGN KEY (pelicula_id) REFERENCES public.pelicula(id) ON DELETE CASCADE;


--
-- Name: pelicula pelicula_clasificacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pelicula
    ADD CONSTRAINT pelicula_clasificacion_id_fkey FOREIGN KEY (clasificacion_id) REFERENCES public.clasificacion(id);


--
-- Name: resena resena_pelicula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resena
    ADD CONSTRAINT resena_pelicula_id_fkey FOREIGN KEY (pelicula_id) REFERENCES public.pelicula(id) ON DELETE CASCADE;


--
-- Name: resena resena_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resena
    ADD CONSTRAINT resena_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: reserva_articulo reserva_articulo_articulo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_articulo
    ADD CONSTRAINT reserva_articulo_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES public.articulo(id) ON DELETE RESTRICT;


--
-- Name: reserva_articulo reserva_articulo_reserva_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_articulo
    ADD CONSTRAINT reserva_articulo_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES public.reserva(id) ON DELETE CASCADE;


--
-- Name: reserva reserva_funcion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_funcion_id_fkey FOREIGN KEY (funcion_id) REFERENCES public.funcion(id) ON DELETE RESTRICT;


--
-- Name: reserva reserva_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.orden(id) ON DELETE CASCADE;


--
-- Name: usuario usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: articulo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.articulo ENABLE ROW LEVEL SECURITY;

--
-- Name: articulo articulo_escritura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY articulo_escritura_admin ON public.articulo USING ((public.auth_rol() = 'admin'::public.rol_usuario)) WITH CHECK ((public.auth_rol() = 'admin'::public.rol_usuario));


--
-- Name: articulo articulo_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY articulo_lectura_publica ON public.articulo FOR SELECT USING (true);


--
-- Name: auditoria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

--
-- Name: auditoria auditoria_lectura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auditoria_lectura_admin ON public.auditoria FOR SELECT USING ((public.auth_rol() = 'admin'::public.rol_usuario));


--
-- Name: butaca; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.butaca ENABLE ROW LEVEL SECURITY;

--
-- Name: butaca butaca_escritura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY butaca_escritura_admin ON public.butaca USING ((public.auth_rol() = 'admin'::public.rol_usuario)) WITH CHECK ((public.auth_rol() = 'admin'::public.rol_usuario));


--
-- Name: butaca butaca_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY butaca_lectura_publica ON public.butaca FOR SELECT USING (true);


--
-- Name: categoria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categoria ENABLE ROW LEVEL SECURITY;

--
-- Name: categoria_articulo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categoria_articulo ENABLE ROW LEVEL SECURITY;

--
-- Name: categoria_articulo categoria_articulo_escritura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categoria_articulo_escritura_admin ON public.categoria_articulo USING ((public.auth_rol() = 'admin'::public.rol_usuario)) WITH CHECK ((public.auth_rol() = 'admin'::public.rol_usuario));


--
-- Name: categoria_articulo categoria_articulo_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categoria_articulo_lectura_publica ON public.categoria_articulo FOR SELECT USING (true);


--
-- Name: categoria categoria_escritura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categoria_escritura_admin ON public.categoria USING ((public.auth_rol() = 'admin'::public.rol_usuario)) WITH CHECK ((public.auth_rol() = 'admin'::public.rol_usuario));


--
-- Name: categoria categoria_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categoria_lectura_publica ON public.categoria FOR SELECT USING (true);


--
-- Name: combo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.combo ENABLE ROW LEVEL SECURITY;

--
-- Name: combo_articulo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.combo_articulo ENABLE ROW LEVEL SECURITY;

--
-- Name: combo_articulo combo_articulo_escritura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY combo_articulo_escritura_admin ON public.combo_articulo USING ((public.auth_rol() = 'admin'::public.rol_usuario)) WITH CHECK ((public.auth_rol() = 'admin'::public.rol_usuario));


--
-- Name: combo_articulo combo_articulo_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY combo_articulo_lectura_publica ON public.combo_articulo FOR SELECT USING (true);


--
-- Name: combo combo_escritura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY combo_escritura_admin ON public.combo USING ((public.auth_rol() = 'admin'::public.rol_usuario)) WITH CHECK ((public.auth_rol() = 'admin'::public.rol_usuario));


--
-- Name: combo combo_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY combo_lectura_publica ON public.combo FOR SELECT USING (true);


--
-- Name: configuracion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

--
-- Name: configuracion configuracion_escritura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY configuracion_escritura_admin ON public.configuracion FOR UPDATE USING ((public.auth_rol() = 'admin'::public.rol_usuario)) WITH CHECK ((public.auth_rol() = 'admin'::public.rol_usuario));


--
-- Name: configuracion configuracion_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY configuracion_lectura_publica ON public.configuracion FOR SELECT USING (true);


--
-- Name: orden; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orden ENABLE ROW LEVEL SECURITY;

--
-- Name: orden orden_actualizacion_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orden_actualizacion_staff ON public.orden FOR UPDATE USING ((public.auth_rol() = ANY (ARRAY['empleado'::public.rol_usuario, 'admin'::public.rol_usuario]))) WITH CHECK ((public.auth_rol() = ANY (ARRAY['empleado'::public.rol_usuario, 'admin'::public.rol_usuario])));


--
-- Name: orden orden_insercion_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orden_insercion_publica ON public.orden FOR INSERT WITH CHECK (((usuario_id IS NULL) OR (usuario_id = auth.uid())));


--
-- Name: orden orden_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orden_lectura_publica ON public.orden FOR SELECT USING (true);


--
-- Name: pelicula; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pelicula ENABLE ROW LEVEL SECURITY;

--
-- Name: pelicula_categoria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pelicula_categoria ENABLE ROW LEVEL SECURITY;

--
-- Name: pelicula_categoria pelicula_categoria_escritura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pelicula_categoria_escritura_admin ON public.pelicula_categoria USING ((public.auth_rol() = 'admin'::public.rol_usuario)) WITH CHECK ((public.auth_rol() = 'admin'::public.rol_usuario));


--
-- Name: pelicula_categoria pelicula_categoria_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pelicula_categoria_lectura_publica ON public.pelicula_categoria FOR SELECT USING (true);


--
-- Name: pelicula pelicula_escritura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pelicula_escritura_admin ON public.pelicula USING ((public.auth_rol() = 'admin'::public.rol_usuario)) WITH CHECK ((public.auth_rol() = 'admin'::public.rol_usuario));


--
-- Name: pelicula pelicula_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pelicula_lectura_publica ON public.pelicula FOR SELECT USING (true);


--
-- Name: resena; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resena ENABLE ROW LEVEL SECURITY;

--
-- Name: resena resena_actualizacion_propia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY resena_actualizacion_propia ON public.resena FOR UPDATE USING ((usuario_id = auth.uid())) WITH CHECK ((usuario_id = auth.uid()));


--
-- Name: resena resena_borrado_propio_o_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY resena_borrado_propio_o_admin ON public.resena FOR DELETE USING (((usuario_id = auth.uid()) OR (public.auth_rol() = 'admin'::public.rol_usuario)));


--
-- Name: resena resena_insercion_propia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY resena_insercion_propia ON public.resena FOR INSERT WITH CHECK ((usuario_id = auth.uid()));


--
-- Name: resena resena_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY resena_lectura_publica ON public.resena FOR SELECT USING (true);


--
-- Name: reserva; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reserva ENABLE ROW LEVEL SECURITY;

--
-- Name: reserva_articulo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reserva_articulo ENABLE ROW LEVEL SECURITY;

--
-- Name: reserva_articulo reserva_articulo_insercion_a_orden_propia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reserva_articulo_insercion_a_orden_propia ON public.reserva_articulo FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.reserva r
  WHERE ((r.id = reserva_articulo.reserva_id) AND public.puede_agregar_a_orden(r.orden_id)))));


--
-- Name: reserva_articulo reserva_articulo_lectura_propia_o_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reserva_articulo_lectura_propia_o_staff ON public.reserva_articulo FOR SELECT USING (((public.auth_rol() = ANY (ARRAY['empleado'::public.rol_usuario, 'admin'::public.rol_usuario])) OR (EXISTS ( SELECT 1
   FROM (public.reserva r
     JOIN public.orden o ON ((o.id = r.orden_id)))
  WHERE ((r.id = reserva_articulo.reserva_id) AND (o.usuario_id = auth.uid()))))));


--
-- Name: reserva reserva_insercion_a_orden_propia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reserva_insercion_a_orden_propia ON public.reserva FOR INSERT WITH CHECK (public.puede_agregar_a_orden(orden_id));


--
-- Name: reserva reserva_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reserva_lectura_publica ON public.reserva FOR SELECT USING (true);


--
-- Name: sala; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sala ENABLE ROW LEVEL SECURITY;

--
-- Name: sala sala_escritura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sala_escritura_admin ON public.sala USING ((public.auth_rol() = 'admin'::public.rol_usuario)) WITH CHECK ((public.auth_rol() = 'admin'::public.rol_usuario));


--
-- Name: sala sala_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sala_lectura_publica ON public.sala FOR SELECT USING (true);


--
-- Name: usuario; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;

--
-- Name: usuario usuario_actualizacion_propia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY usuario_actualizacion_propia ON public.usuario FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: usuario usuario_gestion_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY usuario_gestion_admin ON public.usuario USING ((public.auth_rol() = 'admin'::public.rol_usuario)) WITH CHECK ((public.auth_rol() = 'admin'::public.rol_usuario));


--
-- Name: usuario usuario_lectura_propia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY usuario_lectura_propia ON public.usuario FOR SELECT USING (((auth.uid() = id) OR (public.auth_rol() = ANY (ARRAY['empleado'::public.rol_usuario, 'admin'::public.rol_usuario]))));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION acreditar_puntos_por_compra(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.acreditar_puntos_por_compra() TO anon;
GRANT ALL ON FUNCTION public.acreditar_puntos_por_compra() TO authenticated;
GRANT ALL ON FUNCTION public.acreditar_puntos_por_compra() TO service_role;


--
-- Name: FUNCTION actualizar_precio_articulos_reserva(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.actualizar_precio_articulos_reserva() TO anon;
GRANT ALL ON FUNCTION public.actualizar_precio_articulos_reserva() TO authenticated;
GRANT ALL ON FUNCTION public.actualizar_precio_articulos_reserva() TO service_role;


--
-- Name: FUNCTION actualizar_promedio_pelicula(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.actualizar_promedio_pelicula() TO anon;
GRANT ALL ON FUNCTION public.actualizar_promedio_pelicula() TO authenticated;
GRANT ALL ON FUNCTION public.actualizar_promedio_pelicula() TO service_role;


--
-- Name: FUNCTION agregar_butacas_a_funcion(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.agregar_butacas_a_funcion() TO anon;
GRANT ALL ON FUNCTION public.agregar_butacas_a_funcion() TO authenticated;
GRANT ALL ON FUNCTION public.agregar_butacas_a_funcion() TO service_role;


--
-- Name: FUNCTION auth_rol(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.auth_rol() TO anon;
GRANT ALL ON FUNCTION public.auth_rol() TO authenticated;
GRANT ALL ON FUNCTION public.auth_rol() TO service_role;


--
-- Name: FUNCTION bloquear_edicion_reserva(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.bloquear_edicion_reserva() TO anon;
GRANT ALL ON FUNCTION public.bloquear_edicion_reserva() TO authenticated;
GRANT ALL ON FUNCTION public.bloquear_edicion_reserva() TO service_role;


--
-- Name: TABLE orden; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.orden TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.orden TO authenticated;
GRANT ALL ON TABLE public.orden TO service_role;


--
-- Name: COLUMN orden.verificada; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(verificada) ON TABLE public.orden TO authenticated;


--
-- Name: COLUMN orden.fecha_verificacion; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(fecha_verificacion) ON TABLE public.orden TO authenticated;


--
-- Name: FUNCTION cancelar_orden(p_orden_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.cancelar_orden(p_orden_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.cancelar_orden(p_orden_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.cancelar_orden(p_orden_id uuid) TO service_role;


--
-- Name: FUNCTION crear_funciones_recurrentes(p_pelicula_id uuid, p_dias_semana integer[], p_hora time without time zone, p_fecha_desde date, p_fecha_hasta date, p_precio numeric, p_puntos integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.crear_funciones_recurrentes(p_pelicula_id uuid, p_dias_semana integer[], p_hora time without time zone, p_fecha_desde date, p_fecha_hasta date, p_precio numeric, p_puntos integer) TO anon;
GRANT ALL ON FUNCTION public.crear_funciones_recurrentes(p_pelicula_id uuid, p_dias_semana integer[], p_hora time without time zone, p_fecha_desde date, p_fecha_hasta date, p_precio numeric, p_puntos integer) TO authenticated;
GRANT ALL ON FUNCTION public.crear_funciones_recurrentes(p_pelicula_id uuid, p_dias_semana integer[], p_hora time without time zone, p_fecha_desde date, p_fecha_hasta date, p_precio numeric, p_puntos integer) TO service_role;


--
-- Name: FUNCTION crear_usuario_desde_auth(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.crear_usuario_desde_auth() TO anon;
GRANT ALL ON FUNCTION public.crear_usuario_desde_auth() TO authenticated;
GRANT ALL ON FUNCTION public.crear_usuario_desde_auth() TO service_role;


--
-- Name: FUNCTION email_registrado(p_email text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.email_registrado(p_email text) TO anon;
GRANT ALL ON FUNCTION public.email_registrado(p_email text) TO authenticated;
GRANT ALL ON FUNCTION public.email_registrado(p_email text) TO service_role;


--
-- Name: FUNCTION generar_butacas_sala(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generar_butacas_sala() TO anon;
GRANT ALL ON FUNCTION public.generar_butacas_sala() TO authenticated;
GRANT ALL ON FUNCTION public.generar_butacas_sala() TO service_role;


--
-- Name: FUNCTION liberar_butacas_de_funcion(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.liberar_butacas_de_funcion() TO anon;
GRANT ALL ON FUNCTION public.liberar_butacas_de_funcion() TO authenticated;
GRANT ALL ON FUNCTION public.liberar_butacas_de_funcion() TO service_role;


--
-- Name: FUNCTION puede_agregar_a_orden(p_orden_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.puede_agregar_a_orden(p_orden_id uuid) TO anon;
GRANT ALL ON FUNCTION public.puede_agregar_a_orden(p_orden_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.puede_agregar_a_orden(p_orden_id uuid) TO service_role;


--
-- Name: FUNCTION registrar_auditoria(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.registrar_auditoria() TO anon;
GRANT ALL ON FUNCTION public.registrar_auditoria() TO authenticated;
GRANT ALL ON FUNCTION public.registrar_auditoria() TO service_role;


--
-- Name: FUNCTION validar_gap_funcion(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validar_gap_funcion() TO anon;
GRANT ALL ON FUNCTION public.validar_gap_funcion() TO authenticated;
GRANT ALL ON FUNCTION public.validar_gap_funcion() TO service_role;


--
-- Name: FUNCTION validar_resena(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validar_resena() TO anon;
GRANT ALL ON FUNCTION public.validar_resena() TO authenticated;
GRANT ALL ON FUNCTION public.validar_resena() TO service_role;


--
-- Name: FUNCTION validar_reserva(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validar_reserva() TO anon;
GRANT ALL ON FUNCTION public.validar_reserva() TO authenticated;
GRANT ALL ON FUNCTION public.validar_reserva() TO service_role;


--
-- Name: FUNCTION validar_y_descontar_puntos_orden(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validar_y_descontar_puntos_orden() TO anon;
GRANT ALL ON FUNCTION public.validar_y_descontar_puntos_orden() TO authenticated;
GRANT ALL ON FUNCTION public.validar_y_descontar_puntos_orden() TO service_role;


--
-- Name: TABLE articulo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.articulo TO anon;
GRANT ALL ON TABLE public.articulo TO authenticated;
GRANT ALL ON TABLE public.articulo TO service_role;


--
-- Name: TABLE auditoria; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.auditoria TO service_role;
GRANT SELECT ON TABLE public.auditoria TO authenticated;


--
-- Name: TABLE butaca; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.butaca TO anon;
GRANT ALL ON TABLE public.butaca TO authenticated;
GRANT ALL ON TABLE public.butaca TO service_role;


--
-- Name: TABLE categoria; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.categoria TO anon;
GRANT ALL ON TABLE public.categoria TO authenticated;
GRANT ALL ON TABLE public.categoria TO service_role;


--
-- Name: TABLE categoria_articulo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.categoria_articulo TO anon;
GRANT ALL ON TABLE public.categoria_articulo TO authenticated;
GRANT ALL ON TABLE public.categoria_articulo TO service_role;


--
-- Name: TABLE clasificacion; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.clasificacion TO anon;
GRANT ALL ON TABLE public.clasificacion TO authenticated;
GRANT ALL ON TABLE public.clasificacion TO service_role;


--
-- Name: TABLE combo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.combo TO anon;
GRANT ALL ON TABLE public.combo TO authenticated;
GRANT ALL ON TABLE public.combo TO service_role;


--
-- Name: TABLE combo_articulo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.combo_articulo TO anon;
GRANT ALL ON TABLE public.combo_articulo TO authenticated;
GRANT ALL ON TABLE public.combo_articulo TO service_role;


--
-- Name: TABLE configuracion; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.configuracion TO anon;
GRANT ALL ON TABLE public.configuracion TO authenticated;
GRANT ALL ON TABLE public.configuracion TO service_role;


--
-- Name: TABLE funcion; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.funcion TO anon;
GRANT ALL ON TABLE public.funcion TO authenticated;
GRANT ALL ON TABLE public.funcion TO service_role;


--
-- Name: TABLE historial_puntos_usuario; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.historial_puntos_usuario TO anon;
GRANT ALL ON TABLE public.historial_puntos_usuario TO authenticated;
GRANT ALL ON TABLE public.historial_puntos_usuario TO service_role;


--
-- Name: TABLE pelicula; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pelicula TO anon;
GRANT ALL ON TABLE public.pelicula TO authenticated;
GRANT ALL ON TABLE public.pelicula TO service_role;


--
-- Name: TABLE pelicula_categoria; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pelicula_categoria TO anon;
GRANT ALL ON TABLE public.pelicula_categoria TO authenticated;
GRANT ALL ON TABLE public.pelicula_categoria TO service_role;


--
-- Name: TABLE resena; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.resena TO anon;
GRANT ALL ON TABLE public.resena TO authenticated;
GRANT ALL ON TABLE public.resena TO service_role;


--
-- Name: TABLE reserva; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.reserva TO anon;
GRANT ALL ON TABLE public.reserva TO authenticated;
GRANT ALL ON TABLE public.reserva TO service_role;


--
-- Name: TABLE reserva_articulo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.reserva_articulo TO anon;
GRANT ALL ON TABLE public.reserva_articulo TO authenticated;
GRANT ALL ON TABLE public.reserva_articulo TO service_role;


--
-- Name: TABLE sala; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sala TO anon;
GRANT ALL ON TABLE public.sala TO authenticated;
GRANT ALL ON TABLE public.sala TO service_role;


--
-- Name: TABLE usuario; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.usuario TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.usuario TO authenticated;
GRANT ALL ON TABLE public.usuario TO service_role;


--
-- Name: COLUMN usuario.nombre; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(nombre) ON TABLE public.usuario TO authenticated;


--
-- Name: COLUMN usuario.fecha_nacimiento; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(fecha_nacimiento) ON TABLE public.usuario TO authenticated;


--
-- Name: COLUMN usuario.saldo; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(saldo) ON TABLE public.usuario TO authenticated;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict yStcqAj2ZbodcinvpUDfdsQvkYrDxbasdLRsTsYnbVSSsTGGAyM9FxgpZ45VYiu

