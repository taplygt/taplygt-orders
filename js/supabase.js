const SUPABASE_URL = "https://pzwirecozfwmwduhmwyp.supabase.co";
const SUPABASE_KEY = "sb_publishable_CljWO8GYsvMUd-6_ish2IQ_kl0ZpqCE";
let RESTAURANT_ID = null;

async function supabaseRequest(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(SUPABASE_URL + path, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + (token || SUPABASE_KEY),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  if (!response.ok) {
    let detail = '';
    try {
      const error = await response.json();
      detail = error.message || error.error_description || error.error || '';
    } catch { /* Supabase may return a non-JSON error */ }
    throw new Error(detail || 'Error de conexión (' + response.status + ')');
  }
  if (response.status === 204) return null;
  return response.json();
}
async function getRestaurant() {
  const restaurants = await supabaseRequest('/rest/v1/restaurants?select=id,name&slug=eq.piloto&limit=1');
  if (!restaurants.length) throw new Error('Falta configurar el restaurante piloto en Supabase.');
  RESTAURANT_ID = restaurants[0].id;
  return restaurants[0];
}
async function obtenerProductos() {
  if (!RESTAURANT_ID) await getRestaurant();
  return supabaseRequest('/rest/v1/products?select=id,name,description,category,price&is_available=eq.true&restaurant_id=eq.' + encodeURIComponent(RESTAURANT_ID) + '&order=name.asc');
}
async function enviarPedido(table, lines, notes) {
  if (!RESTAURANT_ID) throw new Error('El restaurante todavía no está cargado.');
  return supabaseRequest('/rest/v1/rpc/taplygt_create_order', {
    method: 'POST',
    body: {
      p_restaurant_id: RESTAURANT_ID,
      p_table_number: Number(table),
      p_lines: lines,
      p_notes: notes
    }
  });
}
