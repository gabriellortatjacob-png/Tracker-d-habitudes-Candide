window.Shop = (() => {
  let activeCategory = 'nature';
  const categories = [
    { id:'nature', label:'Nature' },
    { id:'building', label:'Bâtiments' },
    { id:'decor', label:'Déco' },
    { id:'clean', label:'Nettoyer' }
  ];
  const catalog = [
    {id:'tree', name:'Arbre', icon:'🌳', price:60, category:'nature', desc:'Du jeune plant à l’arbre magique.', levels:['tree_n1','tree_n2','tree_n3','tree_n4'], upgrade:[80,140,260]},
    {id:'bush', name:'Buisson', icon:'🌿', price:45, category:'nature', desc:'Rond, fleuri, taillé puis lumineux.', levels:['bush_n1','bush_n2','bush_n3','bush_n4'], upgrade:[65,110,190]},
    {id:'flowers', name:'Fleurs', icon:'🌸', price:40, category:'nature', desc:'Marguerites, tulipes, roses, magie.', levels:['flowers_n1','flowers_n2','flowers_n3','flowers_n4'], upgrade:[55,100,175]},
    {id:'vegetable', name:'Potager', icon:'🥕', price:55, category:'nature', desc:'Carré de terre qui devient abondant.', levels:['vegetable_n1','vegetable_n2','vegetable_n3','vegetable_n4'], upgrade:[75,130,220]},
    {id:'house', name:'Maison', icon:'🏡', price:120, category:'building', desc:'Cabane puis manoir de jardinier.', levels:['house_n1','house_n2','house_n3','house_n4'], upgrade:[180,300,520]},
    {id:'farm', name:'Ferme', icon:'🚜', price:100, category:'building', desc:'Enclos, animaux, grange, ferme complète.', levels:['farm_n1','farm_n2','farm_n3','farm_n4'], upgrade:[150,240,430]},
    {id:'fountain', name:'Fontaine', icon:'⛲', price:110, category:'decor', desc:'Bassin, jets, ornements et lumière.', levels:['fountain_n1','fountain_n2','fountain_n3','fountain_n4'], upgrade:[160,260,460]},
    {id:'stone', name:'Pierre déco', icon:'🪨', price:35, category:'decor', desc:'Roche ronde avec ombre intégrée.', levels:['stone_n1','stone_n2'], upgrade:[70]},
    {id:'fence', name:'Clôture bois', icon:'🪵', price:30, category:'decor', desc:'Bordure bois chunky.', levels:['fence_n1','fence_n2'], upgrade:[60]},
    {id:'lamp', name:'Lampadaire', icon:'💡', price:70, category:'decor', desc:'Lumière chaude pour le soir.', levels:['lamp_n1','lamp_n2'], upgrade:[120]}
  ];

  const spritePath = key => `assets/sprites/${key}.png`;
  const getItem = id => catalog.find(i => i.id === id);
  const selectedClass = (selectedItem, id) => selectedItem === id ? ' selected' : '';

  function buy(user, id){
    const item = getItem(id); if(!item) return 'Objet introuvable.';
    if(user.coins < item.price) return `Il manque ${item.price-user.coins} pièces pour ${item.name}.`;
    user.coins -= item.price;
    user.inventory[id] = (user.inventory[id] || 0) + 1;
    return `${item.icon} ${item.name} rejoint ton inventaire.`;
  }

  function render(user, shopEl, invEl, selectedItem, callbacks = {}, context = {}){
    shopEl.innerHTML = '';
    invEl.innerHTML = '';
    const tabs = document.createElement('div');
    tabs.className = 'shop-tabs';
    categories.forEach(cat => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = cat.label; b.className = activeCategory === cat.id ? 'active' : '';
      b.onclick = () => { activeCategory = cat.id; callbacks.refresh?.(); };
      tabs.append(b);
    });
    shopEl.append(tabs);

    const cards = document.createElement('div');
    cards.className = 'shop-strip';
    shopEl.append(cards);

    if(activeCategory === 'clean'){
      const card = document.createElement('article');
      card.className = 'shop-card cat-clean';
      card.innerHTML = `<div class="shop-art"><img src="assets/sprites/weed_1.png" alt="Nettoyer"></div><div class="price-badge">15 🪙</div><strong>Nettoyer</strong><small>Retire rochers, souches et mauvaises herbes.</small>`;
      const b = document.createElement('button'); b.className='danger buy-button'; b.textContent='Mode nettoyage'; b.onclick=()=>callbacks.cleanMode?.();
      card.append(b); cards.append(card);
    } else {
      catalog.filter(i => i.category === activeCategory).forEach(item => {
        const hasCoins = user.coins >= item.price;
        const card = document.createElement('article');
        card.className = `shop-card cat-${item.category}${selectedClass(selectedItem,item.id)}${hasCoins?'':' locked'}`;
        card.innerHTML = `<div class="shop-art"><img src="${spritePath(item.levels[0])}" alt="${item.name}"></div><div class="price-badge">${item.price} 🪙</div><strong>${item.name}</strong><small>${item.desc}</small>`;
        const buyButton = document.createElement('button');
        buyButton.className='primary buy-button'; buyButton.textContent=hasCoins?'Acheter':'🔒 Pas assez'; buyButton.disabled=!hasCoins;
        buyButton.onclick=ev=>{ ev.currentTarget.classList.add('pressed'); setTimeout(()=>ev.currentTarget.classList.remove('pressed'),140); callbacks.buy?.(item.id); };
        card.onclick = e => { if(e.target.tagName !== 'BUTTON') callbacks.select?.(item.id); };
        card.append(buyButton); cards.append(card);
      });
    }

    const inventoryTitle = document.createElement('div');
    inventoryTitle.className = 'inventory-title';
    inventoryTitle.textContent = 'Inventaire / Placement';
    invEl.append(inventoryTitle);
    const invGrid = document.createElement('div');
    invGrid.className = 'inventory-strip';
    invEl.append(invGrid);
    const entries = Object.entries(user.inventory || {}).filter(([,n]) => n > 0);
    if(!entries.length){ invGrid.innerHTML = '<div class="empty mini">Achète un objet puis sélectionne-le pour le poser.</div>'; }
    entries.forEach(([id,n]) => {
      const item = getItem(id); if(!item) return;
      const cell = document.createElement('button');
      cell.type = 'button'; cell.className = `inventory-tile${selectedClass(selectedItem,id)}`;
      cell.innerHTML = `<img src="${spritePath(item.levels[0])}" alt="${item.name}"><span class="qty-badge">x${n}</span><small>${item.name}</small>`;
      cell.onclick = () => callbacks.select?.(selectedItem === id ? null : id);
      invGrid.append(cell);
    });

    if(context.selectedPlaced){
      const def = getItem(context.selectedPlaced.itemId);
      const level = context.selectedPlaced.level || 1;
      const cost = def?.upgrade?.[level-1];
      const upgrade = document.createElement('div');
      upgrade.className = 'upgrade-panel';
      upgrade.innerHTML = `<strong>${def?.name || 'Objet'} niveau ${level}</strong><small>${cost ? `Améliorer pour ${cost} 🪙` : 'Niveau maximum atteint'}</small>`;
      const b = document.createElement('button'); b.className='secondary'; b.textContent = cost ? 'Améliorer' : 'Max'; b.disabled = !cost || user.coins < cost;
      b.onclick = () => callbacks.upgrade?.(context.selectedPlaced);
      upgrade.append(b); invEl.append(upgrade);
    }
  }

  return { catalog, categories, buy, render, getItem, spritePath };
})();
