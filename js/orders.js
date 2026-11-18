const ORDER_STORAGE_KEY = 'taplygt_orders_demo';
const ORDER_STATES = ['Recibido', 'Preparando', 'Listo', 'Entregado'];

function getOrders() {
  try {
    const value = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function saveOrders(orders) {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
}
function placeOrder() {
  const lines = Object.entries(cart).map(([id, qty]) => {
    const product = productosMenu.find(p => String(p.id) === String(id));
    if (!product || !Number.isInteger(qty) || qty < 1) return null;
    return {
      id: String(product.id),
      name: String(product.name),
      qty,
      unitPrice: Number(product.price)
    };
  }).filter(Boolean);

  if (!lines.length) {
    alert('Agrega un producto antes de confirmar.');
    return;
  }
  if (lines.some(line => !Number.isFinite(line.unitPrice) || line.unitPrice < 0)) {
    alert('Hay un precio inválido en el menú. Intenta nuevamente.');
    return;
  }

  const order = {
    id: (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
    table: document.getElementById('table').value,
    lines,
    notes: document.getElementById('notes').value.trim().slice(0, 150),
    status: 'Recibido',
    created: new Date().toLocaleString('es-GT'),
    total: lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0)
  };
  try {
    saveOrders([order, ...getOrders()]);
  } catch {
    alert('No fue posible guardar el pedido en este navegador.');
    return;
  }
  cart = {};
  renderCart();
  document.getElementById('notes').value = '';
  document.getElementById('confirmation').textContent =
    '¡Pedido de demostración #' + String(order.id).slice(-6) +
    ' guardado en este navegador! No se ha enviado a una cocina real.';
  renderOrders();
}
function updateStatus(id, status) {
  if (!ORDER_STATES.includes(status)) return;
  const orders = getOrders();
  const order = orders.find(o => String(o.id) === String(id));
  if (!order) return;
  order.status = status;
  saveOrders(orders);
  renderOrders();
}
function renderOrders() {
  const container = document.getElementById('orders');
  if (!container) return;
  container.replaceChildren();
  const orders = getOrders();
  if (!orders.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No hay pedidos en este navegador. Haz uno desde la vista cliente.';
    container.appendChild(empty);
    return;
  }
  orders.forEach(order => {
    const card = document.createElement('div');
    card.className = 'card order';
    const headingRow = document.createElement('div');
    headingRow.className = 'row';
    const title = document.createElement('h3');
    title.textContent = 'Mesa ' + order.table + ' · #' + String(order.id).slice(-6);
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = order.status || 'Recibido';
    headingRow.append(title, pill);
    const date = document.createElement('small');
    date.className = 'muted';
    date.textContent = order.created || '';
    const linesBox = document.createElement('p');
    (Array.isArray(order.lines) ? order.lines : []).forEach(line => {
      const product = productosMenu.find(p => String(p.id) === String(line.id));
      const lineEl = document.createElement('div');
      lineEl.textContent = String(line.qty) + ' × ' + (line.name || product?.name || 'Producto no disponible');
      linesBox.appendChild(lineEl);
    });
    const footer = document.createElement('div');
    footer.className = 'row';
    const total = document.createElement('strong');
    const calculatedTotal = (order.lines || []).reduce((sum, line) => {
      const product = productosMenu.find(p => String(p.id) === String(line.id));
      return sum + (Number(line.unitPrice ?? product?.price ?? 0) * Number(line.qty || 0));
    }, 0);
    total.textContent = money(Number.isFinite(order.total) ? order.total : calculatedTotal);
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Estado del pedido de mesa ' + order.table);
    ORDER_STATES.forEach(state => {
      const option = document.createElement('option');
      option.value = state;
      option.textContent = state;
      option.selected = state === order.status;
      select.appendChild(option);
    });
    select.addEventListener('change', () => updateStatus(order.id, select.value));
    footer.append(total, select);
    card.append(headingRow, date, linesBox);
    if (order.notes) {
      const notes = document.createElement('p');
      notes.className = 'muted';
      notes.textContent = 'Nota: ' + order.notes;
      card.appendChild(notes);
    }
    card.appendChild(footer);
    container.appendChild(card);
  });
}
window.addEventListener('storage', event => {
  if (event.key === ORDER_STORAGE_KEY) renderOrders();
});
