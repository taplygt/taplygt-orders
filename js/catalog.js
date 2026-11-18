let catalogProducts = [];
let catalogBusy = false;
const catalogMessage = message => document.getElementById('catalogMessage').textContent = message;
const catalogApi = (path,options={}) => supabaseRequest(path,{...options,token:accessToken});
function catalogCloseForm() {
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('productForm').classList.add('hide');
}
function catalogOpenForm(product=null) {
  const form = document.getElementById('productForm');
  form.reset();
  document.getElementById('productId').value = product?.id || '';
  document.getElementById('productName').value = product?.name || '';
  document.getElementById('productCategory').value = product?.category || 'General';
  document.getElementById('productPrice').value = product?.price || '';
  document.getElementById('productDescription').value = product?.description || '';
  document.getElementById('productImageUrl').value = product?.image_url || '';
  document.getElementById('productAvailable').checked = product?.is_available ?? true;
  document.getElementById('productFormTitle').textContent = product ? 'Editar producto' : 'Nuevo producto';
  form.classList.remove('hide');
  form.scrollIntoView({behavior:'smooth',block:'center'});
}
function catalogRender() {
  const container = document.getElementById('productList');
  container.replaceChildren();
  if (!catalogProducts.length) {
    container.appendChild(el('p','muted','No hay productos. Agrega el primero.'));
    return;
  }
  catalogProducts.forEach(product => {
    const card = el('article','catalog-item');
    const preview = el('div','catalog-preview');
    if (product.image_url && /^https:\/\//i.test(product.image_url)) {
      const img = document.createElement('img');
      img.src = product.image_url;
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('error',()=>preview.replaceChildren(el('span','','🍽️')),{once:true});
      preview.appendChild(img);
    } else preview.appendChild(el('span','','🍽️'));
    const content = el('div','catalog-item-body');
    content.append(el('strong','',product.name),el('small','',product.category + ' · ' + money(product.price)));
    const status = el('span','catalog-availability',product.is_available ? 'Disponible' : 'Agotado');
    const buttons = el('div','catalog-item-actions');
    const edit = el('button','soft-button','Editar');
    edit.type='button';
    edit.addEventListener('click',()=>catalogOpenForm(product));
    const toggle = el('button','soft-button',product.is_available ? 'Agotar' : 'Activar');
    toggle.type='button';
    toggle.addEventListener('click',()=>catalogUpdate(product.id,{is_available:!product.is_available}));
    const del = el('button','catalog-delete','Eliminar');
    del.type='button';
    del.addEventListener('click',async()=>{
      if (!confirm('¿Eliminar "' + product.name + '"? Si ya tiene pedidos históricos, podría no ser posible. En ese caso usa Agotar.')) return;
      await catalogDelete(product.id);
    });
    buttons.append(edit,toggle,del);
    content.append(status,buttons);
    card.append(preview,content);
    container.appendChild(card);
  });
}
async function loadCatalog() {
  if (!accessToken || !staffRestaurantId) return;
  try {
    const products = await catalogApi('/rest/v1/products?select=id,name,description,category,price,is_available,image_url&restaurant_id=eq.'+
      encodeURIComponent(staffRestaurantId)+'&order=name.asc');
    catalogProducts=products;
    catalogRender();
    catalogMessage(products.length+' productos registrados.');
  } catch(error) {
    catalogMessage('Error al cargar catálogo: '+error.message);
  }
}
async function catalogUpdate(id,changes) {
  if (catalogBusy) return;
  catalogBusy=true;
  try {
    const response=await fetch(SUPABASE_URL+'/rest/v1/products?id=eq.'+encodeURIComponent(id)+
      '&restaurant_id=eq.'+encodeURIComponent(staffRestaurantId),{
      method:'PATCH',
      headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+accessToken,'Content-Type':'application/json',Prefer:'return=representation'},
      body:JSON.stringify(changes)
    });
    const result=await response.json().catch(()=>[]);
    if (!response.ok) throw new Error(result.message || 'No se pudo actualizar');
    if (!result.length) throw new Error('Sin permiso para actualizar este producto.');
    catalogMessage('Producto actualizado.');
    await loadCatalog();
    return true;
  }catch(error){catalogMessage('Error: '+error.message);return false}
  finally{catalogBusy=false}
}
async function catalogDelete(id) {
  if (catalogBusy) return;
  catalogBusy=true;
  try {
    const response=await fetch(SUPABASE_URL+'/rest/v1/products?id=eq.'+encodeURIComponent(id)+
      '&restaurant_id=eq.'+encodeURIComponent(staffRestaurantId),{
      method:'DELETE',
      headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+accessToken,Prefer:'return=representation'}
    });
    const result=await response.json().catch(()=>[]);
    if(!response.ok) throw new Error(result.message || 'No se pudo eliminar');
    if(!result.length) throw new Error('Sin permiso para eliminar este producto.');
    await loadCatalog();
    catalogMessage('Producto eliminado.');
  }catch(error){catalogMessage('Error: '+error.message+' Usa Agotar si tiene pedidos asociados.')}
  finally{catalogBusy=false}
}
async function catalogUploadPhoto(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Usa JPG, PNG o WebP.');
  if (file.size>3*1024*1024) throw new Error('La fotografía supera los 3 MB.');
  const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
  const objectPath=staffRestaurantId+'/'+crypto.randomUUID()+'.'+extension;
  const response=await fetch(SUPABASE_URL+'/storage/v1/object/taplygt-product-photos/'+objectPath,{
    method:'POST',
    headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+accessToken,'Content-Type':file.type,'x-upsert':'false'},
    body:file
  });
  if (!response.ok) {
    const result=await response.json().catch(()=>({}));
    throw new Error(result.message || 'Error al subir fotografía');
  }
  return SUPABASE_URL+'/storage/v1/object/public/taplygt-product-photos/'+objectPath;
}
document.getElementById('newProduct').addEventListener('click',()=>catalogOpenForm());
document.getElementById('cancelProduct').addEventListener('click',catalogCloseForm);
document.getElementById('productForm').addEventListener('submit',async event=>{
  event.preventDefault();
  if (catalogBusy || !accessToken || !staffRestaurantId) return;
  catalogBusy=true;
  const button=document.getElementById('saveProduct');
  button.disabled=true;
  try {
    const form=document.getElementById('productForm');
    const id=document.getElementById('productId').value;
    const price=Number(document.getElementById('productPrice').value);
    if (!Number.isFinite(price) || price<=0 || price>99999) throw new Error('Precio inválido.');
    let imageUrl=document.getElementById('productImageUrl').value.trim() || null;
    if (imageUrl && !/^https:\/\//i.test(imageUrl)) throw new Error('La fotografía debe tener un enlace HTTPS.');
    const file=document.getElementById('productPhoto').files[0];
    if(file) {
      catalogMessage('Subiendo fotografía...');
      imageUrl=await catalogUploadPhoto(file);
    }
    const payload={
      name:document.getElementById('productName').value.trim(),
      category:document.getElementById('productCategory').value.trim(),
      description:document.getElementById('productDescription').value.trim(),
      price,is_available:document.getElementById('productAvailable').checked,
      image_url:imageUrl
    };
    if(!payload.name || !payload.category) throw new Error('Completa nombre y categoría.');
    const url='/rest/v1/products'+(id?'?id=eq.'+encodeURIComponent(id)+'&restaurant_id=eq.'+encodeURIComponent(staffRestaurantId):'');
    const response=await fetch(SUPABASE_URL+url,{
      method:id?'PATCH':'POST',
      headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+accessToken,'Content-Type':'application/json',Prefer:'return=representation'},
      body:JSON.stringify(id?payload:{...payload,restaurant_id:staffRestaurantId})
    });
    const result=await response.json().catch(()=>[]);
    if(!response.ok) throw new Error(result.message || 'No se pudo guardar');
    if(!result.length) throw new Error('No se pudo confirmar el guardado.');
    catalogCloseForm();
    await loadCatalog();
    catalogMessage('Producto guardado correctamente.');
  }catch(error){catalogMessage('Error: '+error.message)}
  finally{catalogBusy=false;button.disabled=false}
});
