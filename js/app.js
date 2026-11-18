let activeCategory = 'Todos';
let searchTerm = '';
const categoryIcon = name => {
  const value = String(name || '').toLowerCase();
  if (/pizza/.test(value)) return '🍕';
  if (/hamburg|burger/.test(value)) return '🍔';
  if (/bebida|agua|refresco|jugo|café|cafe/.test(value)) return '🥤';
  if (/postre|dulce/.test(value)) return '🍰';
  if (/papas|entrada|acompañ/.test(value)) return '🍟';
  if (/ensalada/.test(value)) return '🥗';
  return '🍽️';
};
function categoryOf(product) { return String(product.category || 'Otros').trim() || 'Otros'; }
function makeNode(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}
function renderCategories() {
  const nav = document.getElementById('categoryFilters');
  nav.replaceChildren();
  const categories = ['Todos', ...new Set(productosMenu.map(categoryOf))];
  if (!categories.includes(activeCategory)) activeCategory = 'Todos';
  categories.forEach(category => {
    const button = makeNode('button','customer-category' + (category === activeCategory ? ' selected' : ''),category);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(category === activeCategory));
    button.addEventListener('click', () => {
      activeCategory = category;
      renderCategories();
      renderMenu();
    });
    nav.appendChild(button);
  });
}
function renderMenu() {
  const container = document.getElementById('menu');
  container.replaceChildren();
  const matches = productosMenu.filter(p =>
    (activeCategory === 'Todos' || categoryOf(p) === activeCategory) &&
    (String(p.name || '') + ' ' + String(p.description || '')).toLocaleLowerCase('es').includes(searchTerm)
  );
  if (!matches.length) {
    container.appendChild(makeNode('p','customer-empty','No encontramos productos en esta categoría.'));
    return;
  }
  matches.forEach(product => {
    const card = makeNode('article','customer-product');
    const art = makeNode('div','customer-product-art');
    // No se inventan fotografías de alimentos. Si el catálogo incluye una URL
    // pública HTTPS verificada por el negocio, se muestra; si no, usamos iconografía.
    const imageUrl = product.image_url;
    if (typeof imageUrl === 'string' && /^https:\/\//i.test(imageUrl)) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = 'Fotografía de ' + product.name;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => {
        art.replaceChildren(makeNode('span','customer-food-icon',categoryIcon(categoryOf(product))));
      },{once:true});
      art.appendChild(img);
    } else {
      art.appendChild(makeNode('span','customer-food-icon',categoryIcon(categoryOf(product))));
    }
    const body = makeNode('div','customer-product-body');
    const category = makeNode('span','customer-product-category',categoryOf(product));
    const title = makeNode('h3','',String(product.name || 'Producto'));
    const desc = makeNode('p','',String(product.description || 'Preparado para ti.'));
    const bottom = makeNode('div','customer-product-bottom');
    const price = makeNode('strong','',money(product.price));
    const addButton = makeNode('button','customer-add','+ Agregar');
    addButton.type = 'button';
    addButton.setAttribute('aria-label','Agregar ' + product.name);
    addButton.addEventListener('click',() => {
      add(product.id);
      addButton.textContent = '✓ Agregado';
      setTimeout(() => { addButton.textContent = '+ Agregar'; },900);
    });
    bottom.append(price,addButton);
    body.append(category,title,desc,bottom);
    card.append(art,body);
    container.appendChild(card);
  });
}
async function cargarMenu() {
  const container = document.getElementById('menu');
  container.textContent = 'Cargando menú...';
  try {
    productosMenu = await obtenerProductos();
    renderCategories();
    renderMenu();
    renderCart();
  } catch(error) {
    console.error(error);
    container.textContent = 'No se pudo cargar el menú. Actualiza la página e inténtalo nuevamente.';
  }
}
document.getElementById('menuSearch').addEventListener('input',event => {
  searchTerm = event.target.value.trim().toLocaleLowerCase('es');
  renderMenu();
});
document.getElementById('viewCart').addEventListener('click',() => {
  document.getElementById('cart').scrollIntoView({behavior:'smooth',block:'start'});
});
const params = new URLSearchParams(window.location.search);
const tokenQR = params.get('mesa_token');
const selectorMesa = document.getElementById('table');
async function iniciarMenu() {
  const submit = document.getElementById('submitOrder');
  if (!tokenQR || !/^[0-9a-fA-F-]{36}$/.test(tokenQR)) {
    document.getElementById('menu').textContent = 'Escanea el código QR de una mesa para ver el menú y hacer tu pedido.';
    return;
  }
  try {
    const mesa = await resolverMesa(tokenQR);
    selectorMesa.replaceChildren();
    const option = document.createElement('option');
    option.value = String(mesa.table_number);
    option.textContent = String(mesa.table_number).padStart(2,'0');
    selectorMesa.appendChild(option);
    document.getElementById('tableBadge').textContent = option.textContent;
    submit.disabled = false;
    await cargarMenu();
  } catch(error) {
    document.getElementById('menu').textContent = 'Código QR inválido o inactivo: ' + error.message;
  }
}
iniciarMenu();
