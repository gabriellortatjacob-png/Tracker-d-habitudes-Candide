const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const appSource = fs.readFileSync('js/app.js', 'utf8');
const context = {
  window: {},
  Garden: {
    createGarden: () => ({ items: [], obstacles: [] }),
    upgradeGarden: (garden) => garden || { items: [], obstacles: [] },
    attach: () => {},
    render: () => {},
    clean: () => ''
  },
  Social: { ensureBots: () => {}, render: () => {}, search: () => [], rowPerson: () => ({ append: () => {} }) },
  Habits: { render: () => {} },
  CalendarView: { render: () => {} },
  Shop: { render: () => {} },
  Auth: {},
  localStorage: { getItem: () => null, setItem: () => {} },
  document: { getElementById: () => ({}), querySelectorAll: () => [], body: { classList: { toggle: () => {} } } },
  addEventListener: () => {}
};
context.window.addEventListener = context.addEventListener;
vm.createContext(context);
vm.runInContext(appSource, context);

const user = context.window.AppFactory.createUser('Gabriel', 'hash');
assert.strictEqual(user.coins, 10000, 'new users should start with 10,000 coins');

assert.match(appSource, /coins\s*<\s*DEFAULT_STARTING_COINS/, 'migration should top up existing users below default coins');

console.log('default-coins behavior OK');
