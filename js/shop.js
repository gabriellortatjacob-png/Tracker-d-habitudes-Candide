window.Shop = (() => {
  let activeCategory = 'all';
  const catalog = [
    {id:'tree', name:'Pommier de Pangloss', icon:'🍎', price:60, shape:'tree', category:'nature', desc:'Optimiste, rond et généreux.'},
    {id:'flowers', name:'Massif de constance', icon:'🌸', price:40, shape:'flowers', category:'nature', desc:'Des fleurs pour les petites victoires.'},
    {id:'house', name:'Maison du jardinier', icon:'🏡', price:120, shape:'house', category:'building', desc:'Un foyer chaleureux au milieu des efforts.'},
    {id:'farm', name:'Ferme miniature', icon:'🚜', price:95, shape:'farm', category:'building', desc:'Travaille la terre avec patience.'},
    {id:'vegetable', name:'Potager de Candide', icon:'🥕', price:50, shape:'vegetable', category:'nature', desc:'La métaphore au premier degré.'},
    {id:'fountain', name:'Fontaine des séries', icon:'⛲', price:110, shape:'fountain', category:'decor', desc:'Chante quand les habitudes tiennent.'}
  ];
  const categories = [
    { id:'all', label:'Tout' },
    { id:'nature', label:'Nature' },
    { id:'building', label:'Bâtiments' },
    { id:'decor', label:'Déco' }
  ];
  function buy(user, id){
    const item = catalog.find(i=>i.id===id); if(!item) return 'Objet introuvable.';
    if(user.coins < item.price) return `Il manque ${item.price-user.coins} pièces pour ${item.name}.`;
    user.coins -= item.price; user.inventory[id]=(user.inventory[id]||0)+1;
    return `${item.icon} ${item.name} rejoint ton inventaire.`;
  }
  function render(user, shopEl, invEl, selectedItem, callbacks){
    shopEl.innerHTML=''; invEl.innerHTML='';
    const tabs = document.createElement('div'); tabs.className = 'shop-tabs';
    categories.forEach(cat => {
      const b=document.createElement('button'); b.type='button'; b.textContent=cat.label; b.className=activeCategory===cat.id?'active':'';
      b.onclick=()=>{ activeCategory=cat.id; callbacks.refresh(); };
      tabs.append(b);
    });
    shopEl.append(tabs);
    const cards=document.createElement('div'); cards.className='shop-card-grid'; shopEl.append(cards);
    catalog.filter(i=>activeCategory==='all'||i.category===activeCategory).forEach(item=>{
      const card=document.createElement('article'); card.className=`shop-card cat-${item.category}`;
      card.innerHTML=`<div class="shop-illustration">${item.icon}</div><div class="price-badge">${item.price} 🪙</div><strong>${item.name}</strong><small>${item.desc}</small>`;
      const b=document.createElement('button'); b.className='primary buy-button'; b.textContent='Acheter'; b.onclick=()=>callbacks.buy(item.id); card.append(b); cards.append(card);
    });
    const entries=Object.entries(user.inventory).filter(([,n])=>n>0);
    if(!entries.length){ invEl.innerHTML='<div class="empty">Achète un objet puis sélectionne-le pour le poser.</div>'; return; }
    const invGrid=document.createElement('div'); invGrid.className='inventory-grid'; invEl.append(invGrid);
    entries.forEach(([id,n])=>{
      const item=catalog.find(i=>i.id===id); if(!item) return;
      const cell=document.createElement('button'); cell.type='button'; cell.className='inventory-tile'+(selectedItem===id?' selected':'');
      cell.innerHTML=`<span class="inventory-icon">${item.icon}</span><span class="qty-badge">x${n}</span><small>${item.name}</small>`;
      cell.onclick=()=>callbacks.select(id); invGrid.append(cell);
    });
  }
  return { catalog, buy, render, getItem:(id)=>catalog.find(i=>i.id===id) };
})();
