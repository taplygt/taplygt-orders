const SUPABASE_URL = "https://pzwirecozfwmwduhmwyp.supabase.co";
const SUPABASE_KEY = "sb_publishable_CljWO8GYsvMUd-6_ish2IQ_kl0ZpqCE";
let RESTAURANT_ID = null;

async function supabaseRequest(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(SUPABASE_URL + path, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
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
let TABLE_TOKEN = null;
async function resolverMesa(token) {
  const data = await supabaseRequest('/rest/v1/rpc/taplygt_resolve_table', {
    method:'POST', body:{p_token:token}
  });
  TABLE_TOKEN = token;
  RESTAURANT_ID = data.restaurant_id;
  return data;
}
async function obtenerProductos() {
  if (!RESTAURANT_ID) throw new Error('Escanea el QR de tu mesa para ver el menú.');
  return supabaseRequest('/rest/v1/products?select=id,name,description,category,price&is_available=eq.true&restaurant_id=eq.' + encodeURIComponent(RESTAURANT_ID) + '&order=name.asc');
}
async function enviarPedido(table, lines, notes) {
  if (!TABLE_TOKEN) throw new Error('Escanea el QR original de la mesa.');
  return supabaseRequest('/rest/v1/rpc/taplygt_create_order', {
    method:'POST', body:{p_token:TABLE_TOKEN,p_lines:lines,p_notes:notes}
  });
}
