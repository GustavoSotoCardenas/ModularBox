/* ==========================================================================
   ModularBox — Base de datos de compras (Supabase)
   ==========================================================================
   CÓMO USARLO:
   1. Crea un proyecto gratis en https://supabase.com
   2. Abre "SQL Editor" en el panel de Supabase.
   3. Pega TODO este archivo y haz clic en "Run" (crea la tabla "compras").
   4. Ve a "Project Settings > API" y copia el "Project URL" y la
      "anon public key" en js/participar.js.
   ========================================================================== */

-- Tabla de compras del Gran Sorteo
create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique,
  nombre text not null,
  correo text not null,
  telefono text not null,
  tickets text not null,
  total integer not null,
  fecha timestamptz not null default now()
);

-- Índice para buscar rápido por folio (comprobante del sorteo)
create index if not exists compras_folio_idx on public.compras (folio);

-- Seguridad: solo se puede INSERTAR desde el sitio.
-- Nadie puede leer ni borrar registros desde la web (los ves tú desde el panel).
alter table public.compras enable row level security;

create policy "Permitir insertar compras anonimas"
on public.compras
for insert
to anon
with check (true);
