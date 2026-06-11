const DEFAULT_STARTING_COINS = 10000;

window.AppFactory = {
  uid(prefix){ return prefix + '_' + Math.random().toString(36).slice(2,10); },
  createUser(pseudo, codeHash){ return { id:this.uid('u'), pseudo, codeHash, avatar:'🌱', createdAt:new Date().toISOString(), coins:DEFAULT_STARTING_COINS, xp:0, habits:[{id:this.uid('h'),title:'Lire quelques pages',createdAt:new Date().toISOString(),completions:{},reward:10},{id:this.uid('h'),title:'Marcher 10 minutes',createdAt:new Date().toISOString(),completions:{},reward:10},{id:this.uid('h'),title:'Ranger un petit coin',createdAt:new Date().toISOString(),completions:{},reward:10}], inventory:{}, garden:Garden.createGarden(), social:{friends:[],requests:[]}, stats:{totalCompletions:0,bestStreak:0} }; }
};

const App = (() => {
  const KEY='candideHabitGarden:v1';
  let state, route='habits', selectedTile=null, selectedItem=null, visitId=null, gardenBound=false;
  const calendarState = { mode:'week', weekOffset:0, monthOffset:0 };
  const $=(id)=>document.getElementById(id);
  function defaultState(){ return {version:1,session:{currentUserId:null},users:{}}; }
  function load(){ try{ state=JSON.parse(localStorage.getItem(KEY))||defaultState(); }catch{ state=defaultState(); } Social.ensureBots(state); migrate(); save(); }
  function migrate(){ Object.values(state.users).forEach(u=>{ u.inventory ||= {}; u.social ||= {friends:[],requests:[]}; u.stats ||= {totalCompletions:0,bestStreak:0}; if(!u.isBot && (typeof u.coins !== 'number' || u.coins < DEFAULT_STARTING_COINS)) u.coins = DEFAULT_STARTING_COINS; u.garden = Garden.upgradeGarden(u.garden || Garden.createGarden()); }); }
  function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
  function user(){ return state.users[state.session.currentUserId]||null; }
  function level(u){ return Math.floor(Math.sqrt((u.xp||0)/100))+1; }
  function msg(id,text){ $(id).textContent=text||''; }
  function bind(){
    $('register-form').onsubmit=e=>{e.preventDefault(); try{ Auth.register(state,$('register-pseudo').value,$('register-code').value); migrate(); save(); render(); }catch(err){msg('auth-message',err.message);} };
    $('login-form').onsubmit=e=>{e.preventDefault(); try{ Auth.login(state,$('login-pseudo').value,$('login-code').value); migrate(); save(); render(); }catch(err){msg('auth-message',err.message);} };
    $('logout-btn').onclick=()=>{Auth.logout(state); save(); render();};
    document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{route=b.dataset.route; render();});
    $('habit-form').onsubmit=e=>{e.preventDefault(); const t=$('habit-title').value; if(t.trim()){Habits.add(user(),t); $('habit-title').value=''; save(); render();}};
    $('clean-obstacle-btn').onclick=()=>{ msg('garden-help',Garden.clean(user(),selectedTile)); save(); render(); };
    $('friend-search-form').onsubmit=e=>{ e.preventDefault(); renderSearch($('friend-query').value); };
    $('calendar-week').onclick=()=>{calendarState.mode='week'; render();};
    $('calendar-month').onclick=()=>{calendarState.mode='month'; render();};
    $('calendar-prev').onclick=()=>{ calendarState.mode==='week' ? calendarState.weekOffset-- : calendarState.monthOffset--; render(); };
    $('calendar-next').onclick=()=>{ calendarState.mode==='week' ? calendarState.weekOffset++ : calendarState.monthOffset++; render(); };
    bindGardenCanvas();
  }
  function bindGardenCanvas(){
    if(gardenBound) return; gardenBound=true;
    Garden.attach($('garden-canvas'), () => user()?.garden, { onTileClick:(tile)=>{ selectedTile=tile; if(selectedTile && selectedItem){ msg('garden-help',Garden.place(user(),selectedItem,selectedTile)); selectedItem=null; save(); } render(); }, onRedraw:()=>renderGardenOnly() });
  }
  function render(){
    document.body.classList.toggle('garden-route', route === 'garden');
    const u=user(); $('auth-view').hidden=!!u; $('app-view').hidden=!u; if(!u) return;
    $('coin-count').textContent=u.coins; $('level-count').textContent=level(u); $('best-streak-count').textContent=u.stats.bestStreak||0;
    document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.route===route));
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view')); $(`${route}-view`).classList.add('active-view');
    Habits.render(u,$('habit-list'),habitAction);
    $('calendar-week').classList.toggle('active', calendarState.mode==='week'); $('calendar-month').classList.toggle('active', calendarState.mode==='month'); CalendarView.render(u,$('calendar-content'),calendarState,{});
    Shop.render(u,$('shop-list'),$('inventory-list'),selectedItem,{buy:(id)=>{msg('garden-help',Shop.buy(u,id)); save(); render();},select:(id)=>{selectedItem=id; route='garden'; render();},refresh:()=>render()});
    $('selected-tile').textContent=selectedTile?`Tuile (${selectedTile.x}, ${selectedTile.y}) choisie`:'Aucune tuile choisie'; renderGardenOnly();
    Social.render(state,u,{requests:$('friend-requests'),friends:$('friends-list')},{accept:(id)=>{Social.accept(state,u,id);save();render();},visit:(id)=>{visitId=id; route='social'; renderVisit(); render();}}); renderVisit();
  }
  function renderGardenOnly(){ const u=user(); if(!u) return; Garden.render($('garden-canvas'),u.garden,selectedTile,false); }
  function habitAction(kind,id){ let text=''; if(kind==='complete') text=Habits.complete(user(),id).message; if(kind==='remove'){Habits.remove(user(),id); text='Une graine retirée pour mieux choisir la prochaine.';} save(); render(); if(text) msg('garden-help', text); }
  function renderSearch(q){ const u=user(); const results=Social.search(state,q,u.id); const el=$('search-results'); el.innerHTML=''; if(!results.length){el.innerHTML='<div class="empty">Aucun voisin trouvé.</div>';return;} results.forEach(found=>{ const row=Social.rowPerson(found); const visit=document.createElement('button'); visit.textContent='Visiter'; visit.className='secondary'; visit.onclick=()=>{visitId=found.id; renderVisit();}; const ask=document.createElement('button'); ask.textContent='Demander'; ask.className='primary'; ask.onclick=()=>{msg('social-message',Social.sendRequest(state,u.id,found.id)); save();}; row.append(visit,ask); el.append(row); }); }
  function renderVisit(){ const canvas=$('friend-canvas'); const title=$('visit-title'); const target=state.users[visitId] || state.users.bot_pangloss; if(!canvas || !target) return; Garden.render(canvas,target.garden,null,true); title.textContent=`Jardin visité — ${target.pseudo}`; }
  function init(){ load(); bind(); render(); }
  return { init };
})();
window.addEventListener('DOMContentLoaded', App.init);
