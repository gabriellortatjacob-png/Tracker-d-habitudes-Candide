window.Shop = (() => {
  const catalog = [
    {id:'tree', name:'Pommier de Pangloss', icon:'🍎', price:60, shape:'tree', desc:'Optimiste, rond et généreux.'},
    {id:'flowers', name:'Massif de constance', icon:'🌸', price:40, shape:'flowers', desc:'Des fleurs pour célébrer les petites victoires.'},
    {id:'house', name:'Maison du jardinier', icon:'🏡', price:120, shape:'house', desc:'Un foyer chaleureux au milieu des efforts.'},
    {id:'farm', name:'Ferme miniature', icon:'🚜', price:95, shape:'farm', desc:'Travaille la terre avec patience.'},
    {id:'vegetable', name:'Potager de Candide', icon:'🥕', price:50, shape:'vegetable', desc:'La métaphore au premier degré.'},
    {id:'fountain', name:'Fontaine des séries', icon:'⛲', price:110, shape:'fountain', desc:'Chante quand les habitudes tiennent.'}
  ];
  function buy(user, id){
    const item = catalog.find(i=>i.id===id); if(!item) return 'Objet introuvable.';
    if(user.coins < item.price) return `Il manque ${item.price-user.coins} pièces pour ${item.name}.`;
    user.coins -= item.price; user.inventory[id]=(user.inventory[id]||0)+1;
    return `${item.icon} ${item.name} rejoint ton inventaire.`;
  }
  function render(user, shopEl, invEl, selectedItem, callbacks){
    shopEl.innerHTML=''; invEl.innerHTML='';
    catalog.forEach(item=>{
      const row=document.createElement('div'); row.className='shop-item';
      row.innerHTML=`<span class="shop-icon">${item.icon}</span><span class="shop-copy"><strong>${item.name}</strong><small>${item.desc}</small><br><span class="price">${item.price} 🪙</span></span>`;
      const b=document.createElement('button'); b.className='primary'; b.textContent='Acheter'; b.onclick=()=>callbacks.buy(item.id); row.append(b); shopEl.append(row);
    });
    const entries=Object.entries(user.inventory).filter(([,n])=>n>0);
    if(!entries.length){ invEl.innerHTML='<div class="empty">Achète un objet puis sélectionne-le pour le poser.</div>'; return; }
    entries.forEach(([id,n])=>{
      const item=catalog.find(i=>i.id===id); const row=document.createElement('button'); row.type='button'; row.className='inventory-item'+(selectedItem===id?' selected':'');
      row.innerHTML=`<span>${item.icon}</span><strong>${item.name}</strong><span>x${n}</span>`; row.onclick=()=>callbacks.select(id); invEl.append(row);
    });
  }
  return { catalog, buy, render, getItem:(id)=>catalog.find(i=>i.id===id) };
})();
