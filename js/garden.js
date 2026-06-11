window.Garden = (() => {
  const tileW = 96, tileH = 48, depth = 12;
  const GRID = 24;
  const views = new WeakMap();
  const activeCanvases = new WeakMap();
  const images = new Map();
  const asset = key => `assets/sprites/${key}.png?v=v3-buildings`;
  const tileSprite = { grass_base:'tile_grass_base', grass_flower:'tile_grass_flower', grass_blades:'tile_grass_blades', path:'tile_path' };
  const waterFrames = ['tile_water_1','tile_water_2','tile_water_3'];
  const obstacleSprites = { rock_small:'rock_small', rock_big:'rock_big', weed_1:'weed_1', weed_2:'weed_2', stump:'stump' };

  function loadImage(key){
    if(images.has(key)) return images.get(key);
    const img = new Image();
    img.src = asset(key); img.loaded = false;
    img.onload = () => { img.loaded = true; };
    images.set(key, img);
    return img;
  }
  function drawSprite(ctx, key, x, y, w = 112, h = 112){
    const img = loadImage(key);
    if(img.loaded || img.complete) ctx.drawImage(img, x - w/2, y - h + 26, w, h);
    else { ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(x,y-24,w*.28,h*.18,0,0,Math.PI*2); ctx.fill(); }
  }

  function hash(x,y){ let n = (x*73856093 ^ y*19349663) >>> 0; n = (n ^ (n >> 13)) * 1274126177; return (n >>> 0) / 4294967295; }
  function riverX(y){ return Math.round(11.5 + Math.sin(y * .55) * 2.4 + Math.sin(y * .17) * 1.2); }
  function isRiver(x,y){ const r = riverX(y); return Math.abs(x-r) <= (y%7===0 ? 1 : 0) || x === r; }
  function tileType(x,y){
    if(isRiver(x,y)) return 'water';
    const h = hash(x,y);
    if((x === 5 && y > 2 && y < 20) || (y === 16 && x > 3 && x < 20)) return 'path';
    if(h < .20) return 'grass_flower';
    if(h < .30) return 'grass_blades';
    return 'grass_base';
  }
  function createGarden() {
    const width = GRID, height = GRID;
    const tiles = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) tiles.push({ x, y, type: tileType(x,y) });
    const obstacleTypes = ['rock_small','weed_1','stump','weed_2','rock_big'];
    const obstacles = [];
    for (let y = 1; y < height; y += 3) for (let x = (y % 2) + 1; x < width; x += 5) {
      if(obstacles.length < 38 && tileType(x,y) !== 'water' && tileType(x,y) !== 'path') obstacles.push({ id:`o_${x}_${y}`, x, y, type:obstacleTypes[(x+y)%obstacleTypes.length] });
    }
    return { version:3, width, height, tiles, items: [], obstacles, effects: [] };
  }
  function upgradeGarden(garden) {
    if(!garden) return createGarden();
    const fresh = createGarden();
    if(garden.version !== 3 || garden.width < GRID){
      garden.version = 3; garden.width = GRID; garden.height = GRID; garden.tiles = fresh.tiles;
      garden.obstacles = [...(garden.obstacles || []), ...fresh.obstacles]
        .filter(o => tileType(o.x,o.y) !== 'water')
        .filter((o, idx, arr) => idx === arr.findIndex(x => x.x === o.x && x.y === o.y));
    }
    garden.items ||= []; garden.obstacles ||= []; garden.effects ||= [];
    garden.items.forEach(i => { i.level ||= 1; });
    garden.obstacles.forEach((o,i)=>{ if(o.type === 'rock') o.type = i%2 ? 'rock_big' : 'rock_small'; if(o.type === 'weed') o.type = i%2 ? 'weed_2' : 'weed_1'; });
    return garden;
  }
  function getView(canvas) {
    if (!views.has(canvas)) views.set(canvas, { offsetX:0, offsetY:-120, velocityX:0, velocityY:0, zoom:1, hover:null, dragging:false, moved:false, lastX:0, lastY:0, lastT:0, selectedPulse:0, selectedAction:null, pointerCache:new Map(), pinchDistance:0, pinchZoom:1 });
    return views.get(canvas);
  }
  function logicalSize(canvas) {
    const rect = canvas.getBoundingClientRect?.() || {width:canvas.width || 1000, height:canvas.height || 620};
    return { w:Math.max(320, Math.round(rect.width || Number(canvas.getAttribute?.('width')) || 1000)), h:Math.max(280, Math.round(rect.height || Number(canvas.getAttribute?.('height')) || 620)) };
  }
  function iso(x,y,originX,originY,camera){ const z=camera.zoom || 1; return { x: originX + camera.offsetX + (x-y)*tileW/2*z, y: originY + camera.offsetY + (x+y)*tileH/2*z }; }
  function clampCamera(canvas, garden){
    const view = getView(canvas), {w,h} = logicalSize(canvas);
    const z = view.zoom || 1;
    const minX = -garden.width * tileW / 2 * z, maxX = garden.width * tileW / 2 * z;
    const minY = -garden.height * tileH / 2 * z - 120, maxY = h * .22;
    view.offsetX = Math.max(minX, Math.min(maxX, view.offsetX));
    view.offsetY = Math.max(minY, Math.min(maxY, view.offsetY));
  }
  function diamondPath(ctx,cx,cy){ ctx.beginPath(); ctx.moveTo(cx,cy-tileH/2); ctx.lineTo(cx+tileW/2,cy); ctx.lineTo(cx,cy+tileH/2); ctx.lineTo(cx-tileW/2,cy); ctx.closePath(); }
  function drawIsoShadow(ctx,x,y,rx=30,ry=10){ ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x+8,y+11,rx,ry,0,0,Math.PI*2); ctx.fill(); }
  function drawPlacementOverlay(ctx,p,valid,selected){
    if(!selected) return;
    ctx.save(); diamondPath(ctx,p.x,p.y); ctx.fillStyle = valid ? 'rgba(86,255,114,.34)' : 'rgba(255,65,65,.38)'; ctx.fill(); ctx.lineWidth=4; ctx.strokeStyle=valid?'#b9ff7d':'#ffdddd'; ctx.stroke(); ctx.restore();
  }
  function shopApi(){ return window.Shop || Shop; }
  function spriteForItem(item){ const def = shopApi().getItem(item.itemId); if(!def) return 'stone_n1'; return def.levels[Math.min((item.level || 1)-1, def.levels.length-1)]; }
  function itemAt(g,x,y){ return (g.items || []).find(i => i.x === x && i.y === y) || null; }
  function obstacleAt(g,x,y){ return (g.obstacles || []).find(o => o.x === x && o.y === y) || null; }

  function renderFrame(canvas, timestamp){
    const active = activeCanvases.get(canvas); if(!active) return;
    const { garden, selected, readOnly, placement } = active;
    upgradeGarden(garden); clampCamera(canvas, garden);
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = logicalSize(canvas);
    if(canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)){ canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr); }
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#4fbf47'; ctx.fillRect(0,0,w,h);
    const camera = getView(canvas);
    if(!camera.dragging){ camera.offsetX += camera.velocityX; camera.offsetY += camera.velocityY; camera.velocityX *= .88; camera.velocityY *= .88; if(Math.abs(camera.velocityX)<.03) camera.velocityX=0; if(Math.abs(camera.velocityY)<.03) camera.velocityY=0; }
    const originX = w/2, originY = 88;
    const waterKey = waterFrames[Math.floor(timestamp / 400) % waterFrames.length];
    const hover = camera.hover;

    garden.tiles.sort((a,b)=>(a.x+a.y)-(b.x+b.y)).forEach(t => {
      const p = iso(t.x,t.y,originX,originY,camera);
      const z = camera.zoom || 1;
      if(p.x < -tileW*z || p.x > w + tileW*z || p.y < -80*z || p.y > h + 120*z) return;
      const key = t.type === 'water' ? waterKey : tileSprite[t.type] || 'tile_grass_base';
      drawSprite(ctx,key,p.x,p.y+28*z,110*z,96*z);
      const occupied = isOccupied(garden,t.x,t.y) || t.type === 'water';
      drawPlacementOverlay(ctx,p,!occupied, placement && hover && hover.x===t.x && hover.y===t.y);
      if(selected && selected.x===t.x && selected.y===t.y){ ctx.save(); ctx.lineWidth=3; ctx.strokeStyle='#fff86b'; diamondPath(ctx,p.x,p.y); ctx.stroke(); ctx.restore(); }
    });

    // Painter algorithm: draw all objects sorted by isometric depth (x+y, then y) so front objects cover back objects.
    const drawables = [
      ...(garden.obstacles || []).map(o=>({...o, kind:'obstacle'})),
      ...(garden.items || []).map(i=>({...i, kind:'item'}))
    ].sort((a,b)=>(a.x+a.y)-(b.x+b.y) || a.y-b.y);
    drawables.forEach(o => {
      const p = iso(o.x,o.y,originX,originY,camera);
      const z = camera.zoom || 1;
      if(p.x < -140*z || p.x > w+140*z || p.y < -190*z || p.y > h+170*z) return;
      let bob = 0;
      if(o.kind === 'item' && ['tree','bush','flowers'].includes(o.itemId)) bob = Math.sin(timestamp/480 + o.x*.8 + o.y*.37) * 2;
      if(o.kind === 'obstacle' && String(o.type).startsWith('weed')) bob = Math.sin(timestamp/160 + o.x*7) * 1;
      if(o.kind === 'item'){
        const age = Math.min(1, (Date.now() - (o.placedAt || 0))/300);
        const scale = age < 1 ? easeOutBack(age) : 1;
        drawIsoShadow(ctx,p.x,p.y,30*z,10*z);
        ctx.save(); ctx.translate(p.x,p.y); ctx.scale(scale,scale); ctx.translate(-p.x,-p.y); drawSprite(ctx,spriteForItem(o),p.x,p.y+bob*z,124*z,124*z); ctx.restore();
      } else {
        const shake = o.removing ? Math.sin(timestamp/25)*3 : 0;
        drawIsoShadow(ctx,p.x,p.y,26*z,9*z); drawSprite(ctx,obstacleSprites[o.type] || 'weed_1',p.x+shake*z,p.y+bob*z,112*z,112*z);
      }
    });
    renderEffects(ctx,garden.effects || [], originX, originY, camera, timestamp);
    active.raf = requestAnimationFrame(ts => renderFrame(canvas, ts));
  }
  function renderEffects(ctx,effects,originX,originY,camera,now){
    for(let i=effects.length-1;i>=0;i--){
      const fx=effects[i], age=(Date.now()-fx.started)/(fx.duration || 420); if(age>=1){ effects.splice(i,1); continue; }
      const p=iso(fx.x,fx.y,originX,originY,camera); const alpha=1-age;
      ctx.save(); ctx.globalAlpha=alpha;
      if(fx.type==='place'){
        for(let k=0;k<8;k++){ const a=k*Math.PI*2/8; ctx.fillStyle=k%2?'#ffffff':'#6dff72'; ctx.beginPath(); ctx.arc(p.x+Math.cos(a)*age*42,p.y-18+Math.sin(a)*age*24,4*(1-age)+1,0,Math.PI*2); ctx.fill(); }
        ctx.fillStyle='rgba(255,255,255,.45)'; diamondPath(ctx,p.x,p.y); ctx.fill();
      } else if(fx.type==='clean'){
        for(let k=0;k<6;k++){ ctx.fillStyle='#9c978c'; ctx.beginPath(); ctx.arc(p.x-18+k*8,p.y-20-age*20+(k%2)*8,5*(1-age)+1,0,Math.PI*2); ctx.fill(); }
      }
      ctx.restore();
    }
  }
  function render(canvas, garden, selected, readOnly = false, placement = false){
    const previous = activeCanvases.get(canvas); if(previous?.raf) cancelAnimationFrame(previous.raf);
    activeCanvases.set(canvas,{ garden, selected, readOnly, placement, raf:0 });
    activeCanvases.get(canvas).raf = requestAnimationFrame(ts => renderFrame(canvas, ts));
  }
  function tileFromPoint(canvas,garden,clientX,clientY){
    const r=canvas.getBoundingClientRect(); const {w,h}=logicalSize(canvas); const px=(clientX-r.left)*w/r.width, py=(clientY-r.top)*h/r.height;
    const c=getView(canvas), originX=w/2, originY=88; let best=null, dist=1e9;
    garden.tiles.forEach(t=>{ const p=iso(t.x,t.y,originX,originY,c); const d=Math.abs(px-p.x)/(tileW/2)+Math.abs(py-p.y)/(tileH/2); if(d<1 && d<dist){best=t;dist=d;} });
    return best;
  }
  function clampZoom(value){ return Math.max(.55, Math.min(2.4, value)); }
  function setZoomAround(canvas, garden, nextZoom, clientX, clientY){
    const view = getView(canvas), rect = canvas.getBoundingClientRect(), {w,h}=logicalSize(canvas);
    const px=(clientX-rect.left)*w/rect.width, py=(clientY-rect.top)*h/rect.height;
    const oldZoom = view.zoom || 1, newZoom = clampZoom(nextZoom);
    if(Math.abs(newZoom-oldZoom) < .001) return;
    const originX = w/2, originY = 88;
    // Keep the map point under the fingers / wheel cursor stable while zooming.
    view.offsetX = px - originX - ((px - originX - view.offsetX) * newZoom / oldZoom);
    view.offsetY = py - originY - ((py - originY - view.offsetY) * newZoom / oldZoom);
    view.zoom = newZoom; view.velocityX = 0; view.velocityY = 0;
    clampCamera(canvas, garden);
  }
  function pointerDistance(a,b){ return Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY); }
  function midpoint(a,b){ return { clientX:(a.clientX+b.clientX)/2, clientY:(a.clientY+b.clientY)/2 }; }
  function attach(canvas,getGarden,callbacks){
    const view=getView(canvas); const redraw=()=>callbacks.onRedraw?.();
    canvas.addEventListener('wheel', e=>{ const g=getGarden(); if(!g || !(e.ctrlKey || e.metaKey)) return; e.preventDefault(); const factor = Math.exp(-e.deltaY * .0025); setZoomAround(canvas,g,(view.zoom || 1)*factor,e.clientX,e.clientY); redraw(); }, {passive:false});
    canvas.addEventListener('pointerdown', e=>{ view.pointerCache.set(e.pointerId, {clientX:e.clientX, clientY:e.clientY}); view.dragging=true; view.moved=false; view.lastX=e.clientX; view.lastY=e.clientY; view.lastT=performance.now(); view.velocityX=0; view.velocityY=0; if(view.pointerCache.size===2){ const pts=[...view.pointerCache.values()]; view.pinchDistance=pointerDistance(pts[0],pts[1]); view.pinchZoom=view.zoom || 1; } canvas.setPointerCapture?.(e.pointerId); });
    canvas.addEventListener('pointermove', e=>{
      const g=getGarden(); if(!g) return;
      if(view.pointerCache.has(e.pointerId)) view.pointerCache.set(e.pointerId, {clientX:e.clientX, clientY:e.clientY});
      if(view.pointerCache.size>=2){
        const pts=[...view.pointerCache.values()].slice(0,2), dist=pointerDistance(pts[0],pts[1]);
        if(view.pinchDistance>0){ const mid=midpoint(pts[0],pts[1]); setZoomAround(canvas,g,view.pinchZoom * (dist/view.pinchDistance),mid.clientX,mid.clientY); view.moved=true; redraw(); }
        return;
      }
      if(view.dragging){ const now=performance.now(), dt=Math.max(16,now-view.lastT), dx=e.clientX-view.lastX, dy=e.clientY-view.lastY; if(Math.abs(dx)+Math.abs(dy)>2) view.moved=true; view.offsetX+=dx; view.offsetY+=dy; view.velocityX=dx/(dt/16); view.velocityY=dy/(dt/16); view.lastX=e.clientX; view.lastY=e.clientY; view.lastT=now; clampCamera(canvas,g); redraw(); return; }
      view.hover=tileFromPoint(canvas,g,e.clientX,e.clientY); canvas.style.cursor=view.hover?'pointer':'grab'; redraw();
    });
    const end=e=>{ const g=getGarden(); const wasPinching=view.pointerCache.size>=2; view.pointerCache.delete(e.pointerId); view.pinchDistance=0; if(view.dragging && g && !view.moved && !wasPinching) callbacks.onTileClick?.(tileFromPoint(canvas,g,e.clientX,e.clientY)); view.dragging=false; redraw(); };
    canvas.addEventListener('pointerup',end); canvas.addEventListener('pointercancel',e=>{view.pointerCache.delete(e.pointerId); view.dragging=false; view.pinchDistance=0;});
    canvas.addEventListener('mouseleave',()=>{view.hover=null; view.dragging=false; view.pointerCache.clear(); view.pinchDistance=0; redraw();});
    canvas.addEventListener('touchmove', e=>e.preventDefault(), {passive:false});
  }
  function isOccupied(g,x,y){ return tileType(x,y)==='water' || (g.items||[]).some(i=>i.x===x&&i.y===y) || (g.obstacles||[]).some(o=>o.x===x&&o.y===y); }
  function place(user,itemId,tile){ if(!tile) return 'Choisis une tuile.'; if(tile.type==='water') return 'Impossible de planter dans la rivière.'; if(isOccupied(user.garden,tile.x,tile.y)) return 'Cette parcelle est déjà occupée.'; if((user.inventory[itemId]||0)<1) return 'Cet objet manque dans ton inventaire.'; user.inventory[itemId]--; user.garden.items.push({id:'p_'+Date.now()+Math.random().toString(36).slice(2,5), itemId, level:1, x:tile.x, y:tile.y, placedAt:Date.now()}); user.garden.effects.push({type:'place',x:tile.x,y:tile.y,started:Date.now(),duration:420}); return 'Un nouvel élément est planté : le jardin prend vie.'; }
  function clean(user,tile){ if(!tile) return 'Choisis une tuile encombrée.'; const idx=user.garden.obstacles.findIndex(o=>o.x===tile.x&&o.y===tile.y); if(idx<0) return 'Cette tuile est déjà propre.'; if(user.coins<15) return 'Il faut 15 pièces pour nettoyer cette parcelle.'; user.coins-=15; const [removed]=user.garden.obstacles.splice(idx,1); user.garden.effects.push({type:'clean',x:removed.x,y:removed.y,started:Date.now(),duration:360}); return 'Obstacle nettoyé : poussière et place fraîche.'; }
  function upgradeItem(user,item){ const def=shopApi().getItem(item?.itemId); if(!def) return 'Objet introuvable.'; item.level ||= 1; const cost=def.upgrade?.[item.level-1]; if(!cost) return 'Cet objet est déjà au niveau maximum.'; if(user.coins<cost) return `Il manque ${cost-user.coins} pièces pour améliorer.`; user.coins-=cost; item.level++; user.garden.effects.push({type:'place',x:item.x,y:item.y,started:Date.now(),duration:420}); return `${def.name} amélioré au niveau ${item.level}.`; }
  function easeOutBack(t){ const c1=1.70158, c3=c1+1; return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2); }
  return { createGarden, upgradeGarden, render, attach, place, clean, upgradeItem, isOccupied, itemAt, obstacleAt, setZoomAround };
})();
