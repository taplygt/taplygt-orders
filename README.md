# Taplygt Orders — MVP 0.1

Prototipo de menú digital y pedidos para un restaurante piloto en Guatemala.

## Cómo probarlo

Abre `index.html` en tu navegador. Elige mesa, agrega productos y confirma. Luego abre la pestaña **Vista restaurante** para revisar y actualizar estados.

## Importante

Los pedidos solo se almacenan en `localStorage` del mismo navegador. **No** se sincronizan entre dispositivos, no se envían a una cocina real y no se procesan pagos. No usar para atender pedidos reales.

## Archivos

- `index.html`: vista cliente y demo del panel.
- `css/styles.css`: estilos.
- `js/menu.js`: catálogo ficticio.
- `js/cart.js`: carrito e interfaz.
- `js/orders.js`: pedidos locales.
- `js/app.js`: inicio de la aplicación.
- `admin/index.html`: acceso informativo al panel.

## Próxima fase

Crear proyecto Supabase, esquema de mesas/productos/pedidos, funciones seguras para generar pedidos con precios validados en servidor, autenticación del personal y panel con actualización en tiempo real. Nunca poner claves secretas o `service_role` en archivos públicos.
