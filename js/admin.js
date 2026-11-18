const statusLabels = Object.freeze({
  pending: 'Recibido', accepted: 'Aceptado', preparing: 'Preparando',
  ready: 'Listo', delivered: 'Entregado', cancelled: 'Cancelado'
});
const nextStatus = Object.freeze({
  pending: 'accepted', accepted: 'preparing',
  preparing: 'ready', ready: 'delivered'
});
let accessToken = null;
let staffRestaurantId = null;
let pollHandle = null;
let refreshInProgress = false;
let knownOrderIds = null;
let allOrders = [];
let soundsEnabled = false;
let noticeTimeout = null;
const pollMs = 5000;

function setMessage(id, message) {
  document.getElementById(id).textContent = message;
}
function money(value) {
  return 'Q' + Number(value || 0).toFixed(2);
}
function el(tag, className, textValue) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textValue !== undefined) node.textContent = String(textValue);
  return node;
}
function showLogin(message = '') {
  clearInterval(pollHandle);
  clearTimeout(noticeTimeout);
  pollHandle = null;
  accessToken = null;
  staffRestaurantId = null;
  analyticsLatest = null;
  document.getElementById('exportAnalytics').disabled = true;
  allOrders = [];
  knownOrderIds = null;
  document.getElementById('tableLinks').replaceChildren();
  if(document.getElementById('qrCards')){
    document.getElementById('qrCards').replaceChildren();
    document.getElementById('qrCards').classList.add('hide');
    document.getElementById('printQrCards').disabled=true;
    qrCardsLoaded=false;
  }
  document.getElementById('dashboard').classList.add('hide');
  document.getElementById('signupBox').classList.add('hide');
  document.getElementById('setupBox').classList.add('hide');
  document.getElementById('loginBox').classList.remove('hide');
  setMessage('loginMessage', message);
}
async function signIn(email, password) {
  const auth = await supabaseRequest('/auth/v1/token?grant_type=password', {
    method: 'POST', body: { email, password }
  });
  if (!auth.access_token) throw new Error('No se recibió una sesión válida.');
  accessToken = auth.access_token;
  const staff = await supabaseRequest('/rest/v1/restaurant_staff?select=restaurant_id&limit=1', {
    token: accessToken
  });
  if (!staff.length) {
    showRestaurantSetup(email);
    return;
  }
  await activateRestaurantPanel(email,staff[0].restaurant_id);
}
function playNewOrderSound() {
  if (!soundsEnabled) return;
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    [0, 0.16].forEach((delay, index) => {
      const oscillator = ctx.createOscillator();
      const volume = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = index === 0 ? 784 : 988;
      volume.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      volume.gain.exponentialRampToValueAtTime(0.13, ctx.currentTime + delay + 0.018);
      volume.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.20);
      oscillator.connect(volume).connect(ctx.destination);
      oscillator.start(ctx.currentTime + delay);
      oscillator.stop(ctx.currentTime + delay + 0.22);
    });
    setTimeout(() => ctx.close(), 950);
  } catch (error) {
    console.debug('No fue posible reproducir el aviso', error);
  }
}
function announceNewOrders(orders) {
  const incoming = orders.filter(order => !knownOrderIds.has(order.id));
  if (!incoming.length) return;
  const notice = document.getElementById('newOrderNotice');
  notice.textContent = incoming.length === 1
    ? '🔔 Nuevo pedido recibido: mesa ' + (incoming[0].tables?.table_number || '?')
    : '🔔 Se recibieron ' + incoming.length + ' pedidos nuevos';
  notice.classList.remove('hide');
  clearTimeout(noticeTimeout);
  noticeTimeout = setTimeout(() => notice.classList.add('hide'), 12000);
  playNewOrderSound();
}
function orderMatchesFilter(order, filter) {
  if (filter === 'all') return true;
  if (filter === 'active') return !['delivered', 'cancelled'].includes(order.status);
  if (filter === 'preparing') return ['accepted','preparing'].includes(order.status);
  return order.status === filter;
}
function renderMetrics(orders) {
  const count = predicate => orders.filter(predicate).length;
  setMessage('metricNew', count(o => o.status === 'pending'));
  setMessage('metricActive', count(o => ['accepted', 'preparing'].includes(o.status)));
  setMessage('metricReady', count(o => o.status === 'ready'));
  setMessage('metricDelivered', count(o => o.status === 'delivered'));
}
async function updateOrderStatus(id, newStatus, button) {
  if (!accessToken || !staffRestaurantId || !Object.hasOwn(statusLabels, newStatus)) return;
  const currentOrder = allOrders.find(order => order.id === id);
  if (!currentOrder || currentOrder.status === newStatus) return;
  if (button) button.disabled = true;
  try {
    const response = await fetch(SUPABASE_URL + '/rest/v1/orders?id=eq.' + encodeURIComponent(id) +
      '&restaurant_id=eq.' + encodeURIComponent(staffRestaurantId) +
      '&status=eq.' + encodeURIComponent(currentOrder.status), {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY, Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json', Prefer: 'return=representation'
      },
      body: JSON.stringify({status: newStatus})
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || 'Error HTTP ' + response.status);
    }
    const changed = await response.json();
    if (!changed.length) throw new Error('El pedido fue modificado en otra sesión. Actualiza el panel.');
    currentOrder.status = newStatus;
    renderMetrics(allOrders);
    renderOrders();
    setMessage('panelMessage', 'Estado guardado: ' + (statusLabels[newStatus] || newStatus));
  } catch (error) {
    setMessage('panelMessage', 'No se pudo cambiar el estado: ' + error.message);
    await loadOrders();
  } finally {
    if (button) button.disabled = false;
  }
}
function createOrderCard(order) {
  const card = el('article','order-card status-' + order.status);
  const header = el('div','order-card-header');
  const headingWrap = el('div','');
  headingWrap.append(
    el('div','order-table','Mesa ' + (order.tables?.table_number ?? '?')),
    el('div','order-code','#' + String(order.id).slice(0, 8).toUpperCase())
  );
  const status = el('span','order-status status-' + order.status, statusLabels[order.status] || order.status);
  header.append(headingWrap, status);
  const date = el('p','order-time',new Date(order.created_at).toLocaleString('es-GT'));
  const lines = el('div','order-line-list');
  (order.order_items || []).forEach(line => {
    const row = el('div','order-line');
    row.append(
      el('span','',String(line.quantity) + ' × ' + (line.products?.name || 'Producto')),
      el('strong','',money(line.subtotal))
    );
    lines.appendChild(row);
  });
  const notes = el('div','order-notes',
    order.notes ? 'Nota de cocina: ' + order.notes : 'Sin instrucciones especiales');
  const bottom = el('div','order-card-footer');
  bottom.append(el('strong','order-total',money(order.total)));
  const controls = el('div','order-control-row');
  const forward = nextStatus[order.status];
  if (forward) {
    const action = el('button','primary order-next-button',
      {accepted:'Iniciar preparación',preparing:'Marcar listo',ready:'Marcar entregado',pending:'Aceptar pedido'}[order.status]);
    action.type = 'button';
    action.addEventListener('click', () => updateOrderStatus(order.id, forward, action));
    controls.appendChild(action);
  }
  if (!['cancelled','delivered'].includes(order.status)) {
    const cancel = el('button','order-cancel-button','Cancelar');
    cancel.type = 'button';
    cancel.addEventListener('click', () => {
      if (confirm('¿Cancelar el pedido de mesa ' + (order.tables?.table_number || '?') + '?')) {
        updateOrderStatus(order.id, 'cancelled', cancel);
      }
    });
    controls.appendChild(cancel);
  }
  bottom.appendChild(controls);
  card.append(header, date, lines, notes, bottom);
  return card;
}
function renderOrders() {
  const container = document.getElementById('orders');
  container.replaceChildren();
  const filter = document.getElementById('orderFilter').value;
  const orders = allOrders.filter(o => orderMatchesFilter(o, filter));
  if (!orders.length) {
    const empty = el('div','empty-orders');
    empty.append(el('div','empty-orders-icon','✓'),
      el('h3','','No hay pedidos en esta vista'),
      el('p','','Cuando lleguen órdenes nuevas, aparecerán automáticamente aquí.'));
    container.appendChild(empty);
    return;
  }
  orders.forEach(order => container.appendChild(createOrderCard(order)));
}
async function loadOrders() {
  if (!accessToken || !staffRestaurantId || refreshInProgress) return;
  refreshInProgress = true;
  try {
    const query = '/rest/v1/orders?select=id,status,notes,total,created_at,tables(table_number),order_items(quantity,subtotal,products(name))' +
      '&restaurant_id=eq.' + encodeURIComponent(staffRestaurantId) +
      '&order=created_at.desc&limit=100';
    const orders = await supabaseRequest(query, {token: accessToken});
    if (knownOrderIds !== null) announceNewOrders(orders);
    knownOrderIds = new Set(orders.map(o => o.id));
    allOrders = orders;
    renderMetrics(orders);
    renderOrders();
    setMessage('panelMessage', 'Última actualización: ' +
      new Date().toLocaleTimeString('es-GT') + ' · Cada 5 segundos · ' + orders.length + ' pedidos recientes');
  } catch (error) {
    setMessage('panelMessage', 'No se pudieron cargar pedidos: ' + error.message);
    if (/jwt|token|unauthorized|expired/i.test(error.message)) {
      showLogin('La sesión venció. Ingresa nuevamente.');
    }
  } finally {
    refreshInProgress = false;
  }
}
async function showTableLinks() {
  if (!accessToken || !staffRestaurantId) return;
  const target = document.getElementById('tableLinks');
  target.textContent = 'Cargando enlaces...';
  try {
    const tables = await supabaseRequest('/rest/v1/tables?select=table_number,qr_token&is_active=eq.true&restaurant_id=eq.' +
      encodeURIComponent(staffRestaurantId) + '&order=table_number.asc', {token:accessToken});
    target.replaceChildren();
    const menuUrl = new URL('../index.html', window.location.href);
    tables.forEach(table => {
      const line = el('div','table-link-row');
      const label = el('strong','','Mesa ' + String(table.table_number).padStart(2,'0'));
      const link = el('a','','Abrir menú');
      const url = new URL(menuUrl);
      url.searchParams.set('mesa_token',table.qr_token);
      link.href = url.toString();
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const copy = el('button','soft-button','Copiar enlace');
      copy.type = 'button';
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(url.toString());
          copy.textContent = 'Copiado ✓';
        } catch {
          window.prompt('Copia el enlace de la mesa',url.toString());
        }
      });
      line.append(label,link,copy);
      target.appendChild(line);
    });
    if (!tables.length) target.textContent = 'No hay mesas activas.';
  } catch(error) {
    target.textContent = 'No fue posible cargar mesas: ' + error.message;
  }
}
document.getElementById('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.target.querySelector('button');
  button.disabled = true;
  setMessage('loginMessage','Validando acceso...');
  try {
    await signIn(document.getElementById('email').value.trim(),
      document.getElementById('password').value);
    document.getElementById('password').value = '';
  } catch(error) {
    showLogin('No se pudo iniciar sesión: ' + error.message);
  } finally {
    button.disabled = false;
  }
});
document.getElementById('refresh').addEventListener('click', loadOrders);
document.getElementById('logout').addEventListener('click', () => showLogin('Sesión cerrada.'));
document.getElementById('orderFilter').addEventListener('change',renderOrders);
document.getElementById('loadTableLinks').addEventListener('click',showTableLinks);
document.getElementById('notifyToggle').addEventListener('click',() => {
  soundsEnabled = !soundsEnabled;
  document.getElementById('notifyToggle').textContent =
    soundsEnabled ? '🔔 Avisos activados' : '🔔 Activar avisos';
  if (soundsEnabled) playNewOrderSound();
});
window.addEventListener('pagehide',() => clearInterval(pollHandle));
