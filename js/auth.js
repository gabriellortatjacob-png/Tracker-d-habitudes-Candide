/* Auth locale pseudo + code. Ce n'est pas une vraie sécurité: seulement une porte d'entrée ludique localStorage. */
window.Auth = (() => {
  const normalize = (pseudo) => pseudo.trim().toLowerCase();
  const simpleHash = (text) => Array.from(text).reduce((h,ch)=>((h<<5)-h+ch.charCodeAt(0))|0, 0).toString(36);
  function findUserByPseudo(state, pseudo){
    const key = normalize(pseudo);
    return Object.values(state.users).find(u => normalize(u.pseudo) === key);
  }
  function register(state, pseudo, code){
    pseudo = pseudo.trim();
    if (findUserByPseudo(state, pseudo)) throw new Error('Ce pseudo cultive déjà son jardin. Choisis une autre graine.');
    const user = window.AppFactory.createUser(pseudo, simpleHash(code));
    state.users[user.id] = user;
    state.session.currentUserId = user.id;
    return user;
  }
  function login(state, pseudo, code){
    const user = findUserByPseudo(state, pseudo);
    if (!user || user.codeHash !== simpleHash(code)) throw new Error("Pseudo ou code incorrect : la clef du cabanon ne tourne pas.");
    state.session.currentUserId = user.id;
    return user;
  }
  function logout(state){ state.session.currentUserId = null; }
  return { register, login, logout, findUserByPseudo, simpleHash };
})();
