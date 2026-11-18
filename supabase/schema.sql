-- Taplygt Orders: ejecutar en Supabase SQL Editor una sola vez.
-- Conserva la tabla public.products existente (id, name, description, category, price, is_available).
create extension if not exists pgcrypto;

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);
insert into public.restaurants (slug, name) values ('piloto', 'Restaurante piloto')
on conflict (slug) do nothing;

alter table public.products add column if not exists restaurant_id uuid references public.restaurants(id);
update public.products set restaurant_id = (select id from public.restaurants where slug = 'piloto')
where restaurant_id is null;
create index if not exists idx_taplygt_products_restaurant on public.products (restaurant_id);

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id),
  table_number integer not null check (table_number between 1 and 999),
  active boolean not null default true,
  unique (restaurant_id, table_number)
);
insert into public.restaurant_tables (restaurant_id, table_number)
select r.id, n from public.restaurants r cross join generate_series(1, 5) n
where r.slug = 'piloto'
on conflict (restaurant_id, table_number) do nothing;

create table if not exists public.restaurant_staff (
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  primary key (user_id, restaurant_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id),
  table_id uuid not null references public.restaurant_tables(id),
  status text not null default 'Recibido'
    check (status in ('Recibido','Preparando','Listo','Entregado','Cancelado')),
  notes text not null default '' check (char_length(notes) <= 150),
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_taplygt_orders_restaurant_created
  on public.orders(restaurant_id, created_at desc);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  quantity integer not null check (quantity between 1 and 20),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0)
);
create index if not exists idx_taplygt_items_order on public.order_items(order_id);

alter table public.restaurants enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.restaurant_staff enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.products enable row level security;

-- Datos públicos mínimos para construir menú y QR; el personal solo ve su restaurante.
drop policy if exists taplygt_restaurants_read on public.restaurants;
create policy taplygt_restaurants_read on public.restaurants for select to anon, authenticated using (true);
drop policy if exists taplygt_tables_read on public.restaurant_tables;
create policy taplygt_tables_read on public.restaurant_tables for select to anon, authenticated using (active = true);
drop policy if exists taplygt_products_read on public.products;
create policy taplygt_products_read on public.products for select to anon, authenticated using (is_available = true);
drop policy if exists taplygt_staff_self on public.restaurant_staff;
create policy taplygt_staff_self on public.restaurant_staff for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists taplygt_orders_staff_read on public.orders;
create policy taplygt_orders_staff_read on public.orders for select to authenticated using
  (exists (select 1 from public.restaurant_staff s where s.user_id = (select auth.uid()) and s.restaurant_id = orders.restaurant_id));
drop policy if exists taplygt_orders_staff_update on public.orders;
create policy taplygt_orders_staff_update on public.orders for update to authenticated
  using (exists (select 1 from public.restaurant_staff s where s.user_id = (select auth.uid()) and s.restaurant_id = orders.restaurant_id))
  with check (exists (select 1 from public.restaurant_staff s where s.user_id = (select auth.uid()) and s.restaurant_id = orders.restaurant_id));
drop policy if exists taplygt_items_staff_read on public.order_items;
create policy taplygt_items_staff_read on public.order_items for select to authenticated using
  (exists (
    select 1 from public.orders o join public.restaurant_staff s on s.restaurant_id = o.restaurant_id
    where o.id = order_items.order_id and s.user_id = (select auth.uid())
  ));

-- Ningún navegador puede insertar pedidos directamente. El RPC valida el menú y calcula precios.
revoke all on public.orders, public.order_items, public.restaurant_staff from anon, authenticated;
grant select on public.orders, public.order_items, public.restaurant_staff to authenticated;
grant update (status) on public.orders to authenticated;
grant select on public.restaurants, public.restaurant_tables, public.products to anon, authenticated;

create or replace function public.taplygt_create_order(
  p_restaurant_id uuid, p_table_number integer, p_lines jsonb, p_notes text default ''
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_table_id uuid;
  v_line jsonb;
  v_product record;
  v_qty integer;
  v_total numeric(12,2) := 0;
  v_order_id uuid;
begin
  if p_restaurant_id is null or p_table_number is null then
    raise exception 'Restaurante o mesa inválida';
  end if;
  select id into v_table_id from public.restaurant_tables
  where restaurant_id = p_restaurant_id and table_number = p_table_number and active = true;
  if v_table_id is null then raise exception 'Mesa no disponible'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or
     jsonb_array_length(p_lines) not between 1 and 30 then
    raise exception 'El pedido debe contener entre 1 y 30 líneas';
  end if;
  if char_length(coalesce(p_notes, '')) > 150 then raise exception 'Notas demasiado largas'; end if;

  -- Validamos completamente antes de insertar.
  for v_line in select value from jsonb_array_elements(p_lines) loop
    if jsonb_typeof(v_line) <> 'object' or
       coalesce(v_line->>'id','') = '' or
       coalesce(v_line->>'qty','') !~ '^[0-9]{1,2}$' then
      raise exception 'Producto o cantidad inválidos';
    end if;
    v_qty := (v_line->>'qty')::integer;
    if v_qty < 1 or v_qty > 20 then raise exception 'Cantidad fuera de rango'; end if;
    select p.id::text as id, p.name, p.price into v_product from public.products p
      where p.id::text = v_line->>'id'
        and p.restaurant_id = p_restaurant_id and p.is_available = true;
    if not found or v_product.price is null or v_product.price < 0 then
      raise exception 'Producto no disponible';
    end if;
    v_total := v_total + (v_product.price * v_qty);
  end loop;

  if v_total > 9999999999.99 then raise exception 'Total fuera de rango'; end if;
  insert into public.orders (restaurant_id, table_id, notes, total)
  values (p_restaurant_id, v_table_id, coalesce(p_notes,''), v_total)
  returning id into v_order_id;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_qty := (v_line->>'qty')::integer;
    select p.id::text as id, p.name, p.price into v_product from public.products p
      where p.id::text = v_line->>'id' and p.restaurant_id = p_restaurant_id and p.is_available = true;
    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
    values (v_order_id, v_product.id, v_product.name, v_qty, v_product.price, v_product.price * v_qty);
  end loop;
  return jsonb_build_object('id', v_order_id, 'total', v_total, 'status', 'Recibido');
end;
$$;
revoke all on function public.taplygt_create_order(uuid, integer, jsonb, text) from public;
grant execute on function public.taplygt_create_order(uuid, integer, jsonb, text) to anon, authenticated;

-- Para conceder acceso al personal, crear primero la cuenta en Supabase Auth > Users
-- y ejecutar manualmente (reemplazar el correo):
-- insert into public.restaurant_staff(user_id,restaurant_id)
-- select u.id,r.id from auth.users u cross join public.restaurants r
-- where u.email = 'personal@ejemplo.com' and r.slug = 'piloto'
-- on conflict do nothing;
--
-- IMPORTANTE: antes de abrir el servicio a público, implementar rate limiting,
-- controles anti-spam y revisión de políticas RLS existentes de products.
