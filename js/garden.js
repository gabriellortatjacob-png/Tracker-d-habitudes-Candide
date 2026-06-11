window.Garden = (() => {
  const tileW = 86;
  const tileH = 43;
  const depth = 14;
  const views = new WeakMap();

  function createGarden() {
    const width = 20, height = 20;
    const tiles = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) tiles.push({ x, y, type: (x + y) % 5 === 0 ? 'soil' : 'grass' });
    }
    const obstacles = [];
    for (let y = 1; y < height; y += 3) {
      for (let x = (y % 2) + 1; x < width; x += 5) {
        if (obstacles.length < 28) obstacles.push({ id: `o_${x}_${y}`, x, y, type: (x + y) % 2 ? 'weed' : 'rock' });
      }
    }
    return { width, height, tiles, items: [], obstacles, effects: [] };
  }

  function upgradeGarden(garden) {
    if (!garden || garden.width >= 20) return garden;
    const fresh = createGarden();
    garden.width = fresh.width;
    garden.height = fresh.height;
    garden.tiles = fresh.tiles;
    garden.obstacles = [...(garden.obstacles || []), ...fresh.obstacles].filter((o, idx, arr) => idx === arr.findIndex(x => x.x === o.x && x.y === o.y));
    garden.effects ||= [];
    return garden;
  }

  function getView(canvas) {
    if (!views.has(canvas)) {
      views.set(canvas, { offsetX: 0, offsetY: -160, hover: null, dragging: false, moved: false, lastX: 0, lastY: 0, selectedPulse: 0 });
    }
    return views.get(canvas);
  }

  function logicalSize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, Math.round(rect.width || Number(canvas.getAttribute('width')) || 1000));
    const h = Math.max(260, Math.round(rect.height || Number(canvas.getAttribute('height')) || 620));
    return { w, h };
  }

  function iso(x, y, originX, originY, camera) {
    return { x: originX + camera.offsetX + (x - y) * tileW / 2, y: originY + camera.offsetY + (x + y) * tileH / 2 };
  }

  function shade(hex, factor) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * factor)));
    const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * factor)));
    const b = Math.max(0, Math.min(255, Math.round((n & 255) * factor)));
    return `rgb(${r},${g},${b})`;
  }

  function diamondPath(ctx, cx, cy, z = 0) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - tileH / 2 - z);
    ctx.lineTo(cx + tileW / 2, cy - z);
    ctx.lineTo(cx, cy + tileH / 2 - z);
    ctx.lineTo(cx - tileW / 2, cy - z);
    ctx.closePath();
  }

  function drawTile(ctx, cx, cy, color, hover, selected) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.30)';
    diamondPath(ctx, cx + 9, cy + 12); ctx.fill();
    // front and side faces give the ground a blocky HayDay/CoC feeling.
    ctx.fillStyle = shade(color, .70);
    ctx.beginPath(); ctx.moveTo(cx - tileW / 2, cy); ctx.lineTo(cx, cy + tileH / 2); ctx.lineTo(cx, cy + tileH / 2 + depth); ctx.lineTo(cx - tileW / 2, cy + depth); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(color, .82);
    ctx.beginPath(); ctx.moveTo(cx + tileW / 2, cy); ctx.lineTo(cx, cy + tileH / 2); ctx.lineTo(cx, cy + tileH / 2 + depth); ctx.lineTo(cx + tileW / 2, cy + depth); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(color, .98); diamondPath(ctx, cx, cy); ctx.fill();
    ctx.lineWidth = 2.6; ctx.strokeStyle = '#244922'; diamondPath(ctx, cx, cy); ctx.stroke();
    if (hover) { ctx.fillStyle = 'rgba(255,255,255,.15)'; diamondPath(ctx, cx, cy); ctx.fill(); }
    if (selected) {
      const pulse = 2 + Math.sin(performance.now() / 230) * 1.7;
      ctx.lineWidth = 3.5 + pulse; ctx.strokeStyle = '#ffe45e'; diamondPath(ctx, cx, cy - pulse * .4); ctx.stroke();
    }
    ctx.restore();
  }

  function drawIsoBox(ctx, cx, cy, w, h, z, color) {
    const top = cy - z;
    ctx.save(); ctx.lineWidth = 2.8; ctx.strokeStyle = '#203c1f';
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(cx + 8, cy + 8, w * .62, h * .36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade(color, .70);
    ctx.beginPath(); ctx.moveTo(cx - w/2, top); ctx.lineTo(cx, top + h/2); ctx.lineTo(cx, cy + h/2); ctx.lineTo(cx - w/2, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(cx + w/2, top); ctx.lineTo(cx, top + h/2); ctx.lineTo(cx, cy + h/2); ctx.lineTo(cx + w/2, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade(color, .85);
    ctx.beginPath(); ctx.moveTo(cx, top - h/2); ctx.lineTo(cx + w/2, top); ctx.lineTo(cx, top + h/2); ctx.lineTo(cx - w/2, top); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawItem(ctx, item, cx, cy) {
    const def = Shop.getItem(item.itemId) || {};
    const age = Math.min(1, (Date.now() - (item.placedAt || 0)) / 200);
    const scale = item.placedAt ? easeOut(age) : 1;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy);
    if (def.shape === 'tree') {
      drawIsoBox(ctx, cx, cy - 4, 18, 12, 42, '#9a612e');
      ctx.lineWidth = 2.7; ctx.strokeStyle = '#203c1f';
      ctx.fillStyle = 'rgba(0,0,0,.20)'; ctx.beginPath(); ctx.ellipse(cx + 8, cy - 44, 34, 20, .2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#35b84a'; ctx.beginPath(); ctx.ellipse(cx - 5, cy - 58, 34, 29, -.18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#69d95f'; ctx.beginPath(); ctx.ellipse(cx - 14, cy - 66, 20, 13, -.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff5347'; ['-4,-67','11,-55','-18,-51'].forEach(s=>{const [a,b]=s.split(',').map(Number);ctx.beginPath();ctx.arc(cx+a,cy+b,4,0,Math.PI*2);ctx.fill();});
    } else if (def.shape === 'flowers') {
      drawIsoBox(ctx, cx, cy - 2, 58, 28, 10, '#9a5a32');
      ['#ff5aa5','#ffd447','#7cdbff','#ff834d'].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(cx-22+i*15,cy-26-(i%2)*6,8,0,Math.PI*2);ctx.fill();ctx.stroke();});
    } else if (def.shape === 'house') {
      drawIsoBox(ctx, cx, cy, 68, 42, 45, '#ffbf5a');
      drawIsoBox(ctx, cx, cy - 47, 78, 48, 18, '#ef5753');
    } else if (def.shape === 'farm') {
      drawIsoBox(ctx, cx, cy, 74, 40, 34, '#d88435');
      drawIsoBox(ctx, cx, cy - 36, 82, 45, 16, '#f2e9cf');
      ctx.fillStyle='#fff'; ctx.fillRect(cx-9, cy-35, 18, 25); ctx.strokeRect(cx-9, cy-35, 18, 25);
    } else if (def.shape === 'vegetable') {
      drawIsoBox(ctx, cx, cy, 72, 38, 9, '#a45d2b');
      ctx.fillStyle='#34ba55'; for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(cx-28+i*11,cy-24,7,13,.4,0,Math.PI*2);ctx.fill();ctx.stroke();}
    } else if (def.shape === 'fountain') {
      drawIsoBox(ctx, cx, cy, 64, 38, 18, '#77cfff');
      drawIsoBox(ctx, cx, cy - 24, 38, 22, 22, '#a4e7ff');
      ctx.fillStyle='#49b9ff'; ctx.beginPath();ctx.arc(cx,cy-58,13,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
    ctx.restore();
  }

  function drawObstacle(ctx, o, cx, cy, alpha = 1, scale = 1) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy); ctx.lineWidth=2.8; ctx.strokeStyle='#203c1f';
    if(o.type==='rock'){ drawIsoBox(ctx, cx, cy, 44, 28, 18, '#9aa1a8'); }
    else { ctx.fillStyle='#2f9b39'; for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(cx-22+i*9,cy-18,7,24,.45-i*.16,0,Math.PI*2);ctx.fill();ctx.stroke();} }
    ctx.restore();
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function render(canvas, garden, selected, readOnly = false) {
    upgradeGarden(garden);
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = logicalSize(canvas);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    canvas.dataset.logicalWidth = String(w); canvas.dataset.logicalHeight = String(h);
    const camera = getView(canvas);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#4fb83f'; ctx.fillRect(0, 0, w, h);
    const originX = w / 2;
    const originY = 70;
    const hover = camera.hover;

    [...garden.tiles].sort((a,b)=>(a.x+a.y)-(b.x+b.y)).forEach(t => {
      const p = iso(t.x, t.y, originX, originY, camera);
      const onscreen = p.x > -tileW && p.x < w + tileW && p.y > -80 && p.y < h + 120;
      if (!onscreen) return;
      const color = t.type === 'soil' ? '#c98545' : ((t.x + t.y) % 2 ? '#66cf52' : '#5dc64d');
      drawTile(ctx, p.x, p.y, color, hover && hover.x === t.x && hover.y === t.y, selected && selected.x === t.x && selected.y === t.y);
    });

    const drawables = [
      ...(garden.obstacles || []).map(o => ({ ...o, kind: 'ob' })),
      ...(garden.items || []).map(i => ({ ...i, kind: 'item' }))
    ].sort((a,b)=>(a.x+a.y)-(b.x+b.y) || a.y-b.y);
    drawables.forEach(o => { const p = iso(o.x, o.y, originX, originY, camera); if(p.x < -120 || p.x > w+120 || p.y < -160 || p.y > h+160) return; o.kind==='ob'?drawObstacle(ctx,o,p.x,p.y):drawItem(ctx,o,p.x,p.y); });
    garden.effects = (garden.effects || []).filter(effect => {
      const age = (Date.now() - effect.started) / 150;
      if (age >= 1) return false;
      const p = iso(effect.x, effect.y, originX, originY, camera);
      drawObstacle(ctx, effect, p.x, p.y, 1 - age, 1 - age * .45);
      return true;
    });
  }

  function tileFromPoint(canvas, garden, clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const { w, h } = logicalSize(canvas);
    const x = (clientX - r.left) * w / r.width;
    const y = (clientY - r.top) * h / r.height;
    const camera = getView(canvas);
    const originX = w / 2, originY = 70;
    let best = null, dist = 1e9;
    garden.tiles.forEach(t => { const p = iso(t.x, t.y, originX, originY, camera); const d = Math.abs(x-p.x)/(tileW/2)+Math.abs(y-p.y)/(tileH/2); if(d<1 && d<dist){best=t;dist=d;} });
    return best;
  }

  function attach(canvas, getGarden, callbacks) {
    const view = getView(canvas);
    const redraw = () => callbacks.onRedraw && callbacks.onRedraw();
    const point = e => e.touches ? e.touches[0] : e;
    canvas.addEventListener('pointerdown', e => { view.dragging = true; view.moved = false; view.lastX = e.clientX; view.lastY = e.clientY; canvas.setPointerCapture?.(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      const garden = getGarden(); if (!garden) return;
      if (view.dragging) { const dx=e.clientX-view.lastX, dy=e.clientY-view.lastY; if(Math.abs(dx)+Math.abs(dy)>2) view.moved=true; view.offsetX += dx; view.offsetY += dy; view.lastX=e.clientX; view.lastY=e.clientY; redraw(); return; }
      view.hover = tileFromPoint(canvas, garden, e.clientX, e.clientY); canvas.style.cursor = view.hover ? 'pointer' : 'grab'; redraw();
    });
    const end = e => { const garden=getGarden(); const p=point(e); if(view.dragging && garden && !view.moved){ callbacks.onTileClick?.(tileFromPoint(canvas,garden,p.clientX,p.clientY)); } view.dragging=false; canvas.style.cursor='grab'; redraw(); };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', () => { view.dragging=false; });
    canvas.addEventListener('mouseleave', () => { view.hover=null; view.dragging=false; redraw(); });
    // Touch: one finger pan/click, no browser scroll hijack inside canvas.
    canvas.addEventListener('touchmove', e => e.preventDefault(), { passive:false });
  }

  function isOccupied(g,x,y){ return g.items.some(i=>i.x===x&&i.y===y)||g.obstacles.some(o=>o.x===x&&o.y===y); }
  function place(user,itemId,tile){ if(!tile) return 'Choisis une tuile.'; if(isOccupied(user.garden,tile.x,tile.y)) return 'Cette parcelle est déjà occupée.'; if((user.inventory[itemId]||0)<1) return 'Cet objet manque dans ton inventaire.'; user.inventory[itemId]--; user.garden.items.push({id:'p_'+Date.now()+Math.random().toString(36).slice(2,5), itemId, x:tile.x, y:tile.y, placedAt:Date.now()}); return 'Un nouveau coin du jardin prend vie.'; }
  function clean(user,tile){ if(!tile) return 'Choisis une tuile encombrée.'; const idx=user.garden.obstacles.findIndex(o=>o.x===tile.x&&o.y===tile.y); if(idx<0) return 'Cette tuile est déjà propre.'; if(user.coins<15) return 'Il faut 15 pièces pour nettoyer cette parcelle.'; user.coins-=15; const [removed]=user.garden.obstacles.splice(idx,1); user.garden.effects ||= []; user.garden.effects.push({...removed, started:Date.now()}); return 'Les mauvaises herbes reculent : le jardin respire.'; }

  return { createGarden, upgradeGarden, render, attach, place, clean, isOccupied };
})();
