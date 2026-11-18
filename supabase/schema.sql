-- IMPORTANTE: el proyecto Supabase ya tenía las tablas restaurants, tables,
-- products, orders y order_items antes de conectar ChatGPT.
-- NO ejecutar el esquema inicial de noviembre 2026 sobre este proyecto:
-- sus estructuras y estados no corresponden con el esquema real.
--
-- La migración efectiva ya se aplicó mediante la conexión oficial de Supabase:
-- taplygt_secure_orders_existing_schema
--
-- Se añadieron:
-- public.restaurant_staff
-- public.orders.notes
-- políticas RLS para personal
-- public.taplygt_resolve_table(p_token uuid)
-- public.taplygt_create_order(p_token uuid,p_lines jsonb,p_notes text)
--
-- Para revisar estado del proyecto:
select name, id from public.restaurants;
select table_number,is_active from public.tables order by table_number;
select count(*) as productos from public.products;
select count(*) as pedidos from public.orders;
