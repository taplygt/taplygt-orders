let tableManagerBusy=false;
const tableManagerMessage=message=>document.getElementById('tableManagerMessage').textContent=message;
document.getElementById('addTable').addEventListener('click',async()=>{
  if(tableManagerBusy||!accessToken||!staffRestaurantId)return;
  const raw=prompt('Número de la nueva mesa (1 a 9999):');
  if(raw===null)return;
  const number=Number(raw);
  if(!Number.isInteger(number)||number<1||number>9999){tableManagerMessage('Introduce un número entero entre 1 y 9999.');return}
  tableManagerBusy=true;
  try{
    const response=await fetch(SUPABASE_URL+'/rest/v1/tables',{
      method:'POST',
      headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+accessToken,'Content-Type':'application/json',Prefer:'return=representation'},
      body:JSON.stringify({restaurant_id:staffRestaurantId,table_number:number})
    });
    const result=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(result?.message||'No se pudo crear la mesa');
    if(!Array.isArray(result)||!result.length)throw new Error('No se confirmó la creación de la mesa.');
    tableManagerMessage('Mesa '+number+' creada. Ya puedes copiar su enlace QR.');
    await showTableLinks();
    if(!document.getElementById('qrCards').classList.contains('hide'))await loadQrCards();
  }catch(error){tableManagerMessage('Error: '+error.message)}
  finally{tableManagerBusy=false}
});
