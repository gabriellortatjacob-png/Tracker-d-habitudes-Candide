window.CalendarView = (() => {
  const DAY = 86400000;
  const names = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const longFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' });
  const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

  function dateKey(date = new Date()) {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
  }
  function startOfWeek(date) {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d;
  }
  function shiftedWeek(offset) {
    const start = startOfWeek(new Date());
    start.setDate(start.getDate() + offset * 7);
    return Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY));
  }
  function habitDone(habit, date) { return !!habit.completions[dateKey(date)]; }
  function countDone(user, date) { return user.habits.filter(h => habitDone(h, date)).length; }

  function render(user, el, state, callbacks) {
    el.innerHTML = '';
    if (!user.habits.length) {
      el.innerHTML = '<div class="empty">Ajoute d’abord quelques habitudes pour voir le jardin du temps se colorer.</div>';
      return;
    }
    if (state.mode === 'month') renderMonth(user, el, state);
    else renderWeek(user, el, state);
  }

  function renderWeek(user, el, state) {
    const days = shiftedWeek(state.weekOffset || 0);
    const title = document.createElement('div');
    title.className = 'calendar-title';
    title.textContent = `Semaine du ${longFmt.format(days[0])} au ${longFmt.format(days[6])}`;
    el.append(title);

    const grid = document.createElement('div');
    grid.className = 'week-grid';
    grid.style.setProperty('--cols', 9);
    grid.append(cell('Habitude', 'head habit-head'));
    days.forEach((d, i) => grid.append(cell(`${names[i]}\n${longFmt.format(d)}`, 'head')));
    grid.append(cell('Série', 'head'));

    user.habits.forEach(h => {
      grid.append(cell(`🌱 ${h.title}`, 'habit-name'));
      days.forEach(d => grid.append(cell(habitDone(h, d) ? '✓' : '·', habitDone(h, d) ? 'done' : 'miss')));
      grid.append(cell(`🔥 ${Habits.calcStreak(h)}`, 'streak-cell'));
    });
    el.append(grid);
  }

  function renderMonth(user, el, state) {
    const base = new Date();
    base.setMonth(base.getMonth() + (state.monthOffset || 0), 1);
    base.setHours(0, 0, 0, 0);
    const first = new Date(base);
    const start = startOfWeek(first);
    const title = document.createElement('div');
    title.className = 'calendar-title';
    title.textContent = monthFmt.format(base).replace(/^./, c => c.toUpperCase());
    el.append(title);

    const grid = document.createElement('div');
    grid.className = 'month-grid';
    names.forEach(n => grid.append(cell(n, 'month-head')));
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getTime() + i * DAY);
      const done = countDone(user, d);
      const total = user.habits.length;
      const ratio = total ? done / total : 0;
      const cls = d.getMonth() === base.getMonth() ? 'month-day' : 'month-day muted';
      const tone = ratio === 0 ? 'none' : ratio === 1 ? 'full' : 'partial';
      const node = cell(`<strong>${d.getDate()}</strong><span>${done}/${total}</span>`, `${cls} ${tone}`, true);
      node.title = `${dateKey(d)} — ${done} habitudes complétées sur ${total}`;
      grid.append(node);
    }
    el.append(grid);
  }

  function cell(content, cls, html = false) {
    const div = document.createElement('div');
    div.className = 'cal-cell ' + cls;
    html ? div.innerHTML = content : div.textContent = content;
    return div;
  }

  return { render, dateKey };
})();
