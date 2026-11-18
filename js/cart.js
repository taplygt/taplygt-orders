let cart = {};
let productosMenu = [];
const money = n => 'Q' + Number(n || 0).toFixed(2);
function add(id) {
  const product = productosMenu.find(p => String(p.id) === String(id));
  if (!product) return;
  const key = String(id);
  cart[key] = Math.min(20,(cart[key] || 0) + 1);
  renderCart();
}
function remove(id) {
  const key = String(id);
  if (cart[key]) cart[key]--;
  if (!cart[key]) delete cart[key];
  renderCart();
}
function renderCart() {
  const container = document.getElementById('cartLines');
  container.replaceChildren();
  let total = 0;
  let count = 0;
  Object.entries(cart).forEach(([id,quantity]) => {
    const product = productosMenu.find(p => String(p.id) === id);
    if (!product) return;
    const subtotal = Number(product.price) * quantity;
    total += subtotal;
    count += quantity;
    const row = document.createElement('div');
    row.className = 'customer-cart-row';
    const description = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = product.name;
    const unit = document.createElement('small');
    unit.textContent = money(product.price) + ' por unidad';
    description.append(name,unit);
    const controls = document.createElement('div');
    controls.className = 'customer-quantity';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label','Quitar una unidad de ' + product.name);
    minus.addEventListener('click',() => remove(id));
    const amount = document.createElement('span');
    amount.textContent = String(quantity);
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.disabled = quantity >= 20;
    plus.setAttribute('aria-label','Agregar una unidad de ' + product.name);
    plus.addEventListener('click',() => add(id));
    controls.append(minus,amount,plus);
    row.append(description,controls);
    container.appendChild(row);
  });
  if (!count) {
    const empty = document.createElement('div');
    empty.className = 'customer-cart-empty';
    empty.textContent = 'Tu carrito está vacío. Agrega algo delicioso del menú.';
    container.appendChild(empty);
  }
  document.getElementById('total').textContent = money(total);
  document.getElementById('cartCount').textContent = String(count);
  document.getElementById('stickyCount').textContent = count + (count === 1 ? ' producto' : ' productos');
  document.getElementById('stickyTotal').textContent = money(total);
  document.getElementById('stickyCart').classList.toggle('visible',count > 0);
}
