// ARCH-DB-02: línea base generada por Payload para versionar el esquema existente.
// Reproduce el esquema en una base vacía; no contiene credenciales y no reemplaza
// un backup ni autoriza aplicar cambios destructivos en producción.
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('superadmin', 'web-admin', 'publisher', 'reviewer', 'editor', 'correspondent', 'media-manager', 'auditor', 'viewer');
  CREATE TYPE "public"."enum_noticias_approval_history_accion" AS ENUM('sent_to_review', 'reviewed', 'approved', 'rejected');
  CREATE TYPE "public"."enum_noticias_approval_status" AS ENUM('draft', 'en_revision', 'rechazado', 'aprobado', 'publicado');
  CREATE TYPE "public"."enum_noticias_category" AS ENUM('institucional', 'academica', 'investigacion', 'extension', 'eventos', 'comunicados');
  CREATE TYPE "public"."enum_noticias_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__noticias_v_version_approval_history_accion" AS ENUM('sent_to_review', 'reviewed', 'approved', 'rejected');
  CREATE TYPE "public"."enum__noticias_v_version_approval_status" AS ENUM('draft', 'en_revision', 'rechazado', 'aprobado', 'publicado');
  CREATE TYPE "public"."enum__noticias_v_version_category" AS ENUM('institucional', 'academica', 'investigacion', 'extension', 'eventos', 'comunicados');
  CREATE TYPE "public"."enum__noticias_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_paginas_blocks_cta_style" AS ENUM('primary', 'secondary', 'outline');
  CREATE TYPE "public"."enum_paginas_blocks_two_column_ratio" AS ENUM('50-50', '60-40', '40-60');
  CREATE TYPE "public"."enum_paginas_approval_history_accion" AS ENUM('sent_to_review', 'reviewed', 'approved', 'rejected');
  CREATE TYPE "public"."enum_paginas_approval_status" AS ENUM('draft', 'en_revision', 'rechazado', 'aprobado', 'publicado');
  CREATE TYPE "public"."enum_paginas_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__paginas_v_blocks_cta_style" AS ENUM('primary', 'secondary', 'outline');
  CREATE TYPE "public"."enum__paginas_v_blocks_two_column_ratio" AS ENUM('50-50', '60-40', '40-60');
  CREATE TYPE "public"."enum__paginas_v_version_approval_history_accion" AS ENUM('sent_to_review', 'reviewed', 'approved', 'rejected');
  CREATE TYPE "public"."enum__paginas_v_version_approval_status" AS ENUM('draft', 'en_revision', 'rechazado', 'aprobado', 'publicado');
  CREATE TYPE "public"."enum__paginas_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_carreras_modalidad" AS ENUM('Presencial', 'Semipresencial', 'Virtual');
  CREATE TYPE "public"."enum_carreras_tipo" AS ENUM('grado', 'posgrado');
  CREATE TYPE "public"."enum_marco_legal_category" AS ENUM('ley-creacion', 'estatuto', 'reglamento-general', 'reglamentos-especiales', 'codigos', 'politicas', 'planes', 'manuales', 'procedimientos', 'protocolos');
  CREATE TYPE "public"."enum_auditoria_accion" AS ENUM('login', 'logout', 'crear', 'actualizar', 'eliminar', 'publicar', 'cambiar_rol', 'revisar', 'aprobar', 'rechazar', 'importar', 'revalidar');
  CREATE TYPE "public"."enum_auditoria_resultado" AS ENUM('exito', 'error', 'advertencia');
  CREATE TYPE "public"."enum_autoridades_type" AS ENUM('rector', 'vicerrector', 'decano', 'secretario', 'director');
  CREATE TYPE "public"."enum_ley5189_category" AS ENUM('organigrama', 'direccion-telefono', 'nomina-personal', 'presupuesto-ingresos-gastos', 'anexo-personal', 'ejecucion-presupuestaria', 'registro-viaticos', 'bienes-patrimoniales', 'funcionarios-comisionados', 'otras-informaciones', 'cumplimiento-art7');
  CREATE TYPE "public"."enum_ley5282_category" AS ENUM('item-1', 'item-2', 'item-3', 'item-4', 'item-5', 'item-6', 'item-7', 'item-8', 'item-9', 'item-10', 'item-11', 'item-12', 'item-13', 'item-14', 'item-15', 'item-16', 'item-17');
  CREATE TYPE "public"."enum_convenios_type" AS ENUM('nacional', 'internacional');
  CREATE TYPE "public"."enum_tribunal_documentos_tipo" AS ENUM('principal-cronograma', 'principal-reglamento', 'lista-inscriptos', 'formato-notas', 'padron-electoral', 'candidaturas', 'oficializacion', 'proclamacion');
  CREATE TYPE "public"."enum_aranceles_rectorado_grupo" AS ENUM('multas', 'venta', 'educativos');
  CREATE TYPE "public"."enum_faqs_category" AS ENUM('horarios', 'admision', 'tramites', 'servicios', 'transparencia', 'rrhh', 'titulos');
  CREATE TYPE "public"."enum_navegacion_links_children_type" AS ENUM('manual', 'relationship');
  CREATE TYPE "public"."enum_navegacion_links_type" AS ENUM('manual', 'relationship');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"role" "enum_users_role" DEFAULT 'viewer' NOT NULL,
  	"telefono" varchar,
  	"telegram_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"blur_data_u_r_l" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "noticias_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar
  );
  
  CREATE TABLE "noticias_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar
  );
  
  CREATE TABLE "noticias_approval_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"revisor" varchar,
  	"accion" "enum_noticias_approval_history_accion",
  	"comentario" varchar,
  	"fecha" timestamp(3) with time zone
  );
  
  CREATE TABLE "noticias" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"approval_status" "enum_noticias_approval_status" DEFAULT 'draft',
  	"featured" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"category" "enum_noticias_category",
  	"faculty_id" integer,
  	"author" varchar,
  	"title" varchar,
  	"slug" varchar,
  	"summary" varchar,
  	"content" jsonb,
  	"featured_image_id" integer,
  	"featured_image_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_noticias_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_noticias_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tag" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_noticias_v_version_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_noticias_v_version_approval_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"revisor" varchar,
  	"accion" "enum__noticias_v_version_approval_history_accion",
  	"comentario" varchar,
  	"fecha" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_noticias_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_approval_status" "enum__noticias_v_version_approval_status" DEFAULT 'draft',
  	"version_featured" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_category" "enum__noticias_v_version_category",
  	"version_faculty_id" integer,
  	"version_author" varchar,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_summary" varchar,
  	"version_content" jsonb,
  	"version_featured_image_id" integer,
  	"version_featured_image_url" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__noticias_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "paginas_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"subheading" varchar,
  	"background_image_id" integer,
  	"cta_label" varchar,
  	"cta_url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paginas_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "paginas_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"button_label" varchar,
  	"button_url" varchar,
  	"style" "enum_paginas_blocks_cta_style" DEFAULT 'primary',
  	"block_name" varchar
  );
  
  CREATE TABLE "paginas_blocks_statistics_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"icon" varchar
  );
  
  CREATE TABLE "paginas_blocks_statistics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paginas_blocks_two_column" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ratio" "enum_paginas_blocks_two_column_ratio" DEFAULT '50-50',
  	"left" jsonb,
  	"right" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "paginas_blocks_testimonials_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"role" varchar,
  	"photo_id" integer
  );
  
  CREATE TABLE "paginas_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paginas_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "paginas_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paginas_approval_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"revisor" varchar,
  	"accion" "enum_paginas_approval_history_accion",
  	"comentario" varchar,
  	"fecha" timestamp(3) with time zone
  );
  
  CREATE TABLE "paginas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"approval_status" "enum_paginas_approval_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_paginas_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_paginas_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"subheading" varchar,
  	"background_image_id" integer,
  	"cta_label" varchar,
  	"cta_url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_paginas_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_paginas_v_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"button_label" varchar,
  	"button_url" varchar,
  	"style" "enum__paginas_v_blocks_cta_style" DEFAULT 'primary',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_paginas_v_blocks_statistics_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"icon" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_paginas_v_blocks_statistics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_paginas_v_blocks_two_column" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ratio" "enum__paginas_v_blocks_two_column_ratio" DEFAULT '50-50',
  	"left" jsonb,
  	"right" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_paginas_v_blocks_testimonials_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"role" varchar,
  	"photo_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_paginas_v_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_paginas_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_paginas_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_paginas_v_version_approval_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"revisor" varchar,
  	"accion" "enum__paginas_v_version_approval_history_accion",
  	"comentario" varchar,
  	"fecha" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_paginas_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_approval_status" "enum__paginas_v_version_approval_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__paginas_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "revistas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"descripcion" varchar NOT NULL,
  	"anio_inicio" numeric NOT NULL,
  	"url_ojs" varchar NOT NULL,
  	"portada_id" integer,
  	"activa" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tesis" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"autor" varchar NOT NULL,
  	"anio" numeric NOT NULL,
  	"resumen" varchar,
  	"facultad_id" integer NOT NULL,
  	"url_pdf" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "facultades" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"descripcion" varchar,
  	"decano" varchar,
  	"email" varchar,
  	"telefono" varchar,
  	"imagen_id" integer,
  	"activa" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "carreras" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"facultad_id" integer NOT NULL,
  	"duracion" numeric NOT NULL,
  	"titulo" varchar NOT NULL,
  	"modalidad" "enum_carreras_modalidad" DEFAULT 'Presencial',
  	"descripcion" varchar,
  	"resolucion" varchar,
  	"tipo" "enum_carreras_tipo" DEFAULT 'grado',
  	"sede" varchar,
  	"activa" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "marco_legal" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"category" "enum_marco_legal_category" NOT NULL,
  	"description" varchar,
  	"file_id" integer,
  	"external_url" varchar,
  	"order" numeric DEFAULT 99,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "auditoria" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"usuario" varchar NOT NULL,
  	"rol" varchar,
  	"accion" "enum_auditoria_accion" NOT NULL,
  	"coleccion" varchar,
  	"documento" varchar,
  	"fecha_hora" timestamp(3) with time zone NOT NULL,
  	"ip" varchar,
  	"resultado" "enum_auditoria_resultado" NOT NULL,
  	"mensaje" varchar,
  	"cambios_relevantes" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "autoridades" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" varchar NOT NULL,
  	"type" "enum_autoridades_type" NOT NULL,
  	"faculty_id" integer,
  	"photo_id" integer,
  	"cv_file_id" integer,
  	"cv_url" varchar,
  	"bio" varchar,
  	"email" varchar,
  	"order" numeric DEFAULT 99,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ley5189" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"category" "enum_ley5189_category" NOT NULL,
  	"period" varchar NOT NULL,
  	"description" varchar,
  	"drive_url" varchar NOT NULL,
  	"order" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ley5282" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"category" "enum_ley5282_category" NOT NULL,
  	"period" varchar NOT NULL,
  	"description" varchar,
  	"drive_url" varchar NOT NULL,
  	"order" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "convenios" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"type" "enum_convenios_type" NOT NULL,
  	"year" numeric NOT NULL,
  	"parties" varchar NOT NULL,
  	"objective" varchar NOT NULL,
  	"signed_month" varchar,
  	"duration" varchar,
  	"drive_url" varchar,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tribunal_miembros" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"cargo" varchar NOT NULL,
  	"foto_id" integer,
  	"orden" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tribunal_documentos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"tipo" "enum_tribunal_documentos_tipo" NOT NULL,
  	"descripcion" varchar,
  	"drive_url" varchar,
  	"orden" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "aranceles_rectorado" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"concepto" varchar NOT NULL,
  	"monto" numeric NOT NULL,
  	"grupo" "enum_aranceles_rectorado_grupo" DEFAULT 'venta' NOT NULL,
  	"orden" numeric DEFAULT 99,
  	"activo" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "faqs_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar NOT NULL
  );
  
  CREATE TABLE "faqs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" jsonb NOT NULL,
  	"category" "enum_faqs_category" NOT NULL,
  	"order" numeric DEFAULT 99,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"noticias_id" integer,
  	"paginas_id" integer,
  	"revistas_id" integer,
  	"tesis_id" integer,
  	"facultades_id" integer,
  	"carreras_id" integer,
  	"marco_legal_id" integer,
  	"auditoria_id" integer,
  	"autoridades_id" integer,
  	"ley5189_id" integer,
  	"ley5282_id" integer,
  	"convenios_id" integer,
  	"tribunal_miembros_id" integer,
  	"tribunal_documentos_id" integer,
  	"aranceles_rectorado_id" integer,
  	"faqs_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "navegacion_links_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"type" "enum_navegacion_links_children_type" DEFAULT 'manual' NOT NULL,
  	"url" varchar,
  	"page_id" integer,
  	"new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "navegacion_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"type" "enum_navegacion_links_type" DEFAULT 'manual' NOT NULL,
  	"url" varchar,
  	"page_id" integer,
  	"new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "navegacion" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "transparencia_ley5189" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar,
  	"nota" varchar
  );
  
  CREATE TABLE "transparencia_ley5282" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar,
  	"nota" varchar
  );
  
  CREATE TABLE "transparencia" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "enlaces_externos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"formulario_titulos" varchar,
  	"url_portal_info_publica" varchar,
  	"contenido_info_publica" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "estadisticas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"total_estudiantes" numeric DEFAULT 4985 NOT NULL,
  	"total_docentes" numeric DEFAULT 762 NOT NULL,
  	"total_egresados" numeric DEFAULT 672 NOT NULL,
  	"total_carreras_acreditadas" numeric DEFAULT 10 NOT NULL,
  	"total_facultades" numeric DEFAULT 6 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "noticias_tags" ADD CONSTRAINT "noticias_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."noticias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "noticias_gallery" ADD CONSTRAINT "noticias_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "noticias_gallery" ADD CONSTRAINT "noticias_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."noticias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "noticias_approval_history" ADD CONSTRAINT "noticias_approval_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."noticias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "noticias" ADD CONSTRAINT "noticias_faculty_id_facultades_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."facultades"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "noticias" ADD CONSTRAINT "noticias_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_noticias_v_version_tags" ADD CONSTRAINT "_noticias_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_noticias_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_noticias_v_version_gallery" ADD CONSTRAINT "_noticias_v_version_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_noticias_v_version_gallery" ADD CONSTRAINT "_noticias_v_version_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_noticias_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_noticias_v_version_approval_history" ADD CONSTRAINT "_noticias_v_version_approval_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_noticias_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_noticias_v" ADD CONSTRAINT "_noticias_v_parent_id_noticias_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."noticias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_noticias_v" ADD CONSTRAINT "_noticias_v_version_faculty_id_facultades_id_fk" FOREIGN KEY ("version_faculty_id") REFERENCES "public"."facultades"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_noticias_v" ADD CONSTRAINT "_noticias_v_version_featured_image_id_media_id_fk" FOREIGN KEY ("version_featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paginas_blocks_hero" ADD CONSTRAINT "paginas_blocks_hero_background_image_id_media_id_fk" FOREIGN KEY ("background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paginas_blocks_hero" ADD CONSTRAINT "paginas_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_blocks_rich_text" ADD CONSTRAINT "paginas_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_blocks_cta" ADD CONSTRAINT "paginas_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_blocks_statistics_items" ADD CONSTRAINT "paginas_blocks_statistics_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas_blocks_statistics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_blocks_statistics" ADD CONSTRAINT "paginas_blocks_statistics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_blocks_two_column" ADD CONSTRAINT "paginas_blocks_two_column_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_blocks_testimonials_items" ADD CONSTRAINT "paginas_blocks_testimonials_items_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paginas_blocks_testimonials_items" ADD CONSTRAINT "paginas_blocks_testimonials_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_blocks_testimonials" ADD CONSTRAINT "paginas_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_blocks_faq_items" ADD CONSTRAINT "paginas_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_blocks_faq" ADD CONSTRAINT "paginas_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_approval_history" ADD CONSTRAINT "paginas_approval_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_hero" ADD CONSTRAINT "_paginas_v_blocks_hero_background_image_id_media_id_fk" FOREIGN KEY ("background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_hero" ADD CONSTRAINT "_paginas_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_rich_text" ADD CONSTRAINT "_paginas_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_cta" ADD CONSTRAINT "_paginas_v_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_statistics_items" ADD CONSTRAINT "_paginas_v_blocks_statistics_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v_blocks_statistics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_statistics" ADD CONSTRAINT "_paginas_v_blocks_statistics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_two_column" ADD CONSTRAINT "_paginas_v_blocks_two_column_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_testimonials_items" ADD CONSTRAINT "_paginas_v_blocks_testimonials_items_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_testimonials_items" ADD CONSTRAINT "_paginas_v_blocks_testimonials_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_testimonials" ADD CONSTRAINT "_paginas_v_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_faq_items" ADD CONSTRAINT "_paginas_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_faq" ADD CONSTRAINT "_paginas_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_version_approval_history" ADD CONSTRAINT "_paginas_v_version_approval_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v" ADD CONSTRAINT "_paginas_v_parent_id_paginas_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."paginas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "revistas" ADD CONSTRAINT "revistas_portada_id_media_id_fk" FOREIGN KEY ("portada_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tesis" ADD CONSTRAINT "tesis_facultad_id_facultades_id_fk" FOREIGN KEY ("facultad_id") REFERENCES "public"."facultades"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "facultades" ADD CONSTRAINT "facultades_imagen_id_media_id_fk" FOREIGN KEY ("imagen_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carreras" ADD CONSTRAINT "carreras_facultad_id_facultades_id_fk" FOREIGN KEY ("facultad_id") REFERENCES "public"."facultades"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "marco_legal" ADD CONSTRAINT "marco_legal_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "autoridades" ADD CONSTRAINT "autoridades_faculty_id_facultades_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."facultades"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "autoridades" ADD CONSTRAINT "autoridades_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "autoridades" ADD CONSTRAINT "autoridades_cv_file_id_media_id_fk" FOREIGN KEY ("cv_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tribunal_miembros" ADD CONSTRAINT "tribunal_miembros_foto_id_media_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "faqs_tags" ADD CONSTRAINT "faqs_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_noticias_fk" FOREIGN KEY ("noticias_id") REFERENCES "public"."noticias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_paginas_fk" FOREIGN KEY ("paginas_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_revistas_fk" FOREIGN KEY ("revistas_id") REFERENCES "public"."revistas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tesis_fk" FOREIGN KEY ("tesis_id") REFERENCES "public"."tesis"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_facultades_fk" FOREIGN KEY ("facultades_id") REFERENCES "public"."facultades"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carreras_fk" FOREIGN KEY ("carreras_id") REFERENCES "public"."carreras"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_marco_legal_fk" FOREIGN KEY ("marco_legal_id") REFERENCES "public"."marco_legal"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_auditoria_fk" FOREIGN KEY ("auditoria_id") REFERENCES "public"."auditoria"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_autoridades_fk" FOREIGN KEY ("autoridades_id") REFERENCES "public"."autoridades"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ley5189_fk" FOREIGN KEY ("ley5189_id") REFERENCES "public"."ley5189"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ley5282_fk" FOREIGN KEY ("ley5282_id") REFERENCES "public"."ley5282"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_convenios_fk" FOREIGN KEY ("convenios_id") REFERENCES "public"."convenios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tribunal_miembros_fk" FOREIGN KEY ("tribunal_miembros_id") REFERENCES "public"."tribunal_miembros"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tribunal_documentos_fk" FOREIGN KEY ("tribunal_documentos_id") REFERENCES "public"."tribunal_documentos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_aranceles_rectorado_fk" FOREIGN KEY ("aranceles_rectorado_id") REFERENCES "public"."aranceles_rectorado"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacion_links_children" ADD CONSTRAINT "navegacion_links_children_page_id_paginas_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."paginas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navegacion_links_children" ADD CONSTRAINT "navegacion_links_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navegacion_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacion_links" ADD CONSTRAINT "navegacion_links_page_id_paginas_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."paginas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navegacion_links" ADD CONSTRAINT "navegacion_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navegacion"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "transparencia_ley5189" ADD CONSTRAINT "transparencia_ley5189_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."transparencia"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "transparencia_ley5282" ADD CONSTRAINT "transparencia_ley5282_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."transparencia"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_role_idx" ON "users" USING btree ("role");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "noticias_tags_order_idx" ON "noticias_tags" USING btree ("_order");
  CREATE INDEX "noticias_tags_parent_id_idx" ON "noticias_tags" USING btree ("_parent_id");
  CREATE INDEX "noticias_gallery_order_idx" ON "noticias_gallery" USING btree ("_order");
  CREATE INDEX "noticias_gallery_parent_id_idx" ON "noticias_gallery" USING btree ("_parent_id");
  CREATE INDEX "noticias_gallery_image_idx" ON "noticias_gallery" USING btree ("image_id");
  CREATE INDEX "noticias_approval_history_order_idx" ON "noticias_approval_history" USING btree ("_order");
  CREATE INDEX "noticias_approval_history_parent_id_idx" ON "noticias_approval_history" USING btree ("_parent_id");
  CREATE INDEX "noticias_approval_status_idx" ON "noticias" USING btree ("approval_status");
  CREATE INDEX "noticias_published_at_idx" ON "noticias" USING btree ("published_at");
  CREATE INDEX "noticias_category_idx" ON "noticias" USING btree ("category");
  CREATE INDEX "noticias_faculty_idx" ON "noticias" USING btree ("faculty_id");
  CREATE UNIQUE INDEX "noticias_slug_idx" ON "noticias" USING btree ("slug");
  CREATE INDEX "noticias_featured_image_idx" ON "noticias" USING btree ("featured_image_id");
  CREATE INDEX "noticias_updated_at_idx" ON "noticias" USING btree ("updated_at");
  CREATE INDEX "noticias_created_at_idx" ON "noticias" USING btree ("created_at");
  CREATE INDEX "noticias__status_idx" ON "noticias" USING btree ("_status");
  CREATE INDEX "_noticias_v_version_tags_order_idx" ON "_noticias_v_version_tags" USING btree ("_order");
  CREATE INDEX "_noticias_v_version_tags_parent_id_idx" ON "_noticias_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX "_noticias_v_version_gallery_order_idx" ON "_noticias_v_version_gallery" USING btree ("_order");
  CREATE INDEX "_noticias_v_version_gallery_parent_id_idx" ON "_noticias_v_version_gallery" USING btree ("_parent_id");
  CREATE INDEX "_noticias_v_version_gallery_image_idx" ON "_noticias_v_version_gallery" USING btree ("image_id");
  CREATE INDEX "_noticias_v_version_approval_history_order_idx" ON "_noticias_v_version_approval_history" USING btree ("_order");
  CREATE INDEX "_noticias_v_version_approval_history_parent_id_idx" ON "_noticias_v_version_approval_history" USING btree ("_parent_id");
  CREATE INDEX "_noticias_v_parent_idx" ON "_noticias_v" USING btree ("parent_id");
  CREATE INDEX "_noticias_v_version_version_approval_status_idx" ON "_noticias_v" USING btree ("version_approval_status");
  CREATE INDEX "_noticias_v_version_version_published_at_idx" ON "_noticias_v" USING btree ("version_published_at");
  CREATE INDEX "_noticias_v_version_version_category_idx" ON "_noticias_v" USING btree ("version_category");
  CREATE INDEX "_noticias_v_version_version_faculty_idx" ON "_noticias_v" USING btree ("version_faculty_id");
  CREATE INDEX "_noticias_v_version_version_slug_idx" ON "_noticias_v" USING btree ("version_slug");
  CREATE INDEX "_noticias_v_version_version_featured_image_idx" ON "_noticias_v" USING btree ("version_featured_image_id");
  CREATE INDEX "_noticias_v_version_version_updated_at_idx" ON "_noticias_v" USING btree ("version_updated_at");
  CREATE INDEX "_noticias_v_version_version_created_at_idx" ON "_noticias_v" USING btree ("version_created_at");
  CREATE INDEX "_noticias_v_version_version__status_idx" ON "_noticias_v" USING btree ("version__status");
  CREATE INDEX "_noticias_v_created_at_idx" ON "_noticias_v" USING btree ("created_at");
  CREATE INDEX "_noticias_v_updated_at_idx" ON "_noticias_v" USING btree ("updated_at");
  CREATE INDEX "_noticias_v_latest_idx" ON "_noticias_v" USING btree ("latest");
  CREATE INDEX "paginas_blocks_hero_order_idx" ON "paginas_blocks_hero" USING btree ("_order");
  CREATE INDEX "paginas_blocks_hero_parent_id_idx" ON "paginas_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_hero_path_idx" ON "paginas_blocks_hero" USING btree ("_path");
  CREATE INDEX "paginas_blocks_hero_background_image_idx" ON "paginas_blocks_hero" USING btree ("background_image_id");
  CREATE INDEX "paginas_blocks_rich_text_order_idx" ON "paginas_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "paginas_blocks_rich_text_parent_id_idx" ON "paginas_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_rich_text_path_idx" ON "paginas_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "paginas_blocks_cta_order_idx" ON "paginas_blocks_cta" USING btree ("_order");
  CREATE INDEX "paginas_blocks_cta_parent_id_idx" ON "paginas_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_cta_path_idx" ON "paginas_blocks_cta" USING btree ("_path");
  CREATE INDEX "paginas_blocks_statistics_items_order_idx" ON "paginas_blocks_statistics_items" USING btree ("_order");
  CREATE INDEX "paginas_blocks_statistics_items_parent_id_idx" ON "paginas_blocks_statistics_items" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_statistics_order_idx" ON "paginas_blocks_statistics" USING btree ("_order");
  CREATE INDEX "paginas_blocks_statistics_parent_id_idx" ON "paginas_blocks_statistics" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_statistics_path_idx" ON "paginas_blocks_statistics" USING btree ("_path");
  CREATE INDEX "paginas_blocks_two_column_order_idx" ON "paginas_blocks_two_column" USING btree ("_order");
  CREATE INDEX "paginas_blocks_two_column_parent_id_idx" ON "paginas_blocks_two_column" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_two_column_path_idx" ON "paginas_blocks_two_column" USING btree ("_path");
  CREATE INDEX "paginas_blocks_testimonials_items_order_idx" ON "paginas_blocks_testimonials_items" USING btree ("_order");
  CREATE INDEX "paginas_blocks_testimonials_items_parent_id_idx" ON "paginas_blocks_testimonials_items" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_testimonials_items_photo_idx" ON "paginas_blocks_testimonials_items" USING btree ("photo_id");
  CREATE INDEX "paginas_blocks_testimonials_order_idx" ON "paginas_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "paginas_blocks_testimonials_parent_id_idx" ON "paginas_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_testimonials_path_idx" ON "paginas_blocks_testimonials" USING btree ("_path");
  CREATE INDEX "paginas_blocks_faq_items_order_idx" ON "paginas_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "paginas_blocks_faq_items_parent_id_idx" ON "paginas_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_faq_order_idx" ON "paginas_blocks_faq" USING btree ("_order");
  CREATE INDEX "paginas_blocks_faq_parent_id_idx" ON "paginas_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_faq_path_idx" ON "paginas_blocks_faq" USING btree ("_path");
  CREATE INDEX "paginas_approval_history_order_idx" ON "paginas_approval_history" USING btree ("_order");
  CREATE INDEX "paginas_approval_history_parent_id_idx" ON "paginas_approval_history" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "paginas_slug_idx" ON "paginas" USING btree ("slug");
  CREATE INDEX "paginas_approval_status_idx" ON "paginas" USING btree ("approval_status");
  CREATE INDEX "paginas_updated_at_idx" ON "paginas" USING btree ("updated_at");
  CREATE INDEX "paginas_created_at_idx" ON "paginas" USING btree ("created_at");
  CREATE INDEX "paginas__status_idx" ON "paginas" USING btree ("_status");
  CREATE INDEX "_paginas_v_blocks_hero_order_idx" ON "_paginas_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_hero_parent_id_idx" ON "_paginas_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_hero_path_idx" ON "_paginas_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_paginas_v_blocks_hero_background_image_idx" ON "_paginas_v_blocks_hero" USING btree ("background_image_id");
  CREATE INDEX "_paginas_v_blocks_rich_text_order_idx" ON "_paginas_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_rich_text_parent_id_idx" ON "_paginas_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_rich_text_path_idx" ON "_paginas_v_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "_paginas_v_blocks_cta_order_idx" ON "_paginas_v_blocks_cta" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_cta_parent_id_idx" ON "_paginas_v_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_cta_path_idx" ON "_paginas_v_blocks_cta" USING btree ("_path");
  CREATE INDEX "_paginas_v_blocks_statistics_items_order_idx" ON "_paginas_v_blocks_statistics_items" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_statistics_items_parent_id_idx" ON "_paginas_v_blocks_statistics_items" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_statistics_order_idx" ON "_paginas_v_blocks_statistics" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_statistics_parent_id_idx" ON "_paginas_v_blocks_statistics" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_statistics_path_idx" ON "_paginas_v_blocks_statistics" USING btree ("_path");
  CREATE INDEX "_paginas_v_blocks_two_column_order_idx" ON "_paginas_v_blocks_two_column" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_two_column_parent_id_idx" ON "_paginas_v_blocks_two_column" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_two_column_path_idx" ON "_paginas_v_blocks_two_column" USING btree ("_path");
  CREATE INDEX "_paginas_v_blocks_testimonials_items_order_idx" ON "_paginas_v_blocks_testimonials_items" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_testimonials_items_parent_id_idx" ON "_paginas_v_blocks_testimonials_items" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_testimonials_items_photo_idx" ON "_paginas_v_blocks_testimonials_items" USING btree ("photo_id");
  CREATE INDEX "_paginas_v_blocks_testimonials_order_idx" ON "_paginas_v_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_testimonials_parent_id_idx" ON "_paginas_v_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_testimonials_path_idx" ON "_paginas_v_blocks_testimonials" USING btree ("_path");
  CREATE INDEX "_paginas_v_blocks_faq_items_order_idx" ON "_paginas_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_faq_items_parent_id_idx" ON "_paginas_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_faq_order_idx" ON "_paginas_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_faq_parent_id_idx" ON "_paginas_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_faq_path_idx" ON "_paginas_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_paginas_v_version_approval_history_order_idx" ON "_paginas_v_version_approval_history" USING btree ("_order");
  CREATE INDEX "_paginas_v_version_approval_history_parent_id_idx" ON "_paginas_v_version_approval_history" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_parent_idx" ON "_paginas_v" USING btree ("parent_id");
  CREATE INDEX "_paginas_v_version_version_slug_idx" ON "_paginas_v" USING btree ("version_slug");
  CREATE INDEX "_paginas_v_version_version_approval_status_idx" ON "_paginas_v" USING btree ("version_approval_status");
  CREATE INDEX "_paginas_v_version_version_updated_at_idx" ON "_paginas_v" USING btree ("version_updated_at");
  CREATE INDEX "_paginas_v_version_version_created_at_idx" ON "_paginas_v" USING btree ("version_created_at");
  CREATE INDEX "_paginas_v_version_version__status_idx" ON "_paginas_v" USING btree ("version__status");
  CREATE INDEX "_paginas_v_created_at_idx" ON "_paginas_v" USING btree ("created_at");
  CREATE INDEX "_paginas_v_updated_at_idx" ON "_paginas_v" USING btree ("updated_at");
  CREATE INDEX "_paginas_v_latest_idx" ON "_paginas_v" USING btree ("latest");
  CREATE UNIQUE INDEX "revistas_slug_idx" ON "revistas" USING btree ("slug");
  CREATE INDEX "revistas_portada_idx" ON "revistas" USING btree ("portada_id");
  CREATE INDEX "revistas_updated_at_idx" ON "revistas" USING btree ("updated_at");
  CREATE INDEX "revistas_created_at_idx" ON "revistas" USING btree ("created_at");
  CREATE INDEX "tesis_facultad_idx" ON "tesis" USING btree ("facultad_id");
  CREATE INDEX "tesis_updated_at_idx" ON "tesis" USING btree ("updated_at");
  CREATE INDEX "tesis_created_at_idx" ON "tesis" USING btree ("created_at");
  CREATE UNIQUE INDEX "facultades_slug_idx" ON "facultades" USING btree ("slug");
  CREATE INDEX "facultades_imagen_idx" ON "facultades" USING btree ("imagen_id");
  CREATE INDEX "facultades_updated_at_idx" ON "facultades" USING btree ("updated_at");
  CREATE INDEX "facultades_created_at_idx" ON "facultades" USING btree ("created_at");
  CREATE UNIQUE INDEX "carreras_slug_idx" ON "carreras" USING btree ("slug");
  CREATE INDEX "carreras_facultad_idx" ON "carreras" USING btree ("facultad_id");
  CREATE INDEX "carreras_tipo_idx" ON "carreras" USING btree ("tipo");
  CREATE INDEX "carreras_updated_at_idx" ON "carreras" USING btree ("updated_at");
  CREATE INDEX "carreras_created_at_idx" ON "carreras" USING btree ("created_at");
  CREATE INDEX "marco_legal_file_idx" ON "marco_legal" USING btree ("file_id");
  CREATE INDEX "marco_legal_order_idx" ON "marco_legal" USING btree ("order");
  CREATE INDEX "marco_legal_active_idx" ON "marco_legal" USING btree ("active");
  CREATE INDEX "marco_legal_updated_at_idx" ON "marco_legal" USING btree ("updated_at");
  CREATE INDEX "marco_legal_created_at_idx" ON "marco_legal" USING btree ("created_at");
  CREATE INDEX "auditoria_accion_idx" ON "auditoria" USING btree ("accion");
  CREATE INDEX "auditoria_resultado_idx" ON "auditoria" USING btree ("resultado");
  CREATE INDEX "auditoria_updated_at_idx" ON "auditoria" USING btree ("updated_at");
  CREATE INDEX "auditoria_created_at_idx" ON "auditoria" USING btree ("created_at");
  CREATE INDEX "autoridades_faculty_idx" ON "autoridades" USING btree ("faculty_id");
  CREATE INDEX "autoridades_photo_idx" ON "autoridades" USING btree ("photo_id");
  CREATE INDEX "autoridades_cv_file_idx" ON "autoridades" USING btree ("cv_file_id");
  CREATE INDEX "autoridades_order_idx" ON "autoridades" USING btree ("order");
  CREATE INDEX "autoridades_active_idx" ON "autoridades" USING btree ("active");
  CREATE INDEX "autoridades_updated_at_idx" ON "autoridades" USING btree ("updated_at");
  CREATE INDEX "autoridades_created_at_idx" ON "autoridades" USING btree ("created_at");
  CREATE INDEX "ley5189_updated_at_idx" ON "ley5189" USING btree ("updated_at");
  CREATE INDEX "ley5189_created_at_idx" ON "ley5189" USING btree ("created_at");
  CREATE INDEX "ley5282_updated_at_idx" ON "ley5282" USING btree ("updated_at");
  CREATE INDEX "ley5282_created_at_idx" ON "ley5282" USING btree ("created_at");
  CREATE INDEX "convenios_type_idx" ON "convenios" USING btree ("type");
  CREATE INDEX "convenios_year_idx" ON "convenios" USING btree ("year");
  CREATE INDEX "convenios_updated_at_idx" ON "convenios" USING btree ("updated_at");
  CREATE INDEX "convenios_created_at_idx" ON "convenios" USING btree ("created_at");
  CREATE INDEX "tribunal_miembros_foto_idx" ON "tribunal_miembros" USING btree ("foto_id");
  CREATE INDEX "tribunal_miembros_orden_idx" ON "tribunal_miembros" USING btree ("orden");
  CREATE INDEX "tribunal_miembros_active_idx" ON "tribunal_miembros" USING btree ("active");
  CREATE INDEX "tribunal_miembros_updated_at_idx" ON "tribunal_miembros" USING btree ("updated_at");
  CREATE INDEX "tribunal_miembros_created_at_idx" ON "tribunal_miembros" USING btree ("created_at");
  CREATE INDEX "tribunal_documentos_tipo_idx" ON "tribunal_documentos" USING btree ("tipo");
  CREATE INDEX "tribunal_documentos_updated_at_idx" ON "tribunal_documentos" USING btree ("updated_at");
  CREATE INDEX "tribunal_documentos_created_at_idx" ON "tribunal_documentos" USING btree ("created_at");
  CREATE INDEX "aranceles_rectorado_grupo_idx" ON "aranceles_rectorado" USING btree ("grupo");
  CREATE INDEX "aranceles_rectorado_updated_at_idx" ON "aranceles_rectorado" USING btree ("updated_at");
  CREATE INDEX "aranceles_rectorado_created_at_idx" ON "aranceles_rectorado" USING btree ("created_at");
  CREATE INDEX "faqs_tags_order_idx" ON "faqs_tags" USING btree ("_order");
  CREATE INDEX "faqs_tags_parent_id_idx" ON "faqs_tags" USING btree ("_parent_id");
  CREATE INDEX "faqs_order_idx" ON "faqs" USING btree ("order");
  CREATE INDEX "faqs_active_idx" ON "faqs" USING btree ("active");
  CREATE INDEX "faqs_updated_at_idx" ON "faqs" USING btree ("updated_at");
  CREATE INDEX "faqs_created_at_idx" ON "faqs" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_noticias_id_idx" ON "payload_locked_documents_rels" USING btree ("noticias_id");
  CREATE INDEX "payload_locked_documents_rels_paginas_id_idx" ON "payload_locked_documents_rels" USING btree ("paginas_id");
  CREATE INDEX "payload_locked_documents_rels_revistas_id_idx" ON "payload_locked_documents_rels" USING btree ("revistas_id");
  CREATE INDEX "payload_locked_documents_rels_tesis_id_idx" ON "payload_locked_documents_rels" USING btree ("tesis_id");
  CREATE INDEX "payload_locked_documents_rels_facultades_id_idx" ON "payload_locked_documents_rels" USING btree ("facultades_id");
  CREATE INDEX "payload_locked_documents_rels_carreras_id_idx" ON "payload_locked_documents_rels" USING btree ("carreras_id");
  CREATE INDEX "payload_locked_documents_rels_marco_legal_id_idx" ON "payload_locked_documents_rels" USING btree ("marco_legal_id");
  CREATE INDEX "payload_locked_documents_rels_auditoria_id_idx" ON "payload_locked_documents_rels" USING btree ("auditoria_id");
  CREATE INDEX "payload_locked_documents_rels_autoridades_id_idx" ON "payload_locked_documents_rels" USING btree ("autoridades_id");
  CREATE INDEX "payload_locked_documents_rels_ley5189_id_idx" ON "payload_locked_documents_rels" USING btree ("ley5189_id");
  CREATE INDEX "payload_locked_documents_rels_ley5282_id_idx" ON "payload_locked_documents_rels" USING btree ("ley5282_id");
  CREATE INDEX "payload_locked_documents_rels_convenios_id_idx" ON "payload_locked_documents_rels" USING btree ("convenios_id");
  CREATE INDEX "payload_locked_documents_rels_tribunal_miembros_id_idx" ON "payload_locked_documents_rels" USING btree ("tribunal_miembros_id");
  CREATE INDEX "payload_locked_documents_rels_tribunal_documentos_id_idx" ON "payload_locked_documents_rels" USING btree ("tribunal_documentos_id");
  CREATE INDEX "payload_locked_documents_rels_aranceles_rectorado_id_idx" ON "payload_locked_documents_rels" USING btree ("aranceles_rectorado_id");
  CREATE INDEX "payload_locked_documents_rels_faqs_id_idx" ON "payload_locked_documents_rels" USING btree ("faqs_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "navegacion_links_children_order_idx" ON "navegacion_links_children" USING btree ("_order");
  CREATE INDEX "navegacion_links_children_parent_id_idx" ON "navegacion_links_children" USING btree ("_parent_id");
  CREATE INDEX "navegacion_links_children_page_idx" ON "navegacion_links_children" USING btree ("page_id");
  CREATE INDEX "navegacion_links_order_idx" ON "navegacion_links" USING btree ("_order");
  CREATE INDEX "navegacion_links_parent_id_idx" ON "navegacion_links" USING btree ("_parent_id");
  CREATE INDEX "navegacion_links_page_idx" ON "navegacion_links" USING btree ("page_id");
  CREATE INDEX "transparencia_ley5189_order_idx" ON "transparencia_ley5189" USING btree ("_order");
  CREATE INDEX "transparencia_ley5189_parent_id_idx" ON "transparencia_ley5189" USING btree ("_parent_id");
  CREATE INDEX "transparencia_ley5282_order_idx" ON "transparencia_ley5282" USING btree ("_order");
  CREATE INDEX "transparencia_ley5282_parent_id_idx" ON "transparencia_ley5282" USING btree ("_parent_id");`)
}

// DEP-07: tablas raíz donde vive contenido o cuentas reales. Se excluyen a propósito las
// tablas hijas (arrays/bloques/_rels, sin fila no existen sin su padre por FK ON DELETE CASCADE)
// y las volátiles (users_sessions, payload_locked_documents*, payload_preferences*, payload_kv,
// payload_migrations), cuyo contenido es desechable. Los globals (navegacion, transparencia,
// enlaces_externos, estadisticas) sí cuentan: una sola fila ya es contenido editorial.
export const DEP07_DATA_TABLES = [
  'users', 'media', 'noticias', '_noticias_v', 'paginas', '_paginas_v', 'revistas', 'tesis',
  'facultades', 'carreras', 'marco_legal', 'auditoria', 'autoridades', 'ley5189', 'ley5282',
  'convenios', 'tribunal_miembros', 'tribunal_documentos', 'aranceles_rectorado', 'faqs',
  'navegacion', 'transparencia', 'enlaces_externos', 'estadisticas',
] as const

/**
 * DEP-07 (C6): `down` solo ejecuta sobre una BD sin contenido.
 * Amenaza: un `migrate:down`/`reset`/`refresh`/`fresh` accidental en producción borraría las 64
 * tablas con CASCADE. Este down NUNCA corre en el deploy automático (deploy.yml no lo invoca);
 * es una herramienta de desarrollo/CI sobre BD sintética.
 * Límite: protege solo las tablas de DEP07_DATA_TABLES; no sustituye un pg_dump previo.
 */
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Precondición antes de cualquier borrado: si alguna tabla de datos tiene filas, abortar.
  const nonEmpty: string[] = []
  for (const table of DEP07_DATA_TABLES) {
    const exists = await db.execute(sql.raw(`SELECT to_regclass('public."${table}"') IS NOT NULL AS ok`))
    const existsRows = (exists as { rows?: Array<{ ok?: unknown }> }).rows ?? []
    if (existsRows[0]?.ok !== true) continue
    const res = await db.execute(sql.raw(`SELECT count(*)::int AS n FROM (SELECT 1 FROM "public"."${table}" LIMIT 1) s`))
    const resRows = (res as { rows?: Array<{ n?: unknown }> }).rows ?? []
    if (Number(resRows[0]?.n ?? 0) > 0) nonEmpty.push(table)
  }
  if (nonEmpty.length > 0) {
    throw new Error(
      `DEP-07: down rechazado, hay filas en: ${nonEmpty.join(', ')}. ` +
        'Solo se permite sobre una BD vacía; haga un pg_dump verificado y vacíe la BD de forma explícita.',
    )
  }
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "noticias_tags" CASCADE;
  DROP TABLE "noticias_gallery" CASCADE;
  DROP TABLE "noticias_approval_history" CASCADE;
  DROP TABLE "noticias" CASCADE;
  DROP TABLE "_noticias_v_version_tags" CASCADE;
  DROP TABLE "_noticias_v_version_gallery" CASCADE;
  DROP TABLE "_noticias_v_version_approval_history" CASCADE;
  DROP TABLE "_noticias_v" CASCADE;
  DROP TABLE "paginas_blocks_hero" CASCADE;
  DROP TABLE "paginas_blocks_rich_text" CASCADE;
  DROP TABLE "paginas_blocks_cta" CASCADE;
  DROP TABLE "paginas_blocks_statistics_items" CASCADE;
  DROP TABLE "paginas_blocks_statistics" CASCADE;
  DROP TABLE "paginas_blocks_two_column" CASCADE;
  DROP TABLE "paginas_blocks_testimonials_items" CASCADE;
  DROP TABLE "paginas_blocks_testimonials" CASCADE;
  DROP TABLE "paginas_blocks_faq_items" CASCADE;
  DROP TABLE "paginas_blocks_faq" CASCADE;
  DROP TABLE "paginas_approval_history" CASCADE;
  DROP TABLE "paginas" CASCADE;
  DROP TABLE "_paginas_v_blocks_hero" CASCADE;
  DROP TABLE "_paginas_v_blocks_rich_text" CASCADE;
  DROP TABLE "_paginas_v_blocks_cta" CASCADE;
  DROP TABLE "_paginas_v_blocks_statistics_items" CASCADE;
  DROP TABLE "_paginas_v_blocks_statistics" CASCADE;
  DROP TABLE "_paginas_v_blocks_two_column" CASCADE;
  DROP TABLE "_paginas_v_blocks_testimonials_items" CASCADE;
  DROP TABLE "_paginas_v_blocks_testimonials" CASCADE;
  DROP TABLE "_paginas_v_blocks_faq_items" CASCADE;
  DROP TABLE "_paginas_v_blocks_faq" CASCADE;
  DROP TABLE "_paginas_v_version_approval_history" CASCADE;
  DROP TABLE "_paginas_v" CASCADE;
  DROP TABLE "revistas" CASCADE;
  DROP TABLE "tesis" CASCADE;
  DROP TABLE "facultades" CASCADE;
  DROP TABLE "carreras" CASCADE;
  DROP TABLE "marco_legal" CASCADE;
  DROP TABLE "auditoria" CASCADE;
  DROP TABLE "autoridades" CASCADE;
  DROP TABLE "ley5189" CASCADE;
  DROP TABLE "ley5282" CASCADE;
  DROP TABLE "convenios" CASCADE;
  DROP TABLE "tribunal_miembros" CASCADE;
  DROP TABLE "tribunal_documentos" CASCADE;
  DROP TABLE "aranceles_rectorado" CASCADE;
  DROP TABLE "faqs_tags" CASCADE;
  DROP TABLE "faqs" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "navegacion_links_children" CASCADE;
  DROP TABLE "navegacion_links" CASCADE;
  DROP TABLE "navegacion" CASCADE;
  DROP TABLE "transparencia_ley5189" CASCADE;
  DROP TABLE "transparencia_ley5282" CASCADE;
  DROP TABLE "transparencia" CASCADE;
  DROP TABLE "enlaces_externos" CASCADE;
  DROP TABLE "estadisticas" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_noticias_approval_history_accion";
  DROP TYPE "public"."enum_noticias_approval_status";
  DROP TYPE "public"."enum_noticias_category";
  DROP TYPE "public"."enum_noticias_status";
  DROP TYPE "public"."enum__noticias_v_version_approval_history_accion";
  DROP TYPE "public"."enum__noticias_v_version_approval_status";
  DROP TYPE "public"."enum__noticias_v_version_category";
  DROP TYPE "public"."enum__noticias_v_version_status";
  DROP TYPE "public"."enum_paginas_blocks_cta_style";
  DROP TYPE "public"."enum_paginas_blocks_two_column_ratio";
  DROP TYPE "public"."enum_paginas_approval_history_accion";
  DROP TYPE "public"."enum_paginas_approval_status";
  DROP TYPE "public"."enum_paginas_status";
  DROP TYPE "public"."enum__paginas_v_blocks_cta_style";
  DROP TYPE "public"."enum__paginas_v_blocks_two_column_ratio";
  DROP TYPE "public"."enum__paginas_v_version_approval_history_accion";
  DROP TYPE "public"."enum__paginas_v_version_approval_status";
  DROP TYPE "public"."enum__paginas_v_version_status";
  DROP TYPE "public"."enum_carreras_modalidad";
  DROP TYPE "public"."enum_carreras_tipo";
  DROP TYPE "public"."enum_marco_legal_category";
  DROP TYPE "public"."enum_auditoria_accion";
  DROP TYPE "public"."enum_auditoria_resultado";
  DROP TYPE "public"."enum_autoridades_type";
  DROP TYPE "public"."enum_ley5189_category";
  DROP TYPE "public"."enum_ley5282_category";
  DROP TYPE "public"."enum_convenios_type";
  DROP TYPE "public"."enum_tribunal_documentos_tipo";
  DROP TYPE "public"."enum_aranceles_rectorado_grupo";
  DROP TYPE "public"."enum_faqs_category";
  DROP TYPE "public"."enum_navegacion_links_children_type";
  DROP TYPE "public"."enum_navegacion_links_type";`)
}
