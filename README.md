# Taplygt Orders — MVP conectado a Supabase

**Código implementado:** menú digital, carrito, creación de pedidos a través de RPC con precios validados en Supabase, panel privado del restaurante, cambios de estado y actualización automática entre dispositivos (consulta cada 5 segundos).

**Estado del despliegue:** el código está publicado en GitHub, pero **la base de datos aún requiere ejecutar `supabase/schema.sql` en el proyecto Supabase**. No se afirma que el flujo funcione en producción hasta completar la configuración y probar con dos dispositivos.

## Activación (obligatoria)

1. Entra al proyecto Supabase que usa `js/supabase.js`.
2. Abre **SQL Editor** y ejecuta **todo** `supabase/schema.sql`. Antes, revisa/respáldate de las políticas y datos existentes de `public.products`. El script agrega `restaurant_id` a los productos y asigna los registros sin restaurante a `piloto`.
3. Comprueba que existen el restaurante `piloto` y las mesas 1 a 5. Verifica que la tabla `products` contiene las columnas `id`, `name`, `description`, `category`, `price`, `is_available`.
4. En **Supabase Authentication > Users**, crea o invita un usuario real para el encargado del restaurante. En **SQL Editor**, asigna acceso con esta consulta reemplazando el correo:
   ```sql
   insert into public.restaurant_staff(user_id, restaurant_id)
   select u.id, r.id from auth.users u cross join public.restaurants r
   where u.email = 'encargado@ejemplo.com' and r.slug = 'piloto'
   on conflict do nothing;
   ```
5. Activa un hosting HTTPS, por ejemplo GitHub Pages (en **Settings > Pages** del repositorio), o usa un servidor local. Recuerda que el repositorio actualmente es **privado**: verifica la elegibilidad del plan/visibilidad para Pages.
6. Abre la raíz del sitio: selecciona una mesa, agrega productos y confirma. Desde **otro dispositivo**, inicia sesión en `/admin/` con la cuenta del encargado. Los pedidos se consultan automáticamente cada cinco segundos.
7. Para QR por mesa usa enlaces como `https://TU-SITIO/?mesa=1` hasta `?mesa=5`. El selector de mesa del menú se ajusta al parámetro URL. **El número de mesa en el QR no es una credencial de seguridad**.

## Arquitectura

- `index.html` + `js/app.js` + `js/cart.js`: menú y carrito del cliente.
- `js/supabase.js`: conexión al proyecto y llamadas al RPC.
- `js/orders.js`: creación del pedido en Supabase, sin localStorage.
- `admin/index.html` + `js/admin.js`: acceso de personal mediante Supabase Auth, consulta de órdenes autorizadas y actualización de estados.
- `supabase/schema.sql`: restaurantes, mesas, personal, pedidos, renglones, RLS y función segura `taplygt_create_order`.

## Seguridad y límites actuales

- La API verifica existencia y disponibilidad de cada producto y **recalcula importes en el servidor**, sin confiar en precios manipulados por el cliente.
- Los pedidos no se pueden consultar públicamente y el personal solo accede a los de su restaurante mediante RLS.
- Solo los usuarios previamente asignados en `restaurant_staff` pueden administrar pedidos.
- La clave `sb_publishable_...` es una clave pública adecuada para frontend **siempre que RLS esté bien configurado**. Nunca publiques la `service_role` ni claves secretas.
- No hay pagos en línea. El botón indica **pagar en caja**.
- **Antes de operar con clientes reales:** implementar protección contra spam/rate limiting en el endpoint de pedidos, validar el mecanismo QR contra usos fuera del local, realizar pruebas integrales, configurar backups/monitoreo y auditar políticas RLS preexistentes, incluyendo `products`.
- La actualización es por **polling**, no Supabase Realtime. El panel muestra los últimos 100 pedidos por restaurante.
- No hay integración con impresora de cocina, proveedores de pago o fiscalización.
- El servidor puede crear más de un pedido si el cliente reintenta manualmente después de una pérdida de conexión. Añadir una clave de idempotencia antes de uso comercial.

## Prueba mínima de aceptación

- Una cuenta sin permiso no ve el panel ni pedidos.
- Un cliente crea pedido desde el celular en mesa 3 y el encargado lo ve desde otro dispositivo.
- El encargado cambia `Recibido` a `Preparando`, `Listo` y `Entregado`.
- Enviar un precio diferente en el navegador **no** altera el total de Supabase.
- Enviar un ID de producto inexistente o una cantidad negativa devuelve error y no crea pedido.
