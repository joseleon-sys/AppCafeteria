-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.fraud_prevention_log (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint,
  action_type character varying,
  severity character varying,
  details jsonb,
  ip_address character varying,
  user_agent text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT fraud_prevention_log_pkey PRIMARY KEY (id),
  CONSTRAINT fraud_prevention_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.lineas_pedido (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_pedido uuid,
  id_producto_menu uuid,
  nombre_producto text,
  precio_compra numeric,
  opciones_elegidas jsonb DEFAULT '{}'::jsonb,
  es_alergia_critica boolean DEFAULT false,
  notas text,
  CONSTRAINT lineas_pedido_pkey PRIMARY KEY (id),
  CONSTRAINT lineas_pedido_id_pedido_fkey FOREIGN KEY (id_pedido) REFERENCES public.pedidos(id),
  CONSTRAINT lineas_pedido_id_producto_menu_fkey FOREIGN KEY (id_producto_menu) REFERENCES public.productos_menu(id)
);
CREATE TABLE public.listas_preparacion (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_turno integer,
  fecha date DEFAULT CURRENT_DATE,
  hora_cierre timestamp with time zone DEFAULT now(),
  estado text DEFAULT 'PROCESANDO'::text CHECK (estado = ANY (ARRAY['PROCESANDO'::text, 'COMPLETADA'::text])),
  CONSTRAINT listas_preparacion_pkey PRIMARY KEY (id),
  CONSTRAINT listas_preparacion_id_turno_fkey FOREIGN KEY (id_turno) REFERENCES public.turnos(id)
);
CREATE TABLE public.parent_child_links (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  parent_id bigint,
  child_id bigint,
  status character varying DEFAULT 'pending'::character varying,
  requested_at timestamp without time zone DEFAULT now(),
  approved_at timestamp without time zone,
  spending_limit numeric DEFAULT 20.00,
  can_order boolean DEFAULT true,
  notes text,
  CONSTRAINT parent_child_links_pkey PRIMARY KEY (id),
  CONSTRAINT parent_child_links_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id),
  CONSTRAINT parent_child_links_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.users(id)
);
CREATE TABLE public.pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_perfil uuid,
  id_pagador uuid,
  id_turno integer,
  id_lista_preparacion uuid,
  alergenos_snapshot jsonb DEFAULT '[]'::jsonb,
  estado text DEFAULT 'PAGADO'::text,
  id_pasarela_pago text,
  fecha_creacion timestamp with time zone DEFAULT now(),
  CONSTRAINT pedidos_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_id_perfil_fkey FOREIGN KEY (id_perfil) REFERENCES public.perfiles(id),
  CONSTRAINT pedidos_id_pagador_fkey FOREIGN KEY (id_pagador) REFERENCES public.perfiles(id),
  CONSTRAINT pedidos_id_turno_fkey FOREIGN KEY (id_turno) REFERENCES public.turnos(id),
  CONSTRAINT pedidos_id_lista_preparacion_fkey FOREIGN KEY (id_lista_preparacion) REFERENCES public.listas_preparacion(id)
);
CREATE TABLE public.perfiles (
  id uuid NOT NULL,
  nombre_completo text,
  alergenos jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT perfiles_pkey PRIMARY KEY (id),
  CONSTRAINT perfiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.productos_menu (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  precio numeric NOT NULL,
  alergenos jsonb DEFAULT '[]'::jsonb,
  activo boolean DEFAULT true,
  CONSTRAINT productos_menu_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tipos_alergenos (
  id integer NOT NULL DEFAULT nextval('tipos_alergenos_id_seq'::regclass),
  nombre character varying NOT NULL,
  slug text NOT NULL UNIQUE,
  CONSTRAINT tipos_alergenos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.turnos (
  id integer NOT NULL DEFAULT nextval('turnos_id_seq'::regclass),
  nombre text NOT NULL,
  hora_limite_pedido time without time zone NOT NULL,
  CONSTRAINT turnos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email character varying NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  nombre character varying NOT NULL,
  role character varying DEFAULT 'customer'::character varying,
  is_adult boolean DEFAULT false,
  birth_date date,
  parent_token character varying UNIQUE,
  phone character varying,
  verified_phone boolean DEFAULT false,
  verified_email boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  last_login timestamp without time zone,
  active boolean DEFAULT true,
  alias character varying,
  favoritos ARRAY,
  special_code text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.vinculos_familiares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_tutor uuid,
  id_hijo uuid,
  nombre_tutor character varying,
  nombre_hijo character varying,
  CONSTRAINT vinculos_familiares_pkey PRIMARY KEY (id),
  CONSTRAINT vinculos_familiares_id_tutor_fkey FOREIGN KEY (id_tutor) REFERENCES public.perfiles(id),
  CONSTRAINT vinculos_familiares_id_hijo_fkey FOREIGN KEY (id_hijo) REFERENCES public.perfiles(id)
);