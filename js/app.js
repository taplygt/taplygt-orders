
async function cargarMenu() {
  const contenedor = document.getElementById("menu");

  if (!contenedor) return;

  contenedor.textContent = "Cargando menú...";

  try {
    const productos = await obtenerProductos();

    contenedor.innerHTML = "";

    if (productos.length === 0) {
      contenedor.textContent = "No hay productos disponibles.";
      return;
    }

    productos.forEach(producto => {
      const tarjeta = document.createElement("div");
      tarjeta.className = "card";

      const titulo = document.createElement("h3");
      titulo.textContent = producto.name;

      const descripcion = document.createElement("p");
      descripcion.className = "muted";
      descripcion.textContent = producto.description || "";

      const precio = document.createElement("span");
      precio.className = "price";
      precio.textContent =
        `Q${Number(producto.price).toFixed(2)}`;

      const boton = document.createElement("button");
      boton.className = "primary";
      boton.textContent = "+ Agregar";
      boton.style.marginTop = "15px";

      boton.addEventListener("click", () => {
        if (typeof add === "function") {
          add(producto.id);
        } else {
          console.error("La función add no está disponible");
          alert("Debemos conectar el carrito de compras.");
        }
      });

      tarjeta.append(titulo, descripcion, precio, boton);
      contenedor.appendChild(tarjeta);
    });

  } catch (error) {
    console.error(error);
    contenedor.textContent =
      "No se pudo cargar el menú. Intenta nuevamente.";
  }
}

cargarMenu();
