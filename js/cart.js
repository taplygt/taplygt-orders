
let cart = {};
let productosMenu = [];

const money = n => "Q" + Number(n).toFixed(2);

function show(tab) {
  document.getElementById("client").classList.toggle("hide", tab !== "client");
  document.getElementById("admin").classList.toggle("hide", tab !== "admin");
  document.getElementById("clientTab").classList.toggle("active", tab === "client");
  document.getElementById("adminTab").classList.toggle("active", tab === "admin");

  if (tab === "admin") renderOrders();
}

function add(id) {
  const producto = productosMenu.find(p => String(p.id) === String(id));

  if (!producto) {
    alert("Producto no encontrado.");
    return;
  }

  cart[id] = (cart[id] || 0) + 1;
  renderCart();
}

function remove(id) {
  if (cart[id]) cart[id]--;

  if (!cart[id]) delete cart[id];

  renderCart();
}

function renderCart() {
  const contenedor = document.getElementById("cartLines");
  const totalElemento = document.getElementById("total");

  contenedor.innerHTML = "";
  let total = 0;

  Object.keys(cart).forEach(id => {
    const producto = productosMenu.find(p => String(p.id) === String(id));
    if (!producto) return;

    const cantidad = cart[id];
    const subtotal = Number(producto.price) * cantidad;
    total += subtotal;

    const fila = document.createElement("div");
    fila.className = "row";
    fila.style.margin = "8px 0";

    const nombre = document.createElement("span");
    nombre.textContent = `${producto.name} × ${cantidad}`;

    const precio = document.createElement("span");
    precio.textContent = money(subtotal) + " ";

    const boton = document.createElement("button");
    boton.textContent = "−";
    boton.setAttribute("aria-label", `Quitar ${producto.name}`);
    boton.addEventListener("click", () => remove(id));

    precio.appendChild(boton);
    fila.append(nombre, precio);
    contenedor.appendChild(fila);
  });

  if (contenedor.children.length === 0) {
    contenedor.textContent = "Aún no agregas productos.";
  }

  totalElemento.textContent = money(total);
}
