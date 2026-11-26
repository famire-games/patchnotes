// 모든 페이지 공통 하단: 안내 링크 + 권리 고지(라이엇 Legal Jibber Jabber 필수 문구 포함)
(function () {
  let f = document.getElementById('foot');
  if (!f) { f = document.createElement('footer'); f.className = 'wrap'; document.body.appendChild(f); }
  f.style.cssText = 'color:#8a909c;font-size:12px;line-height:1.7;text-align:center;padding:24px 16px 32px;border-top:1px solid #262a33;margin-top:30px';
  f.innerHTML = `<div style="margin-bottom:8px"><a href="about.html" style="color:#aab3c0">사이트 소개</a> · <a href="privacy.html" style="color:#aab3c0">개인정보처리방침</a> · <a href="mailto:meph0333@gmail.com" style="color:#aab3c0">문의·삭제 요청</a></div>
  패치노트 요약은 각 게임사의 공식 공지를 AI 로 한국어 요약한 것으로, 틀릴 수 있습니다. 정확한 내용은 원문 링크를 확인하세요.<br>
  이 사이트는 비공식 팬 사이트이며 어떤 게임사와도 제휴하거나 보증받지 않았습니다. 게임 이름·이미지·데이터의 권리는 각 권리자에게 있습니다.<br>
  패치노트 모음 was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.<br>
  하스스톤 데이터 출처: Blizzard Entertainment (Battle.net API) · 스팀 데이터: Powered by <a href="https://steamcommunity.com/" style="color:#aab3c0">Steam</a> · 포켓몬 데이터: PokeAPI. Pokémon © Nintendo/Creatures Inc./GAME FREAK inc.`;
})();
