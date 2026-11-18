let qrCardsLoaded=false;
let qrCardsBusy=false;
function qrMessage(message){ document.getElementById('tableManagerMessage').textContent=message; }
function qrMenuUrl(table){
 const link=new URL('../index.html',window.location.href);
 link.searchParams.set('mesa_token',table.qr_token);
 return link.href;
}
async function loadQrCards(){
 if(qrCardsBusy||!accessToken||!staffRestaurantId)return;
 qrCardsBusy=true;
 const preview=document.getElementById('qrCards');
 const print=document.getElementById('printQrCards');
 print.disabled=true;
 preview.classList.remove('hide');
 preview.replaceChildren();
 qrMessage('Preparando tarjetas QR...');
 try{
  if(typeof QRCode!=='function')throw new Error('No se pudo cargar el generador QR. Revisa tu conexión.');
  const tables=await supabaseRequest('/rest/v1/tables?select=table_number,qr_token&is_active=eq.true&restaurant_id=eq.'+
   encodeURIComponent(staffRestaurantId)+'&order=table_number.asc',{token:accessToken});
  if(!tables.length){qrMessage('No hay mesas activas para imprimir.');qrCardsLoaded=false;return;}
  for(const table of tables){
   const card=document.createElement('article');card.className='qr-print-card';
   const brand=document.createElement('span');brand.className='qr-print-brand';brand.textContent='Taplygt • Orders';
   const caption=document.createElement('span');caption.className='qr-print-caption';caption.textContent='ESCANEA Y ORDENA';
   const tableLabel=document.createElement('h3');tableLabel.textContent='Mesa '+String(table.table_number).padStart(2,'0');
   const qr=document.createElement('div');qr.className='qr-image';qr.setAttribute('aria-label','QR para mesa '+table.table_number);
   const intro=document.createElement('p');intro.textContent='Explora el menú, elige lo que se te antoja y envía tu pedido desde tu mesa.';
   const footer=document.createElement('small');footer.textContent='Pide desde tu celular · Pago en caja';
   card.append(brand,caption,tableLabel,qr,intro,footer);
   preview.appendChild(card);
   new QRCode(qr,{text:qrMenuUrl(table),width:185,height:185,colorDark:'#122c23',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
   const download=document.createElement('button');
   download.type='button';
   download.className='soft-button qr-download';
   download.textContent='↓ Guardar QR PNG';
   download.setAttribute('aria-label','Guardar QR de mesa '+table.table_number);
   download.addEventListener('click',()=>{
     const canvas=qr.querySelector('canvas');
     const image=qr.querySelector('img');
     const data=canvas?.toDataURL('image/png')||(image?.src.startsWith('data:image/png')?image.src:null);
     if(!data){qrMessage('El QR aún no está listo. Prueba otra vez.');return;}
     const anchor=document.createElement('a');
     anchor.href=data;anchor.download='taplygt-mesa-'+table.table_number+'.png';
     document.body.appendChild(anchor);anchor.click();anchor.remove();
   });
   card.appendChild(download);
  }
  qrCardsLoaded=true;print.disabled=false;
  qrMessage(tables.length+' tarjetas QR listas. Puedes imprimirlas o guardarlas como PDF desde las opciones de impresión.');
 }catch(error){
  qrCardsLoaded=false;preview.replaceChildren();
  qrMessage('No se pudieron generar los QR: '+error.message);
 }finally{qrCardsBusy=false;}
}
document.getElementById('previewQrCards').addEventListener('click',async()=>{
 document.getElementById('mesas').open=true;
 await loadQrCards();
 document.getElementById('qrCards').scrollIntoView({behavior:'smooth',block:'start'});
});
document.getElementById('printQrCards').addEventListener('click',()=>{
 if(!qrCardsLoaded||!accessToken||!staffRestaurantId)return;
 document.body.classList.add('printing-qr');
 window.print();
});
window.addEventListener('afterprint',()=>document.body.classList.remove('printing-qr'));
window.addEventListener('beforeunload',()=>document.body.classList.remove('printing-qr'));
