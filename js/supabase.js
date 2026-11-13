
const SUPABASE_URL =
  "https://pzwirecozfwmwduhmwyp.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_CljWO8GYsvMUd-6_ish2IQ_kl0ZpqCE";

async function obtenerProductos() {
  const respuesta = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=id,name,description,category,price&is_available=eq.true`,
    {
      headers: {
        apikey: SUPABASE_KEY
      }
    }
  );

  if (!respuesta.ok) {
    throw new Error("Error al cargar el menú");
  }

  return await respuesta.json();
}
