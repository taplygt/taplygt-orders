/* Taplygt commercial demo. All data stays in browser memory. Never calls Supabase. */
'use strict';
const demoItems=[
 {id:'burger',name:'Hamburguesa clásica',category:'Principales',price:79,description:'Res, cheddar, vegetales frescos y papas.',image:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80'},
 {id:'chicken',name:'Pollo a la parrilla',category:'Principales',price:89,description:'Con vegetales asados y puré suave.',image:'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=500&q=80'},
 {id:'pasta',name:'Pasta Alfredo',category:'Principales',price:72,description:'Salsa cremosa y queso parmesano.',image:'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=500&q=80'},
 {id:'pizza',name:'Pizza artesanal',category:'Pizzas',price:95,description:'Masa dorada, tomate y albahaca.',image:'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=500&q=80'},
 {id:'salad',name:'Ensalada fresca',category:'Entradas',price:48,description:'Vegetales frescos y aderezo de casa.',image:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=80'},
 {id:'coffee',name:'Café de especialidad',category:'Bebidas',price:28,description:'Un espresso perfecto para acompañar.',image:'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=500&q=80'}
];
const initialOrders=[
 {id:1284,table:5,items:[{name:'Hamburguesa clásica',quantity:1},{name:'Limonada natural',quantity:1}],total:111,status:'pending'},
 {id:1282,table:3,items:[{name:'Pollo a la parrilla',quantity:1},{name:'Ensalada fresca',quantity:1}],total:137,status:'preparing'},
 {id:1280,table:4,items:[{name:'Pizza artesanal',quantity:1}],total:95,status:'ready'},
 {id:1279,table:2,items:[{name:'Pasta Alfredo',quantity:1}],total:72,status:'delivered'}
];
let demoOrders=initialOrders.map(x=>({...x,items:x.items.map(i=>({...i}))})),demoCart={},demoCategory='Todos',demoQuery='',demoNextId=1290;
const $=id=>document.getElementById(id);
const Q=n=>'Q'+Number(n||0).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2});
const make=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
const viewContent={
 menu:['LA EXPERIENCIA DEL COMENSAL','Tu menú, a la altura de tu restaurante.','Escoge platos, agrégalos al carrito y envía un pedido de prueba. Después cambia al centro de pedidos y míralo aparecer.'],
 kitchen:['OPERACIÓN EN TIEMPO REAL','Cada pedido, en su lugar.','Mueve las órdenes de recibido a preparación, listo y entregado. Los cambios son interactivos en esta demostración.'],
 insights:['DECISIONES INTELIGENTES','Entiende mejor tu restaurante.','Visualiza cómo podría verse el análisis de actividad, pedidos y platos populares. Los números son completamente ilustrativos.']
};
function setView(view){
 if(!viewContent[view])return;
 for(const tab of document.querySelectorAll('.view-tab')){
  const active=tab.dataset.view===view;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
 }
 for(const name of Object.keys(viewContent)){const el=$('view-'+name);el.hidden=name!==view;el.classList.toggle('active',name===view)}
 [$('viewEyebrow').textContent,$('viewHeading').textContent,$('viewDescription').textContent]=viewContent[view];
 if(view==='kitchen')renderKitchen();
}
document.querySelectorAll('.view-tab').forEach(t=>t.addEventListener('click',()=>setView(t.dataset.view)));
function renderCategories(){
 const categories=['Todos',...new Set(demoItems.map(p=>p.category))];
 const target=$('demoCategories');target.replaceChildren();
 categories.forEach(cat=>{
  const button=make('button',cat===demoCategory?'selected':'',cat);button.type='button';
  button.setAttribute('aria-pressed',String(cat===demoCategory));
  button.addEventListener('click',()=>{demoCategory=cat;renderCategories();renderProducts()});
  target.appendChild(button);
 });
}
function renderProducts(){
 const target=$('demoProducts');target.replaceChildren();
 const products=demoItems.filter(p=>(demoCategory==='Todos'||p.category===demoCategory)&&(p.name+' '+p.description).toLocaleLowerCase('es').includes(demoQuery));
 if(!products.length){target.append(make('p','demo-empty','No hay platos con esa búsqueda.'));return;}
 for(const p of products){
  const card=make('article','demo-product');
  const image=make('img');image.src=p.image;image.alt='Fotografía ilustrativa de '+p.name;image.loading='lazy';
  image.addEventListener('error',()=>{image.style.display='none';card.style.background='#eaf1e7'});
  const info=make('div','demo-product-info');
  info.append(make('small','',p.category),make('strong','',p.name),make('p','',p.description));
  const bottom=make('div','demo-product-bottom');bottom.append(make('b','',Q(p.price)));
  const add=make('button','','+');add.type='button';add.setAttribute('aria-label','Agregar '+p.name);
  add.addEventListener('click',()=>{demoCart[p.id]=Math.min(20,(demoCart[p.id]||0)+1);renderCart();add.textContent='✓';setTimeout(()=>add.textContent='+',650)});
  bottom.append(add);info.append(bottom);card.append(image,info);target.append(card);
 }
}
function cartCount(){return Object.values(demoCart).reduce((a,b)=>a+b,0)}
function cartTotal(){return demoItems.reduce((sum,p)=>sum+(demoCart[p.id]||0)*p.price,0)}
function renderCart(){
 $('demoCartCount').textContent=cartCount();$('demoCartTotal').textContent=Q(cartTotal())+' ↗';$('demoDrawerTotal').textContent=Q(cartTotal());
 const target=$('demoCartLines');target.replaceChildren();
 const selected=demoItems.filter(p=>demoCart[p.id]>0);
 if(!selected.length){target.append(make('p','demo-empty','Tu pedido está vacío. Elige algo delicioso.'))}
 for(const p of selected){
  const line=make('div','cart-line');line.append(make('span','',p.name));
  const controls=make('div','cart-qty');
  const minus=make('button','','−');minus.type='button';minus.setAttribute('aria-label','Quitar '+p.name);minus.addEventListener('click',()=>changeQuantity(p.id,-1));
  const qty=make('span','',demoCart[p.id]);
  const plus=make('button','','+');plus.type='button';plus.setAttribute('aria-label','Agregar '+p.name);plus.disabled=demoCart[p.id]>=20;plus.addEventListener('click',()=>changeQuantity(p.id,1));
  controls.append(minus,qty,plus);line.append(controls);target.append(line);
 }
 $('demoPlaceOrder').disabled=cartCount()===0;
}
function changeQuantity(id,delta){const next=Math.max(0,Math.min(20,(demoCart[id]||0)+delta));if(next)demoCart[id]=next;else delete demoCart[id];renderCart()}
$('demoSearch').addEventListener('input',e=>{demoQuery=e.target.value.trim().toLocaleLowerCase('es');renderProducts()});
$('demoCartToggle').addEventListener('click',()=>{$('demoCartDrawer').hidden=false});
$('demoCartClose').addEventListener('click',()=>{$('demoCartDrawer').hidden=true});
let toastTimer;
function showToast(value){const t=$('demoToast');t.textContent=value;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),3800)}
$('demoPlaceOrder').addEventListener('click',()=>{
 if(!cartCount())return;
 const items=demoItems.filter(p=>demoCart[p.id]).map(p=>({name:p.name,quantity:demoCart[p.id]}));
 const newOrder={id:++demoNextId,table:5,items,total:cartTotal(),status:'pending',notes:$('demoNotes').value.trim()};
 demoOrders.unshift(newOrder);demoCart={};$('demoNotes').value='';renderCart();
 $('demoCartDrawer').hidden=true;showToast('✓ Pedido de prueba #'+newOrder.id+' enviado. ¡Revísalo en Cocina!');
 renderKitchen();
 setTimeout(()=>setView('kitchen'),900);
});
const kitchenStatuses=[['pending','Recibido'],['preparing','Preparando'],['ready','Listo'],['delivered','Entregado']];
const nextKitchen={pending:'preparing',preparing:'ready',ready:'delivered'};
const nextLabel={pending:'Iniciar preparación →',preparing:'Marcar listo →',ready:'Marcar entregado ✓'};
function renderKitchen(){
 $('kpiTotalOrders').textContent=demoOrders.length;
 $('kpiPending').textContent=demoOrders.filter(o=>o.status!=='delivered').length;
 $('kpiDone').textContent=demoOrders.filter(o=>o.status==='delivered').length;
 $('pendingBadge').textContent=demoOrders.filter(o=>o.status!=='delivered').length;
 const board=$('demoKanban');board.replaceChildren();
 for(const [status,label] of kitchenStatuses){
  const orders=demoOrders.filter(o=>o.status===status);
  const column=make('section','kanban-column');column.dataset.status=status;
  const head=make('div','kanban-heading');head.append(make('span','',label),make('span','',orders.length));column.append(head);
  if(!orders.length)column.append(make('p','kanban-empty','No hay pedidos en esta etapa.'));
  for(const order of orders){
   const card=make('article','kanban-order');card.append(make('strong','','#'+order.id+' · Mesa '+order.table),make('small','',order.items.map(i=>i.quantity+' × '+i.name).join(' · ')),make('span','order-total',Q(order.total)));
   if(nextKitchen[status]){
    const button=make('button','',nextLabel[status]);button.type='button';
    button.addEventListener('click',()=>{order.status=nextKitchen[status];renderKitchen()});
    card.append(button);
   }
   column.append(card);
  }
  board.append(column);
 }
}
$('resetDemo').addEventListener('click',()=>{demoOrders=initialOrders.map(x=>({...x,items:x.items.map(i=>({...i}))}));demoNextId=1290;demoCart={};renderCart();renderKitchen()});
renderCategories();renderProducts();renderCart();renderKitchen();
