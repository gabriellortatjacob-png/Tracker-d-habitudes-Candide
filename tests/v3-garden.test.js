const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const shopSource = fs.readFileSync('js/shop.js', 'utf8');
const gardenSource = fs.readFileSync('js/garden.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');

const context = {
  window: {},
  Image: function(){ this.decode = () => Promise.resolve(); },
  document: { createElement: () => ({ className:'', style:{}, append(){}, setAttribute(){}, addEventListener(){}, classList:{toggle(){}, add(){}, remove(){}} }) },
  performance: { now: () => 0 },
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {}
};
vm.createContext(context);
vm.runInContext(shopSource, context);
vm.runInContext(gardenSource, context);

const garden = context.window.Garden.createGarden();
assert.strictEqual(garden.width, 24, 'V3 garden should be 24 tiles wide');
assert.strictEqual(garden.height, 24, 'V3 garden should be 24 tiles high');
assert.ok(garden.tiles.some(t => t.type === 'water'), 'garden should include a visible river');
assert.ok(garden.tiles.some(t => t.type === 'grass_flower'), 'garden should include flower grass variants');
assert.ok(garden.tiles.some(t => t.type === 'grass_blades'), 'garden should include blades grass variants');

const items = context.window.Shop.catalog.filter(i => i.category !== 'clean');
assert.ok(items.length >= 8, 'shop should expose at least 8 placeable item types');
['tree','bush','flowers'].forEach(id => {
  const item = context.window.Shop.getItem(id);
  assert.ok(item.levels && item.levels.length >= 4, `${id} should have 4 art levels`);
});
['house','farm','vegetable','fountain'].forEach(id => {
  const item = context.window.Shop.getItem(id);
  assert.ok(item.levels && item.levels.length >= 2, `${id} should have multiple art levels`);
});
assert.match(indexSource, /garden-shop-toggle/, 'garden should have a floating shop button');
assert.match(indexSource, /garden-shop-bar/, 'garden should have a horizontal bottom shop bar');
assert.match(gardenSource, /requestAnimationFrame/, 'garden renderer should run a RAF game loop');
assert.match(gardenSource, /velocityX/, 'camera should implement inertia');
assert.match(gardenSource, /painter/i, 'renderer should document painter algorithm');

const user = { coins: 10000, inventory: { tree: 1 }, garden, stats:{} };
const tile = garden.tiles.find(t => t.type !== 'water' && !context.window.Garden.isOccupied(garden, t.x, t.y));
const placeMessage = context.window.Garden.place(user, 'tree', tile);
assert.ok(/prend vie|planté|posé/i.test(placeMessage));
assert.strictEqual(garden.items[0].level, 1, 'newly placed item should start level 1');
const beforeCoins = user.coins;
const upgradeMessage = context.window.Garden.upgradeItem(user, garden.items[0]);
assert.ok(/niveau|amélioré/i.test(upgradeMessage));
assert.strictEqual(garden.items[0].level, 2, 'upgrade should increase item level');
assert.ok(user.coins < beforeCoins, 'upgrade should cost coins');

console.log('v3 garden specification OK');
