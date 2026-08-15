/* ==========================================================================
   ModularBox — Base de datos de compras (Supabase)
   ==========================================================================
   CÓMO USARLO:
   1. Crea un proyecto gratis en https://supabase.com
   2. Abre "SQL Editor" en el panel de Supabase.
   3. Pega TODO este archivo y haz clic en "Run".
   4. Copia de "Project Settings > API":
      - "Project URL"   → variable SUPABASE_URL (Vercel)
      - "service_role"  → variable SUPABASE_SERVICE_ROLE_KEY (Vercel, ¡secreta!)
   ==========================================================================

   CÓMO FUNCIONA:
   - "ordenes"  : cada compra en curso (pendiente de pago). Guarda los folios
                  generados pero NO cuenta todavía para el sorteo.
   - "compras"  : SOLO se insertan filas cuando el pago fue APROBADO en
                  MercadoPago. Cada fila = 1 ticket = 1 folio válido.
                  El servidor (Vercel) escribe con la service role key.
   ========================================================================== */

-- Tabla de ordenes (compras en curso, antes de confirmar el pago)
create table if not exists public.ordenes (
  orden text primary key,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado', 'rechazado')),
  nombre text not null,
  correo text not null,
  telefono text not null,
  tickets text not null,
  total integer not null,
  folios jsonb not null default '[]',
  mp_payment_id text,
  fecha timestamptz not null default now()
);

-- Tabla de compras confirmadas (un folio por fila, insertada tras el pago)
create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  orden text,
  folio text not null unique,
  nombre text not null,
  correo text not null,
  telefono text not null,
  tickets text not null,
  total integer not null,
  fecha timestamptz not null default now()
);

-- Para tablas ya creadas con el esquema anterior: agrega la columna "orden".
alter table public.compras add column if not exists orden text;

-- Índice para buscar rápido por folio (comprobante del sorteo)
create index if not exists compras_folio_idx on public.compras (folio);

-- Seguridad: nadie puede leer ni borrar desde la web. Solo el servidor
-- (service role key, guardada en Vercel) escribe en ambas tablas.
alter table public.compras enable row level security;
alter table public.ordenes enable row level security;

-- Elimina la política antigua que permitía insertar desde el navegador.
drop policy if exists "Permitir insertar compras anonimas" on public.compras;

-- Sin políticas: el servicio (service_role) las omite y anon queda bloqueado.
