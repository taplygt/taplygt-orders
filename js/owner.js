let ownerAccessToken=null;
const ownerEl=id=>document.getElementById(id);
const ownerMoney=n=>'Q'+Number(n||0).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2});
function ownerShowLogin(message=''){
 ownerAccessToken=null;
 ownerEl('ownerDashboard').classList.add('hide');
 ownerEl('ownerLogin').classList.remove('hide');
 ownerEl('ownerRestaurantList').replaceChildren();
 ownerEl('ownerLoginMessage').textContent=message;
}
async function ownerLoad(){
 if(!ownerAccessToken)return;
 ownerEl('ownerMessage').textContent='Cargando restaurantes...';
 try{
  const data=await supabaseRequest('/rest/v1/rpc/taplygt_platform_overview',{method:'POST',token:ownerAccessToken,body:{}});
  ownerEl('ownerRestaurants').textContent=data.restaurant_count??0;
  ownerEl('ownerOrders').textContent=data.orders_count??0;
  ownerEl('ownerAmount').textContent=ownerMoney(data.order_amount);
  const list=ownerEl('ownerRestaurantList');
  list.replaceChildren();
  for(const restaurant of data.restaurants||[]){
   const card=document.createElement('article');card.className='card owner-restaurant';
   const heading=document.createElement('h3');heading.textContent=restaurant.name;
   const created=document.createElement('p');created.className='muted';created.textContent='Registrado: '+new Date(restaurant.created_at).toLocaleDateString('es-GT');
   const details=document.createElement('p');details.textContent=restaurant.tables+' mesas · '+restaurant.products+' productos · '+restaurant.orders+' pedidos';
   const amount=document.createElement('strong');amount.textContent='Importe de pedidos no cancelados: '+ownerMoney(restaurant.order_amount);
   card.append(heading,created,details,amount);list.appendChild(card);
  }
  if(!(data.restaurants||[]).length){
    const empty=document.createElement('p');empty.textContent='Aún no hay restaurantes.';list.appendChild(empty);
  }
  ownerEl('ownerMessage').textContent='Datos actualizados · '+new Date().toLocaleTimeString('es-GT');
 }catch(error){
  ownerEl('ownerMessage').textContent='No se pudo consultar: '+error.message;
  if(/unauthorized|jwt|expired|no autorizado|42501/i.test(error.message))ownerShowLogin('Acceso denegado o sesión vencida.');
 }
}
ownerEl('ownerLoginForm').addEventListener('submit',async event=>{
 event.preventDefault();
 const button=event.currentTarget.querySelector('button');
 button.disabled=true;
 ownerEl('ownerLoginMessage').textContent='Verificando permisos...';
 try{
  const session=await supabaseRequest('/auth/v1/token?grant_type=password',{method:'POST',body:{
   email:ownerEl('ownerEmail').value.trim(),password:ownerEl('ownerPassword').value
  }});
  if(!session.access_token)throw new Error('No se recibió sesión.');
  const probe=await supabaseRequest('/rest/v1/rpc/taplygt_platform_overview',{method:'POST',token:session.access_token,body:{}});
  if(!Array.isArray(probe.restaurants))throw new Error('No se pudo verificar acceso.');
  ownerAccessToken=session.access_token;
  ownerEl('ownerPassword').value='';
  ownerEl('ownerLogin').classList.add('hide');
  ownerEl('ownerDashboard').classList.remove('hide');
  await ownerLoad();
 }catch(error){
  ownerAccessToken=null;
  ownerEl('ownerLoginMessage').textContent='Acceso no disponible: '+error.message;
 }finally{button.disabled=false}
});
ownerEl('ownerRefresh').addEventListener('click',ownerLoad);
ownerEl('ownerLogout').addEventListener('click',()=>ownerShowLogin('Sesión cerrada.'));
