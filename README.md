# Taplygt Orders — piloto con Supabase conectado

El repositorio corresponde a la base de datos **taplygt-orders**, proyecto `pzwirecozfwmwduhmwyp`. El esquema original ya existía antes del desarrollo; fue adaptado sin reemplazar las tablas.

## Estado confirmado
- Migración `taplygt_secure_orders_existing_schema` aplicada correctamente en Supabase.
- Tablas existentes: `restaurants`, `tables`, `products`, `orders`, `order_items`.
- Tabla nueva: `restaurant_staff`.
- Funciones RPC `taplygt_resolve_table` y `taplygt_create_order`.
- La función de pedidos se probó con una inserción **dentro de una transacción revertida**; el servidor calculó Q45 correctamente.
- Las órdenes reales usan `pending`, `accepted`, `preparing`, `ready`, `delivered`, `cancelled`. El panel las traduce al español.
- El total se determina en Supabase, no en JavaScript.

## Cómo activar el piloto
1. Publica el sitio mediante hosting HTTPS (GitHub Pages, si tu plan/repositorio lo permite, u otro servicio).
2. Genera un enlace por mesa usando su `qr_token` de `public.tables`. Ejemplo: `https://TU-DOMINIO/?mesa_token=TOKEN_DE_MESA`. **No uses `?mesa=1`**: el código real usa un token UUID.
3. Accede al menú desde el QR; el selector mostrará la mesa asignada por Supabase.
4. En **Supabase Auth > Users**, crea un usuario del restaurante y asígnale permiso con SQL, cambiando el correo por el suyo:

```sql
insert into public.restaurant_staff(user_id,restaurant_id)
select u.id,r.id from auth.users u cross join public.restaurants r
where u.email='ENCARGADO@EJEMPLO.COM' and r.name='Taplygt Demo'
on conflict do nothing;
```

5. Abre `/admin/` desde otro dispositivo e inicia sesión con la cuenta autorizada. El panel consulta pedidos cada cinco segundos.

## Verificaciones antes de abrir al público
- Probar el flujo extremo a extremo desde dos dispositivos en el sitio publicado.
- Confirmar que RLS protege órdenes, productos y cuentas, y que el login funciona.
- Añadir protección contra pedidos falsos y abuso del endpoint RPC (rate limits, captcha u otra barrera).
- Implementar idempotencia para evitar pedidos duplicados cuando hay errores de red.
- Definir gestión de turnos, cuentas y protección frente a QR copiados.
- No se procesan pagos online ni se envían órdenes a una impresora de cocina.

## Seguridad
Los clientes públicos **no** tienen acceso directo de lectura a pedidos ni escritura en tablas de órdenes. El RPC público crea pedidos únicamente con tokens de mesa válidos y precios del catálogo. Las funciones `SECURITY DEFINER` públicas están permitidas intencionadamente para el piloto, pero el auditor las marca y **deben recibir controles antiabuso** antes de producción. La clave `sb_publishable_...` es apta para cliente; nunca publicar `service_role`.

El archivo `supabase/schema.sql` ya no recrea tablas: documenta el esquema real. La migración aplicada se registra en Supabase.

## Verificación del 18 de noviembre de 2026

- Prueba de inserción pública con rol `anon`: **correcta**. Se recibió total Q45 y estado `pending` en una transacción revertida.
- Prueba de límite: 3 pedidos temporales fueron admitidos y un cuarto fue rechazado; se revirtieron todos.
- Acceso público directo a `orders`: **denegado**.
- Archivos JavaScript comprobados sintácticamente.
- Panel con enlaces de mesa visibles solo para personal autenticado, y actualización automática cada cinco segundos.
- Usuarios Auth existentes: **0**, cuentas de personal: **0** (todavía no se puede probar login).
- El repositorio privado contiene `.github/workflows/deploy-pages.yml`, pero aún se debe habilitar GitHub Pages en **Settings → Pages → Source: GitHub Actions**. Publicación no confirmada.

### Dos acciones de propietario necesarias
1. En [Supabase Auth > Users](https://supabase.com/dashboard/project/pzwirecozfwmwduhmwyp/auth/users) crea una cuenta del encargado con correo y contraseña elegidos por ti. No compartas contraseñas en el chat. Luego asignaremos el correo a `restaurant_staff` con SQL para habilitar el panel.
2. En [GitHub Pages Settings](https://github.com/taplygt/taplygt-orders/settings/pages) selecciona **GitHub Actions** como origen y habilita Pages, si tu plan admite Pages para repositorios privados. Alternativamente, configura un hosting estático HTTPS.

**NO USAR PARA CLIENTES REALES TODAVÍA:** la defensa contra abuso es un límite básico por mesa, no una protección integral contra pedidos falsos. Los códigos QR son portadores de acceso y se pueden compartir. Hace falta probar el sitio desplegado y el acceso del personal antes del piloto.

## Panel de operaciones — actualización del 18 de noviembre de 2026

Se renovó `admin/index.html`, `js/admin.js` y `css/styles.css`.

- Interfaz adaptativa para escritorio, tablet y teléfono con tarjetas de pedidos.
- Resumen de pedidos nuevos, aceptados/en preparación, listos y entregados (dentro de las últimas 100 órdenes consultadas).
- Filtros por activos, nuevos, en proceso, listos, entregados y todos.
- Acciones rápidas: aceptar, comenzar preparación, marcar listo y marcar entregado. Cancelar solicita confirmación.
- Cada cambio de estado se envía a Supabase con condición sobre el estado anterior para evitar pisar cambios de otra sesión.
- Revisión de órdenes cada cinco segundos; solo se anuncian órdenes nuevas después de la primera carga para evitar avisos falsos al iniciar sesión.
- Aviso visual de nuevas órdenes y sonido opcional activable mediante clic del usuario; el sonido funciona mientras el panel permanece abierto y el navegador permite audio.
- Los enlaces QR siguen disponibles en la sección desplegable para personal autorizado.
- Comprobación sintáctica de JS y verificación de IDs HTML realizadas. **Falta inspección manual en navegadores reales y verificación del despliegue actualizado.**

### Validación del panel

1. Abre `/admin/`, inicia sesión y confirma que los KPI muestran los pedidos.
2. Filtra los pedidos por estado y verifica que los resultados cambien.
3. Haz un pedido de prueba desde una mesa y comprueba que aparezca en cinco segundos.
4. Activa los avisos sonoros con el botón y repite la prueba desde otro dispositivo.
5. Acepta, prepara y entrega un pedido, verificando cada cambio en otra sesión.
6. En la sección de mesas, consulta y copia un enlace QR.

No usar para atención comercial sin completar pruebas de campo y medidas antiabuso adicionales.
