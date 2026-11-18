async function activateRestaurantPanel(email,restaurantId) {
  staffRestaurantId=restaurantId;
  document.getElementById('loginBox').classList.add('hide');
  document.getElementById('signupBox').classList.add('hide');
  document.getElementById('setupBox').classList.add('hide');
  document.getElementById('dashboard').classList.remove('hide');
  setMessage('staffInfo','Restaurante autorizado · '+email);
  knownOrderIds=null;
  await Promise.all([loadOrders(),loadCatalog(),loadAnalytics()]);
  clearInterval(pollHandle);
  pollHandle=setInterval(loadOrders,pollMs);
}
function showRestaurantSetup(email) {
  document.getElementById('loginBox').classList.add('hide');
  document.getElementById('signupBox').classList.add('hide');
  document.getElementById('dashboard').classList.add('hide');
  document.getElementById('setupBox').classList.remove('hide');
  document.getElementById('setupBox').dataset.email=email;
  setMessage('setupMessage','Tu cuenta está lista. Elige el nombre de tu restaurante.');
}
document.getElementById('openSignup').addEventListener('click',()=>{
  document.getElementById('loginBox').classList.add('hide');
  document.getElementById('signupBox').classList.remove('hide');
});
document.getElementById('backToLogin').addEventListener('click',()=>showLogin());
document.getElementById('setupLogout').addEventListener('click',()=>showLogin('Sesión cerrada.'));
document.getElementById('signupForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const button=event.currentTarget.querySelector('button[type="submit"]');
  button.disabled=true;
  setMessage('signupMessage','Creando cuenta...');
  try{
    const email=document.getElementById('signupEmail').value.trim();
    const password=document.getElementById('signupPassword').value;
    if(password.length<8)throw new Error('La contraseña debe tener al menos 8 caracteres.');
    await supabaseRequest('/auth/v1/signup',{method:'POST',body:{email,password}});
    document.getElementById('signupPassword').value='';
    setMessage('signupMessage','Solicitud enviada. Revisa tu correo para confirmar la cuenta, si se te solicita, y luego inicia sesión para crear tu restaurante.');
  }catch(error){setMessage('signupMessage','No se pudo registrar: '+error.message)}
  finally{button.disabled=false}
});
document.getElementById('setupForm').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!accessToken)return;
  const button=event.currentTarget.querySelector('button[type="submit"]');
  button.disabled=true;
  setMessage('setupMessage','Creando restaurante...');
  try{
    const name=document.getElementById('restaurantName').value.trim();
    const result=await supabaseRequest('/rest/v1/rpc/taplygt_register_restaurant',{
      method:'POST',token:accessToken,body:{p_name:name}
    });
    if(!/^[0-9a-f-]{36}$/i.test(String(result)))throw new Error('No se confirmó el restaurante.');
    await activateRestaurantPanel(document.getElementById('setupBox').dataset.email,result);
    setMessage('panelMessage','Restaurante creado. Agrega productos desde Administrar menú y copia el enlace QR de la mesa 1.');
  }catch(error){setMessage('setupMessage','Error: '+error.message)}
  finally{button.disabled=false}
});

document.getElementById('gettingStartedTables').addEventListener('click',()=>{
  document.getElementById('mesas').open=true;
  showTableLinks();
});
