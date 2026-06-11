window.Garden = (() => {
  const tileW = 88;
  const tileH = 44;

  function createGarden() {
    const tiles = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 5; x++) {
        tiles.push({ x, y, type: (x + y) % 3 === 0 ? 'soil' : 'grass' });
      }
    }
    return {
      width: 5,
      height: 4,
      tiles,
      items: [],
      obstacles: [
        { id: 'o1', x: 0, y: 1, type: 'weed' },
        { id: 'o2', x: 2, y: 0, type: 'rock' },
        { id: 'o3', x: 4, y: 2, type: 'weed' },
        { id: 'o4', x: 1, y: 3, type: 'rock' }
      ]
    };
  }

  function logicalSize(canvas) {
    const w = Number(canvas.dataset.logicalWidth || canvas.getAttribute('width') || 920);
    const h = Number(canvas.dataset.logicalHeight || canvas.getAttribute('height') || 560);
    canvas.dataset.logicalWidth = String(w);
    canvas.dataset.logicalHeight = String(h);
    return { w, h };
  }

  function iso(x, y, originX, originY) {
    return { x: originX + (x - y) * tileW / 2, y: originY + (x + y) * tileH / 2 };
  }

  function drawDiamond(ctx, cx, cy, color) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - tileH / 2);
    ctx.lineTo(cx + tileW / 2, cy);
    ctx.lineTo(cx, cy + tileH / 2);
    ctx.lineTo(cx - tileW / 2, cy);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#244922';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - tileH / 2 + 5);
    ctx.lineTo(cx + tileW / 2 - 10, cy);
    ctx.lineTo(cx, cy + tileH / 2 - 5);
    ctx.lineTo(cx - tileW / 2 + 10, cy);
    ctx.closePath();
    ctx.fill();
  }

  function drawItem(ctx, item, cx, cy) {
    const def = Shop.getItem(item.itemId) || {};
    ctx.save();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#244922';
    if (def.shape === 'tree') {
      ctx.fillStyle = '#8a552e'; ctx.fillRect(cx - 6, cy - 38, 12, 35);
      ctx.fillStyle = '#53c94d'; ctx.beginPath(); ctx.ellipse(cx, cy - 52, 28, 31, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff4c3e'; ctx.beginPath(); ctx.arc(cx + 8, cy - 56, 5, 0, Math.PI * 2); ctx.fill();
    } else if (def.shape === 'flowers') {
      ['#ff5aa5', '#ffd447', '#7cdbff'].forEach((c, i) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx - 18 + i * 18, cy - 25 - (i % 2) * 7, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
    } else if (def.shape === 'house') {
      ctx.fillStyle = '#ffcf72'; ctx.fillRect(cx - 24, cy - 48, 48, 38); ctx.strokeRect(cx - 24, cy - 48, 48, 38);
      ctx.fillStyle = '#ef5753'; ctx.beginPath(); ctx.moveTo(cx - 32, cy - 48); ctx.lineTo(cx, cy - 78); ctx.lineTo(cx + 32, cy - 48); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (def.shape === 'farm') {
      ctx.fillStyle = '#d88a39'; ctx.fillRect(cx - 30, cy - 42, 60, 32); ctx.strokeRect(cx - 30, cy - 42, 60, 32);
      ctx.fillStyle = '#fff'; ctx.fillRect(cx - 8, cy - 30, 16, 20); ctx.strokeRect(cx - 8, cy - 30, 16, 20);
    } else if (def.shape === 'vegetable') {
      ctx.fillStyle = '#a45d2b'; ctx.fillRect(cx - 32, cy - 35, 64, 26); ctx.strokeRect(cx - 32, cy - 35, 64, 26);
      ctx.fillStyle = '#3abf55';
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(cx - 24 + i * 12, cy - 36, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    } else if (def.shape === 'fountain') {
      ctx.fillStyle = '#84d7ff'; ctx.beginPath(); ctx.ellipse(cx, cy - 26, 31, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4fbfff'; ctx.beginPath(); ctx.arc(cx, cy - 50, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function drawObstacle(ctx, o, cx, cy) {
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#244922';
    if (o.type === 'rock') {
      ctx.fillStyle = '#9aa1a8'; ctx.beginPath(); ctx.ellipse(cx, cy - 23, 24, 16, -.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = '#2c8f35';
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(cx - 18 + i * 9, cy - 18, 8, 24, .4 - i * .2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    }
    ctx.restore();
  }

  function render(canvas, garden, selected, readOnly = false) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = logicalSize(canvas);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#aeeaff'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff1a5'; ctx.beginPath(); ctx.arc(w - 85, 70, 42, 0, Math.PI * 2); ctx.fill();
    const originX = w / 2;
    const originY = Math.min(115, h * 0.28);

    [...garden.tiles].sort((a, b) => (a.x + a.y) - (b.x + b.y)).forEach(t => {
      const p = iso(t.x, t.y, originX, originY);
      drawDiamond(ctx, p.x, p.y, t.type === 'soil' ? '#c98545' : '#63c957');
      if (selected && selected.x === t.x && selected.y === t.y) {
        ctx.strokeStyle = '#ffe45e'; ctx.lineWidth = 8; ctx.stroke();
      }
    });

    const drawables = [
      ...garden.obstacles.map(o => ({ ...o, kind: 'ob' })),
      ...garden.items.map(i => ({ ...i, kind: 'item' }))
    ].sort((a, b) => (a.x + a.y) - (b.x + b.y));
    drawables.forEach(o => {
      const p = iso(o.x, o.y, originX, originY);
      o.kind === 'ob' ? drawObstacle(ctx, o, p.x, p.y) : drawItem(ctx, o, p.x, p.y);
    });
    ctx.fillStyle = 'rgba(35,67,33,.85)';
    ctx.font = '900 18px Trebuchet MS';
    ctx.fillText(readOnly ? 'Visite lecture seule' : 'Clique les losanges pour cultiver', 20, 32);
  }

  function hit(canvas, garden, evt) {
    const r = canvas.getBoundingClientRect();
    const { w, h } = logicalSize(canvas);
    const x = (evt.clientX - r.left) * w / r.width;
    const y = (evt.clientY - r.top) * h / r.height;
    const originX = w / 2;
    const originY = Math.min(115, h * 0.28);
    let best = null;
    let dist = 1e9;
    garden.tiles.forEach(t => {
      const p = iso(t.x, t.y, originX, originY);
      const d = Math.abs(x - p.x) / (tileW / 2) + Math.abs(y - p.y) / (tileH / 2);
      if (d < 1 && d < dist) { best = t; dist = d; }
    });
    return best;
  }

  function isOccupied(g, x, y) {
    return g.items.some(i => i.x === x && i.y === y) || g.obstacles.some(o => o.x === x && o.y === y);
  }

  function place(user, itemId, tile) {
    if (!tile) return 'Choisis une tuile.';
    if (isOccupied(user.garden, tile.x, tile.y)) return 'Cette parcelle est déjà occupée.';
    if ((user.inventory[itemId] || 0) < 1) return 'Cet objet manque dans ton inventaire.';
    user.inventory[itemId]--;
    user.garden.items.push({ id: 'p_' + Date.now() + Math.random().toString(36).slice(2, 5), itemId, x: tile.x, y: tile.y });
    return 'Un nouveau coin du jardin prend vie.';
  }

  function clean(user, tile) {
    if (!tile) return 'Choisis une tuile encombrée.';
    const idx = user.garden.obstacles.findIndex(o => o.x === tile.x && o.y === tile.y);
    if (idx < 0) return 'Cette tuile est déjà propre.';
    if (user.coins < 15) return 'Il faut 15 pièces pour nettoyer cette parcelle.';
    user.coins -= 15;
    user.garden.obstacles.splice(idx, 1);
    return 'Les mauvaises herbes reculent : le jardin respire.';
  }

  return { createGarden, render, hit, place, clean, isOccupied };
})();
