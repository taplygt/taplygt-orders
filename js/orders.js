let submittingOrder = false;
async function placeOrder() {
  if (submittingOrder) return;
  const message = document.getElementById('confirmation');
  const button = document.getElementById('submitOrder');
  const lines = Object.entries(cart).map(([id, qty]) => ({ id: String(id), qty }));
  if (!lines.length) {
    message.textContent = 'Agrega al menos un producto.';
    return;
  }
  submittingOrder = true;
  button.disabled = true;
  button.textContent = 'Enviando pedido...';
  message.textContent = '';
  try {
    const result = await enviarPedido(
      document.getElementById('table').value,
      lines,
      document.getElementById('notes').value.trim()
    );
    cart = {};
    renderCart();
    document.getElementById('notes').value = '';
    message.textContent = '¡Pedido recibido! Número ' +
      String(result.id).slice(0, 8) + ' · Total confirmado: ' +
      money(result.total) + '. Paga en caja.';
  } catch (error) {
    console.error('Error al confirmar pedido:', error);
    message.textContent = 'No se pudo confirmar el pedido: ' + error.message +
      '. Revisa con el personal antes de volver a enviarlo.';
  } finally {
    submittingOrder = false;
    button.disabled = false;
    button.textContent = 'Confirmar pedido · Pagar en caja';
  }
}
