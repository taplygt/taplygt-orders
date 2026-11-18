let analyticsBusy=false;
async function loadAnalytics() {
 if(!accessToken||!staffRestaurantId||analyticsBusy)return;
 analyticsBusy=true;
 const message=document.getElementById('analyticsMessage');
 message.textContent='Actualizando estadísticas...';
 try {
  const data=await supabaseRequest('/rest/v1/rpc/taplygt_restaurant_analytics',{
    method:'POST',token:accessToken,body:{p_restaurant_id:staffRestaurantId}
  });
  const fmt=n=>'Q'+Number(n||0).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2});
  document.getElementById('analyticsOrders').textContent=Number(data.orders_total||0).toLocaleString('es-GT');
  document.getElementById('analyticsAmount').textContent=fmt(data.amount_total);
  document.getElementById('analyticsTodayOrders').textContent=Number(data.orders_today||0).toLocaleString('es-GT');
  document.getElementById('analyticsTodayAmount').textContent=fmt(data.amount_today);
  const daily=document.getElementById('analyticsDaily');
  daily.replaceChildren();
  const days=Array.isArray(data.daily)?data.daily:[];
  const max=Math.max(1,...days.map(d=>Number(d.amount||0)));
  days.forEach(d=>{
    const row=document.createElement('div');row.className='analytics-day';
    const label=document.createElement('span');label.className='analytics-day-label';
    const parts=String(d.date).slice(0,10).split('-');
    label.textContent=parts.length===3?parts[2]+'/'+parts[1]:String(d.date);
    const track=document.createElement('div');track.className='analytics-track';
    const fill=document.createElement('div');fill.className='analytics-fill';
    fill.style.width=Math.max(0,Math.min(100,Number(d.amount||0)/max*100))+'%';
    track.appendChild(fill);
    const value=document.createElement('strong');value.textContent=fmt(d.amount);
    value.title=String(d.orders)+' pedidos';
    row.append(label,track,value);daily.appendChild(row);
  });
  const products=document.getElementById('analyticsProducts');
  products.replaceChildren();
  const top=Array.isArray(data.top_products)?data.top_products:[];
  if(!top.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='Todavía no hay productos en pedidos válidos.';products.appendChild(empty);}
  top.forEach((p,index)=>{
    const row=document.createElement('div');row.className='analytics-product';
    const name=document.createElement('span');name.textContent=(index+1)+'. '+p.name;
    const qty=document.createElement('strong');qty.textContent=Number(p.quantity)+' uds.';
    row.append(name,qty);products.appendChild(row);
  });
  message.textContent='Actualizado: '+new Date().toLocaleTimeString('es-GT')+' · Zona horaria de Guatemala';
 } catch(error) {
  message.textContent='No se pudieron cargar las estadísticas: '+error.message;
 } finally{analyticsBusy=false;}
}
document.getElementById('reloadAnalytics').addEventListener('click',loadAnalytics);
