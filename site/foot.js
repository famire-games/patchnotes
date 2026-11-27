// 모든 페이지 공통 하단: 안내 링크 + 권리 고지(라이엇 Legal Jibber Jabber 필수 문구 포함)
(function () {
  let f = document.getElementById('foot');
  if (!f) { f = document.createElement('footer'); f.className = 'wrap'; document.body.appendChild(f); }
  f.style.cssText = 'color:#8a909c;font-size:12px;line-height:1.7;text-align:center;padding:24px 16px 32px;border-top:1px solid #262a33;margin-top:30px';
  const F = T('foot');
  f.innerHTML = `<div style="margin-bottom:8px"><a href="about.html" style="color:#aab3c0">${F[0]}</a> · <a href="privacy.html" style="color:#aab3c0">${F[1]}</a> · <a href="mailto:meph0333@gmail.com" style="color:#aab3c0">${F[2]}</a></div>
  ${F[3]}<br>
  ${F[4]}<br>
  Patchwork was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.<br>
  ${F[5]} <a href="https://steamcommunity.com/" style="color:#aab3c0">Steam</a> · ${F[6]} Pokémon © Nintendo/Creatures Inc./GAME FREAK inc.`;
})();
