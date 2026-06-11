const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const appSource = fs.readFileSync('js/app.js', 'utf8');
let savedState = null;
const storedState = {
  version: 1,
  session: { currentUserId: 'u_existing' },
  users: {
    u_existing: {
      id: 'u_existing',
      pseudo: 'Gabriel',
      codeHash: 'hash',
      coins: 190,
      habits: [],
      inventory: {},
      social: { friends: [], requests: [] },
      stats: { totalCompletions: 0, bestStreak: 0 },
      garden: { items: [], obstacles: [] }
    }
  }
};
const elements = {};
function element(id) {
  return elements[id] ||= {
    id,
    hidden: false,
    textContent: '',
    innerHTML: '',
    value: '',
    classList: { toggle: () => {}, add: () => {}, remove: () => {} },
    append: () => {},
    setAttribute: () => {}
  };
}
const context = {
  window: {},
  Garden: {
    createGarden: () => ({ items: [], obstacles: [] }),
    upgradeGarden: (garden) => garden || { items: [], obstacles: [] },
    attach: () => {},
    render: () => {},
    clean: () => '',
    itemAt: () => null
  },
  Social: { ensureBots: () => {}, render: () => {}, search: () => [], rowPerson: () => ({ append: () => {} }) },
  Habits: { render: () => {} },
  CalendarView: { render: () => {} },
  Shop: { render: () => {} },
  Auth: {},
  localStorage: {
    getItem: () => JSON.stringify(storedState),
    setItem: (_key, value) => { savedState = JSON.parse(value); }
  },
  document: {
    getElementById: element,
    querySelectorAll: () => [],
    body: { classList: { toggle: () => {} } }
  },
  addEventListener: () => {}
};
context.window.addEventListener = context.addEventListener;
vm.createContext(context);
vm.runInContext(appSource + '\nwindow.__testApp = App;', context);
context.window.__testApp.init();

assert.strictEqual(savedState.users.u_existing.coins, 10000, 'existing users below 10,000 should be topped up on load');
assert.strictEqual(element('coin-count').textContent, 10000, 'rendered coin count should show 10,000 after migration');
console.log('existing-user top-up OK');
