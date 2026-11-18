const statusLabels = {pending:'Recibido',accepted:'Aceptado',preparing:'Preparando',ready:'Listo',delivered:'Entregado',cancelled:'Cancelado'};
let accessToken = null;
let staffRestaurantId = null;
let pollHandle = null;
let refreshInProgress = false;
const statuses = ['pending', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled'];

function setMessage(id, message) {
  document.getElementById(id).textContent = message;
}
function showLogin(message = '') {
  clearInterval(pollHandle);
  pollHandle = null;
  accessToken = null;
  staffRestaurantId = null;
  document.getElementById('tableLinks').replaceChildren();
  document.getElementById('loginBox').classList.remove('hide');
  document.getElementById('dashboard').classList.add('hide');
  setMessage('loginMessage', message);
}
function formatMoney(amount) {
  return 'Q' + Number(amount || 0).toFixed(2);
}
async function signIn(email, password) {
  const auth = await supabaseRequest('/auth/v1/token?grant_type=password', {
    method: 'POST', body: { email, password }
  });
  if (!auth.access_token) throw new Error('No se recibió una sesión válida.');
  accessToken = auth.access_token;
  const staff = await supabaseRequest('/rest/v1/restaurant_staff?select=restaurant_id&limit=1',
    { token: accessToken });
  if (!staff.length) {
    showLogin('Esta cuenta no tiene permiso para administrar ningún restaurante.');
    return;
  }
  staffRestaurantId = staff[0].restaurant_id;
  document.getElementById('loginBox').classList.add('hide');
  document.getElementById('dashboard').classList.remove('hide');
  setMessage('staffInfo', 'Sesión de ' + email);
  await loadOrders();
  clearInterval(pollHandle);
  pollHandle = setInterval(loadOrders, 5000);
}
async function updateOrderStatus(id, status) {
  if (!statuses.includes(status) || !accessToken || !staffRestaurantId) return;
  try {
    await supabaseRequest('/rest/v1/orders?id=eq.' + encodeURIComponent(id) +
      '&restaurant_id=eq.' + encodeURIComponent(staffRestaurantId), {
      method: 'PATCH', token: accessToken, body: { status }
    });
    await loadOrders();
  } catch (error) {
    setMessage('panelMessage', 'No se pudo cambiar el estado: ' + error.message);
  }
}
function renderOrders(orders) {
  const container = document.getElementById('orders');
  container.replaceChildren();
  if (!orders.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Todavía no hay pedidos.';
    container.appendChild(empty);
    return;
  }
  orders.forEach(order => {
    const card = document.createElement('article');
    card.className = 'card order';
    const row = document.createElement('div');
    row.className = 'row';
    const heading = document.createElement('h3');
    heading.textContent = 'Mesa ' + (order.tables?.table_number ?? '?') +
      ' · #' + String(order.id).slice(0, 8);
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = statusLabels[order.status] || order.status;
    row.append(heading, pill);
    const date = document.createElement('p');
    date.className = 'muted';
    date.textContent = new Date(order.created_at).toLocaleString('es-GT');
    const lines = document.createElement('div');
    (order.order_items || []).forEach(line => {
      const item = document.createElement('p');
      item.textContent = line.quantity + ' × ' + (line.products?.name || 'Producto') +
        ' — ' + formatMoney(line.subtotal);
      lines.appendChild(item);
    });
    const notes = document.createElement('p');
    notes.className = 'muted';
    notes.textContent = order.notes ? 'Notas: ' + order.notes : 'Sin notas';
    const footer = document.createElement('div');
    footer.className = 'row';
    const total = document.createElement('strong');
    total.textContent = formatMoney(order.total);
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Estado de pedido de mesa ' + (order.tables?.table_number || '?'));
    statuses.forEach(status => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = statusLabels[status] || status;
      option.selected = status === order.status;
      select.appendChild(option);
    });
    select.addEventListener('change', () => updateOrderStatus(order.id, select.value));
    footer.append(total, select);
    card.append(row, date, lines, notes, footer);
    container.appendChild(card);
  });
}
async function loadOrders() {
  if (!accessToken || !staffRestaurantId || refreshInProgress) return;
  refreshInProgress = true;
  try {
    const query = '/rest/v1/orders?select=id,status,notes,total,created_at,tables(table_number),order_items(quantity,subtotal,products(name))' +
      '&restaurant_id=eq.' + encodeURIComponent(staffRestaurantId) +
      '&order=created_at.desc&limit=100';
    const orders = await supabaseRequest(query, { token: accessToken });
    renderOrders(orders);
    setMessage('panelMessage', 'Pedidos cargados: ' + orders.length +
      ' · Actualización automática cada 5 segundos');
  } catch (error) {
    setMessage('panelMessage', 'No se pudieron cargar pedidos: ' + error.message);
    if (/jwt|token|unauthorized|expired/i.test(error.message)) {
      showLogin('La sesión venció. Ingresa nuevamente.');
    }
  } finally {
    refreshInProgress = false;
  }
}
document.getElementById('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const formButton = event.target.querySelector('button');
  formButton.disabled = true;
  setMessage('loginMessage', 'Validando acceso...');
  try {
    await signIn(document.getElementById('email').value.trim(),
      document.getElementById('password').value);
    document.getElementById('password').value = '';
  } catch (error) {
    showLogin('No se pudo iniciar sesión: ' + error.message);
  } finally {
    formButton.disabled = false;
  }
});
document.getElementById('refresh').addEventListener('click', loadOrders);
document.getElementById('logout').addEventListener('click', () => showLogin('Sesión cerrada.'));
window.addEventListener('pagehide', () => clearInterval(pollHandle));

async function showTableLinks() {
  if (!accessToken || !staffRestaurantId) return;
  const target = document.getElementById('tableLinks');
  target.textContent = 'Cargando enlaces...';
  try {
    const tables = await supabaseRequest('/rest/v1/tables?select=table_number,qr_token&is_active=eq.true&restaurant_id=eq.' +
      encodeURIComponent(staffRestaurantId) + '&order=table_number.asc', { token:accessToken });
    target.replaceChildren();
    // El enlace al menú se deriva del sitio donde está alojado el panel.
    const menuUrl = new URL('../index.html', window.location.href);
    tables.forEach(table => {
      const line = document.createElement('p');
      const label = document.createElement('strong');
      label.textContent = 'Mesa ' + table.table_number + ': ';
      const link = document.createElement('a');
      const url = new URL(menuUrl.toString());
      url.searchParams.set('mesa_token', table.qr_token);
      link.href = url.toString();
      link.textContent = 'Abrir menú de esta mesa';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = 'Copiar enlace';
      copy.style.marginLeft = '8px';
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(url.toString()); copy.textContent = 'Copiado'; }
        catch { window.prompt('Copia el enlace de la mesa', url.toString()); }
      });
      line.append(label, link, copy);
      target.appendChild(line);
    });
    if (!tables.length) target.textContent = 'No hay mesas activas.';
  } catch (err) { target.textContent = 'No se pudieron cargar las mesas: ' + err.message; }
}
document.getElementById('loadTableLinks').addEventListener('click', showTableLinks);
