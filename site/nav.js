// 하위 페이지(롤·하스스톤·준비 중) 공용 위쪽 줄: ☰ 메뉴(즐겨찾기 목록) + 로그인. 메인(index.html)은 자체 구현.
(function () {
  const css = `
.nv-menu{background:none;border:0;color:var(--tx,#e6e8ec);cursor:pointer;padding:4px;border-radius:8px;display:flex;margin-right:4px}.nv-menu:hover{background:#ffffff12}
.nv-login{margin-left:auto;border:1px solid var(--line,#262a33);border-radius:999px;padding:4px 12px;font:inherit;font-size:13px;color:var(--tx,#e6e8ec);background:none;cursor:pointer;display:flex;gap:6px;align-items:center}
#nvDrawer{position:fixed;top:0;left:0;bottom:0;width:270px;background:#12151b;border-right:1px solid var(--line,#262a33);transform:translateX(-100%);transition:transform .18s;z-index:60;padding:16px;overflow:auto;color:var(--tx,#e6e8ec);font-size:15px}
#nvDrawer.open{transform:none}#nvShade{position:fixed;inset:0;background:#0007;display:none;z-index:59}#nvShade.open{display:block}
#nvDrawer h3{margin:4px 0 10px;font-size:15px}#nvDrawer h3 a{color:inherit;text-decoration:none}#nvDrawer h3 a:hover{color:var(--acc,#5aa9ff)}
#nvDrawer .who{color:var(--mute,#8a909c);font-size:13px;margin-bottom:14px}#nvDrawer .who a{color:var(--acc,#5aa9ff)}
.nv-fav{display:block;padding:7px 8px;border-radius:8px;color:var(--tx,#e6e8ec);text-decoration:none;font-size:14px}.nv-fav:hover{background:#ffffff0d}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const top = document.querySelector('header .top') || document.querySelector('header .wrap');
  if (!top) return;
  if (!top.classList.contains('top')) { top.style.display = 'flex'; top.style.alignItems = 'center'; top.style.gap = '10px'; }
  const menu = document.createElement('button');
  menu.className = 'nv-menu'; menu.title = T('menu');
  menu.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  top.insertBefore(menu, top.firstChild);
  const login = document.createElement('button');
  login.className = 'nv-login';
  login.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg><span>' + T('login') + '</span>';
  // 각 게임 정보 페이지 → 그 게임 패치노트로 돌아가는 버튼 (검색 줄 오른쪽 끝)
  const GAME = { 'lol.html': '리그 오브 레전드', 'hs.html': '하스스톤 (전장)', 'pkc.html': '포켓몬 챔피언스' }[location.pathname.split('/').pop()];
  const bar = document.querySelector('header .bar');
  if (bar) {
    const inp = bar.querySelector('input'); if (inp) inp.style.maxWidth = '520px';
    if (GAME) {
      const pn = document.createElement('a');
      pn.href = 'index.html?game=' + encodeURIComponent(GAME); pn.textContent = T('nav_patch');
      pn.style.cssText = 'background:var(--acc,#5aa9ff);color:#071425;border-radius:8px;padding:8px 16px;font-weight:600;text-decoration:none;white-space:nowrap;margin-left:auto';
      bar.appendChild(pn);
    }
  }
  // 오른쪽 끝(기존 링크·버튼 뒤)에 둔다
  top.appendChild(langPicker()); top.appendChild(login);

  const shade = document.createElement('div'); shade.id = 'nvShade';
  const drawer = document.createElement('aside'); drawer.id = 'nvDrawer';
  drawer.innerHTML = '<h3>☰ ' + T('menu') + '</h3><div class="who" id="nvWho">' + T('login_for_fav') + '</div><h3><a href="index.html?fav=1">' + T('favlist') + '</a></h3><div id="nvFavs"></div><h3 style="margin-top:18px"><a href="index.html">' + T('nav_all') + '</a></h3>';
  document.body.appendChild(shade); document.body.appendChild(drawer);
  const open = () => { drawer.classList.add('open'); shade.classList.add('open'); };
  const close = () => { drawer.classList.remove('open'); shade.classList.remove('open'); };
  menu.onclick = open; shade.onclick = close;

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let user = null;
  login.onclick = () => {
    if (user) { open(); return; }
    if (!window.FB) { alert(T('login_loading')); return; }
    FB.login().catch(e => alert(T('login_fail') + (e.code || e.message)));
  };
  function draw(u, list) {
    user = u;
    login.querySelector('span').textContent = u ? ((window.FB && FB.profile().nick) || T('set_nick')) : T('login');
    const who = document.getElementById('nvWho');
    who.innerHTML = u ? T('hi', esc((window.FB && FB.profile().nick) || T('set_nick'))) + '<a href="#" id="nvOut">' + T('logout') + '</a>' : T('login_for_fav');
    const out = document.getElementById('nvOut'); if (out) out.onclick = e => { e.preventDefault(); FB.logout(); };
    const favs = (list || []).slice().sort();
    document.getElementById('nvFavs').innerHTML = !u ? '' : favs.length
      ? favs.map(n => `<a class="nv-fav" href="index.html?game=${encodeURIComponent(n)}">${esc(GN(n))}</a>`).join('')
      : '<small style="color:var(--mute,#8a909c)">' + T('fav_hint') + '</small>';
  }
  window.onUserChange = draw;
  if (window.__fbUser) draw(...window.__fbUser);
  const s = document.createElement('script'); s.type = 'module'; s.src = 'fb.js'; document.body.appendChild(s);
})();
