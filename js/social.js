window.Social = (() => {
  const bots = [
    {id:'bot_pangloss',pseudo:'Pangloss',coins:210,xp:520,avatar:'📚'},
    {id:'bot_martin',pseudo:'Martin',coins:90,xp:260,avatar:'🪨'},
    {id:'bot_cunegonde',pseudo:'Cunégonde',coins:160,xp:430,avatar:'🌻'}
  ];
  function ensureBots(state){ bots.forEach(b=>{ if(!state.users[b.id]){ const u=AppFactory.createUser(b.pseudo,'bot'); Object.assign(u,b); u.garden.items.push({id:'bp1'+b.id,itemId:'tree',x:1,y:1},{id:'bp2'+b.id,itemId:'flowers',x:3,y:1},{id:'bp3'+b.id,itemId:'fountain',x:2,y:3}); u.garden.obstacles=[]; u.isBot=true; state.users[u.id]=u; }}); }
  function search(state, query, selfId){ const q=query.trim().toLowerCase(); return Object.values(state.users).filter(u=>u.id!==selfId && u.pseudo.toLowerCase().includes(q)); }
  function sendRequest(state, fromId, toId){ const to=state.users[toId]; if(!to || to.isBot) return 'Ce voisin simulé t’ouvre déjà sa barrière : visite-le directement.'; to.social.requests ||= []; if(to.social.requests.includes(fromId)) return 'Demande déjà envoyée.'; to.social.requests.push(fromId); return 'Demande envoyée avec un bouquet de patience.'; }
  function accept(state, user, fromId){ user.social.requests = (user.social.requests||[]).filter(id=>id!==fromId); if(!user.social.friends.includes(fromId)) user.social.friends.push(fromId); const other=state.users[fromId]; if(other && !other.social.friends.includes(user.id)) other.social.friends.push(user.id); }
  function render(state,user,els,callbacks){
    els.requests.innerHTML=''; (user.social.requests||[]).forEach(id=>{const u=state.users[id]; const row=rowPerson(u); const b=document.createElement('button'); b.textContent='Accepter'; b.className='primary'; b.onclick=()=>callbacks.accept(id); row.append(b); els.requests.append(row);}); if(!els.requests.innerHTML) els.requests.innerHTML='<div class="empty">Aucune demande : le calme avant la floraison.</div>';
    els.friends.innerHTML=''; const friendIds=[...new Set([...(user.social.friends||[]), ...bots.map(b=>b.id)])]; friendIds.forEach(id=>{const u=state.users[id]; if(!u)return; const row=rowPerson(u); const b=document.createElement('button'); b.textContent='Visiter'; b.className='secondary'; b.onclick=()=>callbacks.visit(id); row.append(b); els.friends.append(row);});
  }
  function rowPerson(u){ const row=document.createElement('div'); row.className='person-row'; row.innerHTML=`<span>${u.avatar||'🌱'}</span><strong>${u.pseudo}</strong><small>Niv. ${Math.floor(Math.sqrt((u.xp||0)/100))+1}</small>`; return row; }
  return { ensureBots, search, sendRequest, accept, render, rowPerson };
})();
