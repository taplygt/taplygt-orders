# Taplygt Orders — MVP 0.2 (demostración)

Menú digital para un restaurante piloto en Guatemala, con carrito por mesa y un panel local de pedidos.

## Estado actual

- El menú carga productos disponibles desde **Supabase** (tabla `products`) mediante una clave pública.
- El carrito utiliza los identificadores reales de los productos, incluyendo IDs de texto/UUID.
- Al confirmar, se guarda una **copia de demostración del pedido** en el `localStorage` del navegador, con nombre, cantidad y precio del producto en ese momento.
- La vista restaurante muestra el total, notas y estados (Recibido, Preparando, Listo y Entregado).
- Los datos del pedido se muestran usando elementos de texto, sin insertar contenido del cliente como HTML.
- La vista cliente y el panel del restaurante comparten datos **solo dentro del mismo navegador y origen**. Otra computadora, otro celular o una sesión privada no verá esas órdenes.

## Cómo probar

1. Abre `index.html` a través de un servidor local o del sitio desplegado.
2. Verifica que el menú cargue productos desde Supabase (se necesita conexión y una política de lectura autorizada).
3. Selecciona una mesa, agrega productos y confirma el pedido.
4. Abre **Vista restaurante** en el mismo navegador para revisar el pedido y cambiar su estado.

## Precauciones importantes

**Esta versión no es apta para recibir pedidos reales.** No transmite órdenes a la cocina, no sincroniza datos entre dispositivos y no cobra tarjetas. Los precios en el navegador son solo informativos; deben validarse en el servidor antes de aceptar un pedido real. El panel aún no requiere autenticación.

La clave `sb_publishable_...` es pública por diseño, pero Supabase debe tener políticas RLS seguras. Nunca incluyas una clave secreta o `service_role` en archivos visibles desde el navegador.

## Próxima fase para restaurante piloto

1. Crear tablas `restaurants`, `tables`, `products`, `orders` y `order_items` con RLS.
2. Implementar una función de servidor que cree pedidos y recalcule importes desde productos vigentes; no confiar en el total enviado por el cliente.
3. Agregar autenticación al personal y limitar el acceso a los pedidos del restaurante correspondiente.
4. Sincronizar cambios de estado en tiempo real entre clientes y panel de cocina.
5. Emitir un QR por mesa con un enlace seguro y un identificador de mesa validado.
6. Añadir cobros solamente tras integrar y validar un proveedor de pagos.

## Archivos

- `index.html`: página de demostración.
- `css/styles.css`: estilos.
- `js/menu.js`: catálogo ficticio antiguo, conservado como referencia.
- `js/supabase.js`: lectura pública de productos.
- `js/app.js`: carga del menú.
- `js/cart.js`: carrito de compras.
- `js/orders.js`: órdenes locales de demostración.
- `admin/index.html`: enlace informativo al panel integrado.
