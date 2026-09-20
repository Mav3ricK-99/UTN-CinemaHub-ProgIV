-- Configuración global del sistema. Singleton: siempre una única fila.

create table configuracion (
  id boolean primary key default true check (id),
  descuento_primera_compra_porcentaje numeric(5,2) not null default 10.00
    check (descuento_primera_compra_porcentaje >= 0 and descuento_primera_compra_porcentaje <= 100)
);

insert into configuracion (id, descuento_primera_compra_porcentaje) values (true, 10.00);
