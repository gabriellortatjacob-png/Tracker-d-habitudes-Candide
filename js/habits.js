window.Habits = (() => {
  const REWARD = 10;
  function dateKey(date = new Date()){
    const d = new Date(date.getTime() - date.getTimezoneOffset()*60000);
    return d.toISOString().slice(0,10);
  }
  function uid(){ return 'h_' + Math.random().toString(36).slice(2,9); }
  function add(user, title){
    user.habits.push({ id:uid(), title:title.trim(), createdAt:new Date().toISOString(), completions:{}, reward:REWARD });
  }
  function remove(user, id){ user.habits = user.habits.filter(h => h.id !== id); }
  function isDoneToday(habit){ return !!habit.completions[dateKey()]; }
  function complete(user, id){
    const habit = user.habits.find(h => h.id === id);
    if (!habit) return {coins:0, message:'Habitude introuvable.'};
    const today = dateKey();
    if (habit.completions[today]) return {coins:0, message:'Déjà arrosée aujourd’hui.'};
    habit.completions[today] = true;
    const streak = calcStreak(habit);
    const bonus = (streak && streak % 7 === 0) ? 30 : (streak && streak % 3 === 0) ? 10 : 0;
    user.coins += REWARD + bonus;
    user.xp += 15 + bonus;
    user.stats.totalCompletions++;
    user.stats.bestStreak = Math.max(user.stats.bestStreak, streak);
    return {coins:REWARD+bonus, message: bonus ? `Série de ${streak} jours ! Bonus de ${bonus} pièces.` : 'Une graine de constance vient de pousser.'};
  }
  function calcStreak(habit){
    let streak = 0; const d = new Date();
    for(;;){
      const key = dateKey(d);
      if(!habit.completions[key]) break;
      streak++; d.setDate(d.getDate()-1);
    }
    return streak;
  }
  function last7(){ const out=[]; const d=new Date(); for(let i=6;i>=0;i--){ const x=new Date(d); x.setDate(d.getDate()-i); out.push(dateKey(x)); } return out; }
  function render(user, container, onChange){
    container.innerHTML = '';
    if(!user.habits.length){ container.innerHTML = '<div class="empty">Ton jardin attend ses premières graines : ajoute une habitude douce et concrète.</div>'; return; }
    const days = last7();
    user.habits.forEach(h => {
      const card=document.createElement('article'); card.className='habit-card';
      const streak=calcStreak(h);
      card.innerHTML = `<div><div class="habit-title">🌱 ${h.title}</div><div class="habit-meta"><span class="tag">🔥 ${streak} jours</span><span class="tag">🪙 +${h.reward}</span></div><div class="history">${days.map(k=>`<span class="day-dot ${h.completions[k]?'done':''}" title="${k}">${h.completions[k]?'✓':'·'}</span>`).join('')}</div></div>`;
      const actions=document.createElement('div');
      const done=document.createElement('button'); done.className='primary'; done.textContent=isDoneToday(h)?'Arrosée ✓':'Cocher aujourd’hui'; done.disabled=isDoneToday(h);
      done.onclick=()=>onChange('complete', h.id);
      const del=document.createElement('button'); del.className='danger'; del.textContent='Supprimer'; del.onclick=()=>onChange('remove', h.id);
      actions.append(done, del); card.append(actions); container.append(card);
    });
  }
  return { add, remove, complete, calcStreak, dateKey, render };
})();
