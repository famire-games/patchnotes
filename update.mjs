// 스팀 공지 등에서 패치노트를 모아 Gemini 로 요약(새 글 = 한·영·일·중·포, 예전 글 = 한·영) → site/data.json
// 사용: node update.mjs   (GEMINI_API_KEY 필요, 이미 요약한 글은 건너뜀)
import fs from 'node:fs';
const DIR = new URL('.', import.meta.url);
const games = JSON.parse(fs.readFileSync(new URL('games.json', DIR)));
const OUT = new URL('site/data.json', DIR);
const db = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT)) : { items: [] };
db.items = db.items.filter(i => !(i.appid === 'hs' && !i.manual && !i.split));
const seen = new Set([...db.items.map(i => i.gid), ...(db.merged || [])]); // merged = 중복이라 합쳐 버린 글 (다시 요약하지 않음)
const KEY = process.env.GEMINI_API_KEY;
const MODELS = (process.env.GEMINI_MODEL || 'gemini-flash-lite-latest,gemini-3.8-flash').split(',');
const PATCH_RE = /patch|update|hotfix|fix|changelog|release notes|version|v\d|season|업데이트|패치/i;
const MAINT_RE = /maintenance|downtime|server (?:down|outage)|점검|メンテナンス|维护/i;
const MAX_NEW = +(process.env.MAX_NEW || 40);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function clean(s) {
  return s.replace(/\[img[^\]]*\][^\[]*\[\/img\]/gi, '').replace(/\[\/?[a-z0-9*]+(=[^\]]*)?\]/gi, '')
    .replace(/<[^>]+>/g, '').replace(/\{STEAM_CLAN_IMAGE\}\S*/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

// 무료 한도(429)가 다 차면 그날은 더 부르지 않음 (헛도는 시간 줄이기)
let QUOTA_OUT = false;
async function gemini(prompt) {
  if (QUOTA_OUT) throw new Error('quota out');
  let last, q429 = 0;
  for (const m of MODELS) for (let k = 0; k < 2; k++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(120000),
        headers: { 'x-goog-api-key': KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 } }) });
      if (!r.ok) { if (r.status === 429) q429++; throw new Error(m + ' ' + r.status); }
      const j = await r.json();
      return JSON.parse(j.candidates[0].content.parts.map(p => p.text || '').join(''));
    } catch (e) { last = e; await sleep(3000); }
  }
  if (q429 >= MODELS.length * 2) { QUOTA_OUT = true; console.error('Gemini 무료 한도 소진 — 나머지는 다음 실행에서'); }
  throw last;
}

const candidates = [];
for (const g of games) {
  try {
    const r = await fetch(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${g.appid}&count=8&maxlength=0&feeds=steam_community_announcements`);
    const j = await r.json();
    for (const n of j.appnews?.newsitems || []) {
      if (seen.has(n.gid) || !PATCH_RE.test(n.title) && !MAINT_RE.test(n.title)) continue;
      candidates.push({ g, n });
    }
  } catch (e) { console.error('fetch fail', g.name, e.message); }
  await sleep(400);
}
// 리그 오브 레전드: 공식 한국어 패치노트 (스팀 밖)
const htmlText = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
  .replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/gi, '\n').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
// 라이엇 게임즈 공식 한국어 패치노트 (롤·발로란트·TFT, 같은 사이트 구조)
const RIOT = [
  { appid: 'lol', name: '리그 오브 레전드', site: 'https://www.leagueoflegends.com' },
  { appid: 'val', name: '발로란트', site: 'https://playvalorant.com' },
  { appid: 'tft', name: '전략적 팀 전투', site: 'https://teamfighttactics.leagueoflegends.com' },
];
for (const R of RIOT) try {
  const list = await (await fetch(R.site + '/ko-kr/news/tags/patch-notes/', { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
  const slugs = [...new Set([...list.matchAll(/href="(\/ko-kr\/news\/game-updates\/[^"]*patch[^"]*)"/g)].map(m => m[1]))]
    .sort((x, y) => y.localeCompare(x, 'en', { numeric: true })).slice(0, 4);
  for (const sl of slugs) {
    const gid = (R.appid === 'lol' ? 'lol:' : R.appid + ':') + sl;
    if (seen.has(gid)) continue;
    const h = await (await fetch(R.site + sl, { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
    const date = Date.parse(h.match(/"datePublished":"([^"]+)"/)?.[1] || '') / 1000 || Date.now() / 1000;
    const title = htmlText(h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || sl);
    const body = htmlText(h.match(/<article[\s\S]*<\/article>/)?.[0] || h);
    candidates.push({ g: { appid: R.appid, name: R.name }, n: { gid, date, url: R.site + sl, title, contents: body, img: h.match(/property="og:image" content="([^"]+)"/)?.[1] || h.match(/content="([^"]+)" property="og:image"/)?.[1] || '' } });
    await sleep(400);
  }
} catch (e) { console.error(R.name + ' 수집 실패', e.message); }

// 호요버스 공식 홈페이지 공지 (원신·붕괴: 스타레일) — 홈페이지가 쓰는 공지 데이터 주소
const HOYO = [
  { appid: 'genshin', name: '원신', key: 'a1b1f9d3315447cc', app: 32, chan: 397, link: id => `https://genshin.hoyoverse.com/ko/news/detail/${id}` },
  { appid: 'hsr', name: '붕괴: 스타레일', key: '113fe6d3b4514cdd', app: 34, chan: 250, link: id => `https://hsr.hoyoverse.com/ko-kr/news/${id}` },
];
const HOYO_RE = /업데이트|버전|패치|문제 수정|밸런스|조정/;
for (const H of HOYO) try {
  const j = await (await fetch(`https://sg-public-api-static.hoyoverse.com/content_v2_user/app/${H.key}/getContentList?iAppId=${H.app}&iChanId=${H.chan}&iPageSize=10&iPage=1&sLangKey=ko-kr`)).json();
  for (const x of j.data?.list || []) {
    const gid = H.appid + ':' + x.iInfoId;
    if (seen.has(gid) || !HOYO_RE.test(x.sTitle) || /점검 예고|사전 다운로드/.test(x.sTitle)) continue;
    let img = ''; try { img = JSON.parse(x.sExt || '{}')['news-poster']?.[0]?.url || ''; } catch {}
    candidates.push({ g: { appid: H.appid, name: H.name }, n: { gid, url: H.link(x.iInfoId), title: x.sTitle,
      date: Date.parse(x.dtStartTime.replace(' ', 'T') + '+08:00') / 1000, contents: htmlText(x.sContent || ''), img } });
  }
} catch (e) { console.error(H.name + ' 수집 실패', e.message); }

// 넥슨 공식 포럼 '업데이트' 게시판 (로그인 없이 공개 API)
const NEXON = [
  { appid: 'bluearchive', name: '블루 아카이브', alias: 'bluearchive', board: 1076 },
  { appid: 'mabinogimobile', name: '마비노기 모바일', alias: 'mabinogimobile', board: 4559 },
  { appid: 'maplestorym', name: '메이플스토리M', alias: 'maplestorym', board: 1215 },
  { appid: 'kartrush', name: '카트라이더 러쉬플러스', alias: 'kartrush', board: 839 },
  { appid: 'maplestoryworlds', name: '메이플스토리 월드', alias: 'maplestoryworlds', board: 5633 },
];
for (const N of NEXON) try {
  const api = 'https://forum.nexon.com/api/v1';
  const j = await (await fetch(`${api}/board/${N.board}/threads?alias=${N.alias}&pageNo=1&paginationType=PAGING&pageSize=10&blockSize=5&hideType=WEB`, { headers: { 'user-agent': 'Mozilla/5.0' } })).json();
  for (const t of j.threads || []) {
    const gid = N.appid + ':' + t.threadId;
    if (seen.has(gid) || !/업데이트 (상세|노트|패치)|패치 ?노트|패치 (안내|내역)|밸런스/.test(t.title) || /예정|점검/.test(t.title)) continue;
    const d = await (await fetch(`${api}/thread/${t.threadId}?alias=${N.alias}`, { headers: { 'user-agent': 'Mozilla/5.0' } })).json();
    candidates.push({ g: { appid: N.appid, name: N.name }, n: { gid, date: t.createDate, title: t.title,
      url: `https://forum.nexon.com/${N.alias}/board_view?board=${N.board}&thread=${t.threadId}`,
      contents: htmlText(d.content || ''), img: (d.content || '').match(/<img[^>]+src="([^"]+)"/)?.[1] || '' } });
    await sleep(400);
  }
} catch (e) { console.error(N.name + ' 수집 실패', e.message); }

// 레벨 인피니트 공식 홈페이지 공지 (니케: nikke-kr.com 공지사항)
const LI = [
  { appid: 'nikke', name: '승리의 여신: 니케', gameid: '16', area: 'na', p: 309, s: 892, link: id => `https://www.nikke-kr.com/newsdetail.html?content_id=${id}` },
];
for (const L of LI) try {
  const H = { 'content-type': 'application/json', 'x-gameid': L.gameid, 'x-areaid': L.area, 'x-source': 'pc_web', 'x-language': 'ko' };
  const B = `https://${L.area}-community.playerinfinite.com/api/gpts.information_feeds_svr.InformationFeedsSvr/`;
  const post = async (ep, body) => (await fetch(B + ep, { method: 'POST', headers: H, body: JSON.stringify(body) })).json();
  const r = await post('GetContentByLabel', { language: ['ko'], gameid: L.gameid, offset: 0, get_num: 10, ext_info_type_list: [0, 1, 2], primary_label_id: L.p, secondary_label_id: L.s, content_class: 0 });
  for (const x of r.data?.info_content || []) {
    const gid = L.appid + ':' + x.content_id;
    if (seen.has(gid) || !/업데이트 공지|패치|밸런스/.test(x.title) || /런처/.test(x.title)) continue;
    const d = (await post('GetContentInfoById', { content_id: x.content_id, language: ['ko'], gameid: L.gameid })).data || {};
    candidates.push({ g: { appid: L.appid, name: L.name }, n: { gid, date: +x.pub_timestamp, title: x.title.trim(), url: L.link(x.content_id),
      contents: htmlText(d.content || ''), img: (x.pic_urls || [])[0] || '' } });
    await sleep(400);
  }
} catch (e) { console.error(L.name + ' 수집 실패', e.message); }

// 네이버 게임 라운지 공식 '업데이트' 게시판 (운영진 글만 있는 게시판)
const LOUNGE = [
  { appid: 'trickcal', name: '트릭컬 리바이브', lounge: 'Trickcal', board: 11 },
];
for (const N of LOUNGE) try {
  const A = 'https://comm-api.game.naver.com/nng_main/v1/community/lounge/' + N.lounge;
  const j = await (await fetch(`${A}/feed?boardId=${N.board}&buffFilteringYN=N&limit=10&offset=0&order=NEW`)).json();
  for (const { feed: f } of j.content?.feeds || []) {
    const gid = N.appid + ':' + f.feedId;
    if (seen.has(gid) || !/업데이트|패치|밸런스/.test(f.title) || /판매|상품/.test(f.title)) continue;
    const d = (await (await fetch(`${A}/feed/${f.feedId}`)).json()).content?.feed || {};
    const t = String(f.createdDate).replace(/(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)/, '$1-$2-$3T$4:$5:$6+09:00');
    candidates.push({ g: { appid: N.appid, name: N.name }, n: { gid, date: Date.parse(t) / 1000, title: f.title,
      url: `https://game.naver.com/lounge/${N.lounge}/board/detail/${f.feedId}`, contents: htmlText(d.contents || ''), img: f.repImageUrl || '' } });
    await sleep(400);
  }
} catch (e) { console.error(N.name + ' 수집 실패', e.message); }

// 공식 홈페이지 업데이트 게시판 (목록에서 글 번호를 찾고, 글 페이지를 읽음)
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/158.0' };
const SITES = [
  { appid: 'maplestory', name: '메이플스토리', list: 'https://maplestory.nexon.com/News/Update', re: /href="\/news\/update\/(\d+)"/gi, url: id => `https://maplestory.nexon.com/news/update/${id}`,
    t: /class="qs_title"[^>]*>([\s\S]*?)<\/p>/, d: /alt="작성 시간"\s*\/?>\s*(20\d\d)\.(\d\d)\.(\d\d)/ },
  { appid: 'fconline', name: 'FC 온라인', list: 'https://fconline.nexon.com/news/notice/list', re: /href="\/news\/notice\/view\?n4articlesn=(\d+)"/gi, url: id => `https://fconline.nexon.com/news/notice/view?n4articlesn=${id}`,
    t: /class="th subject">([^<]*)/, d: /class="th date">(20\d\d)\.(\d\d)\.(\d\d)/, only: /업데이트|패치|밸런스/ },
];
for (const S of SITES) try {
  const list = await (await fetch(S.list, { headers: UA })).text();
  const ids = [...new Set([...list.matchAll(S.re)].map(m => +m[1]))];
  for (const id of ids.slice(0, 6)) {
    const gid = S.appid + ':' + id;
    if (seen.has(gid)) continue;
    const url = S.url(id), h = await (await fetch(url, { headers: UA })).text();
    const ld = h.match(/"headline":"([^"]*)"/)?.[1], ldd = h.match(/"datePublished":"([^"]*)"/)?.[1];
    const title = htmlText((S.t && h.match(S.t)?.[1]) || ld || h.match(/<title>([^<]*)/)?.[1] || '').replace(/^수정\s*\d*\s*/, '').trim();
    if (!title || S.only && !S.only.test(title)) { seen.add(gid); continue; }
    const dm = S.d && h.match(S.d);
    const date = dm ? Date.parse(`${dm[1]}-${dm[2]}-${dm[3]}T12:00:00+09:00`) / 1000 : ldd ? Date.parse(ldd) / 1000 : Date.now() / 1000;
    candidates.push({ g: { appid: S.appid, name: S.name }, n: { gid, url, title, date,
      contents: htmlText(h.match(/<body[\s\S]*<\/body>/)?.[0] || h), img: h.match(/property="og:image"\s+content="([^"]+)"/)?.[1] || '' } });
    await sleep(500);
  }
} catch (e) { console.error(S.name + ' 수집 실패', e.message); }

// 블리자드 공식 소식 (news.blizzard.com 한국어, 패치 노트·핫픽스 글만)
const BLZ = [
  { appid: 'd4', name: '디아블로 IV', slug: 'diablo4' },
  { appid: 'wow', name: '월드 오브 워크래프트', slug: 'world-of-warcraft' },
  { appid: 'hs', name: '하스스톤', slug: 'hearthstone' },
];
for (const Z of BLZ) try {
  const t = await (await fetch('https://news.blizzard.com/ko-kr/' + Z.slug, { headers: UA })).text();
  const got = new Set();
  for (const p of t.split('class="news-card-link" href="').slice(1)) {
    const path = p.slice(0, p.indexOf('"')), id = path.split('/')[3];
    if (!id || got.has(id)) continue; got.add(id);
    const title = htmlText(p.match(/slot="heading"[^>]*>(?:<[^>]+>)*([^<]+)/)?.[1] || '');
    const gid = Z.appid + ':' + id;
    if (seen.has(gid) || !/패치 노트|핫픽스|긴급 수정/.test(title) || /미리 보기/.test(title)) continue;
    const url = 'https://news.blizzard.com' + path, a = await (await fetch(url, { headers: UA })).text();
    const date = Date.parse(a.match(/"datePublished":"([^"]*)/)?.[1] || '') / 1000 || Date.now() / 1000;
    const img = a.match(/property="og:image"\s+content="([^"]+)"/)?.[1] || '';
    const blog = a.slice(Math.max(0, a.indexOf('class="blog"')));
    if (Z.appid === 'hs') {
      // 하스스톤 패치 노트를 '전장' 부분과 나머지로 나눔 (h2 단위, 오류 수정 안의 '전장' h3 도 전장 쪽)
      let main = '', bg = '';
      for (const sec of blog.split(/(?=<h2[\s>])/)) {
        const h = htmlText(sec.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] || '');
        if (/전장/.test(h)) { bg += sec; continue; }
        for (const sub of sec.split(/(?=<h3[\s>])/)) (/^<h3[^>]*>[\s\S]*?전장[\s\S]*?<\/h3>/.test(sub) ? (bg += sub) : (main += sub));
      }
      const onlyBg = /전장/.test(title) && !/패치 노트/.test(title);
      if (!onlyBg && htmlText(main).length > 200) candidates.push({ g: { appid: 'hs', name: '하스스톤' }, n: { gid, url, title, date, img, contents: htmlText(main) } });
      if (htmlText(bg).length > 200) candidates.push({ g: { appid: 'hsbg', name: '하스스톤 (전장)' }, n: { gid: 'hsbg:' + id, url, title: title + ' (전장)', date, img, contents: htmlText(onlyBg ? blog : bg) } });
    } else candidates.push({ g: { appid: Z.appid, name: Z.name }, n: { gid, url, title, date, img, contents: htmlText(blog) } });
    await sleep(500);
    if (got.size > 12) break;
  }
} catch (e) { console.error(Z.name + ' 수집 실패', e.message); }

// 오버워치 공식 패치 노트 (한 페이지에 패치별 구역)
try {
  const h = await (await fetch('https://overwatch.blizzard.com/ko-kr/news/patch-notes/', { headers: UA })).text();
  for (const part of h.split('class="PatchNotes-patch PatchNotes-live').slice(1, 4)) {
    const title = htmlText(part.match(/PatchNotes-patchTitle[^>]*>([^<]*)/)?.[1] || '');
    const dm = title.match(/(\d{4})년 (\d+)월 (\d+)일/); if (!dm) continue;
    const gid = 'ow2:' + dm.slice(1).join('-');
    if (seen.has(gid)) continue;
    candidates.push({ g: { appid: 'ow2', name: '오버워치' }, n: { gid, title, url: 'https://overwatch.blizzard.com/ko-kr/news/patch-notes/',
      date: Date.parse(`${dm[1]}-${dm[2].padStart(2, '0')}-${dm[3].padStart(2, '0')}T12:00:00+09:00`) / 1000, contents: htmlText('<div' + part), img: '' } });
  }
} catch (e) { console.error('오버워치 수집 실패', e.message); }

// 라이엇 서버 상태 (공개 JSON): 예정·진행 중인 점검을 글로 올림
for (const [appid, name, u] of [['lol', '리그 오브 레전드', 'https://lol.secure.dyn.riotcdn.net/channels/public/x/status/kr1.json'],
  ['val', '발로란트', 'https://valorant.secure.dyn.riotcdn.net/channels/public/x/status/kr.json']]) try {
  const j = await (await fetch(u)).json();
  for (const m of j.maintenances || []) {
    const gid = appid + '-maint:' + m.id;
    if (seen.has(gid)) continue;
    const tr = a => (a || []).filter(t => /ko_KR|en_US/.test(t.locale)).map(t => t.content).join('\n');
    const title = (m.titles || []).find(t => t.locale === 'ko_KR')?.content || (m.titles || []).find(t => t.locale === 'en_US')?.content || 'Maintenance';
    candidates.push({ g: { appid, name }, n: { gid, url: appid === 'lol' ? 'https://status.riotgames.com/lol?region=kr1' : 'https://status.riotgames.com/valorant?region=kr', title, img: '',
      date: Date.parse(m.created_at || m.updated_at) / 1000 || Date.now() / 1000,
      contents: ['Server maintenance notice (Riot status page). status: ' + m.maintenance_status, 'platforms: ' + (m.platforms || []).join(','),
        'created: ' + m.created_at, tr(m.titles), ...(m.updates || []).map(x => x.created_at + ': ' + tr(x.translations))].join('\n') } });
  }
} catch (e) { console.error(name + ' 서버 상태 실패', e.message); }

candidates.sort((a, b) => b.n.date - a.n.date);
console.log('새 패치 후보', candidates.length, '→ 요약', Math.min(MAX_NEW, candidates.length));

let added = 0;
for (const { g, n } of candidates.slice(0, MAX_NEW)) {
  const body = clean(n.contents).slice(0, ['lol', 'val', 'tft'].includes(g.appid) ? 30000 : 12000);
  if (body.length < 80) continue;
  const F = '{"title":"short title","summary":"2-3 sentence summary","highlights":["key changes, max 6"],"buffs":["buffs, [] if none"],"nerfs":["nerfs, [] if none"],"fixes":["bug fixes, max 5"]}';
  const prompt = `Below is the official patch announcement for the game "${g.name}". Summarize it for gamers.
Never invent anything not in the source. If it is neither patch/update content nor a server maintenance/downtime notice, isPatch=false.
If it announces server maintenance or downtime, set "maint" to the scheduled window converted to UTC ISO 8601 ({"start":"2026-01-31T02:00:00Z","end":"2026-01-31T06:00:00Z"}, end null if unknown); otherwise "maint":null. For a maintenance notice, the title should say it is maintenance and the summary should say when and what is affected.
Write the same summary in 5 languages: ko (Korean), en (English), ja (Japanese), zh (Simplified Chinese), pt (Brazilian Portuguese).
Use each language's official/common names for the game, characters and items.
Answer with JSON only:
{"isPatch":bool,"maint":null,"ko":${F},"en":${F},"ja":${F},"zh":${F},"pt":${F}}

Title: ${n.title}
Source:
${body}`;
  try {
    const s = await gemini(prompt);
    if (!s.isPatch) { seen.add(n.gid); continue; }
    const pick = o => ({ title: o?.title || '', summary: o?.summary || '', highlights: o?.highlights || [], buffs: o?.buffs || [], nerfs: o?.nerfs || [], fixes: o?.fixes || [] });
    const ko = pick(s.ko || s.en), i18n = {};
    for (const L of ['en', 'ja', 'zh', 'pt']) if (s[L]?.title) i18n[L] = pick(s[L]);
    db.items.push({ ...(['hs', 'hsbg'].includes(g.appid) && { split: true }), gid: n.gid, appid: g.appid, game: g.name, date: n.date, url: n.url,
      origTitle: n.title, ...(s.maint?.start && Date.parse(s.maint.start) && { maint: { s: Date.parse(s.maint.start) / 1000, e: Date.parse(s.maint.end) / 1000 || null } }), img: (n.img || '').replace(/&amp;/g, '&') || undefined, ...ko, i18n });
    added++; console.log('✓', g.name, '-', ko.title);
  } catch (e) { console.error('요약 실패', g.name, e.message); }
  await sleep(1500);
}
// 손으로 정리한 패치(블리자드 등 자동 수집이 약관상 안 되는 게임): manual.json
try { const man = JSON.parse(fs.readFileSync(new URL('manual.json', DIR))); db.items = db.items.filter(i => !i.manual || man.some(m => m.gid === i.gid)); for (const m of man) { db.items = db.items.filter(i => i.gid !== m.gid); db.items.push(m); } }
catch (e) { console.error('manual.json', e.message); }
// 같은 게임·같은 버전 번호 글은 하나로 (언어별·미리보기·본 공지 중복). 내용이 가장 많은 글을 남김
{
  const ver = i => (i.origTitle + ' ' + i.title).match(/\d+\.\d+(?:\.\d+)*[a-z]?/i)?.[0];
  // 스팀 공지만 (공식 홈페이지 글은 같은 버전이라도 내용이 다른 별도 글), PTB·테스트 서버는 따로
  const key = i => typeof i.appid === 'number' && ver(i) && i.appid + '|' + ver(i) + (/PTB|테스트|베타|beta/i.test(i.origTitle + i.title) ? '|ptb' : '');
  const size = i => [i.highlights, i.buffs, i.nerfs, i.fixes].reduce((n, a) => n + (a || []).length, 0) + (i.summary || '').length / 100;
  const best = new Map();
  for (const i of db.items) {
    const v = key(i); if (!v) continue;
    const k = v, b = best.get(k);
    if (!b || size(i) > size(b)) best.set(k, i);
  }
  const keep = new Set(best.values()), drop = db.items.filter(i => key(i) && !keep.has(i));
  db.merged = [...new Set([...(db.merged || []), ...drop.map(i => i.gid)])].slice(-2000);
  db.items = db.items.filter(i => !drop.includes(i));
  if (drop.length) console.log('중복 합침', drop.length);
}
// 예전(한국어만 있던) 요약을 영어로 번역 — 8개씩 묶어서, 실행마다 최대 BACKFILL 개
{
  const BACKFILL = +(process.env.BACKFILL || 120);
  const todo = db.items.filter(i => !i.i18n?.en).slice(0, BACKFILL);
  if (todo.length) console.log('영어 번역 대상', todo.length);
  for (let k = 0; k < todo.length; k += 8) {
    const part = todo.slice(k, k + 8);
    const src = part.map((i, n) => ({ n, game: i.game, title: i.title, summary: i.summary, highlights: i.highlights || [], buffs: i.buffs || [], nerfs: i.nerfs || [], fixes: i.fixes || [] }));
    try {
      const r = await gemini(`Translate these Korean game patch summaries into natural English. Use the official English names of games, characters, items and terms. Keep the same structure and order. Answer with JSON only: {"items":[{"n":0,"title":"","summary":"","highlights":[],"buffs":[],"nerfs":[],"fixes":[]}]}

${JSON.stringify(src)}`);
      for (const t of r.items || []) {
        const i = part[t.n]; if (!i || !t.title) continue;
        i.i18n = { ...(i.i18n || {}), en: { title: t.title, summary: t.summary || '', highlights: t.highlights || [], buffs: t.buffs || [], nerfs: t.nerfs || [], fixes: t.fixes || [] } };
      }
    } catch (e) { console.error('영어 번역 실패', e.message); }
    await sleep(1500);
  }
}
// 게임 이름 언어별 (스팀은 스토어 이름, 그 밖은 아래 표) → data.json names[한국어 이름] = {en,ja,zh,pt}
const NAMES = {
  '리그 오브 레전드': { en: 'League of Legends', ja: 'リーグ・オブ・レジェンド', zh: '英雄联盟' },
  '전략적 팀 전투': { en: 'Teamfight Tactics', ja: 'チームファイト タクティクス', zh: '云顶之弈' },
  '발로란트': { en: 'VALORANT' }, '오버워치': { en: 'Overwatch', ja: 'オーバーウォッチ', zh: '守望先锋' },
  '원신': { en: 'Genshin Impact', ja: '原神', zh: '原神' }, '붕괴: 스타레일': { en: 'Honkai: Star Rail', ja: '崩壊：スターレイル', zh: '崩坏：星穹铁道' },
  '블루 아카이브': { en: 'Blue Archive', ja: 'ブルーアーカイブ', zh: '蔚蓝档案' }, '마비노기 모바일': { en: 'Mabinogi Mobile' },
  '메이플스토리M': { en: 'MapleStory M' }, '카트라이더 러쉬플러스': { en: 'KartRider Rush+' }, '메이플스토리 월드': { en: 'MapleStory Worlds' },
  '승리의 여신: 니케': { en: 'GODDESS OF VICTORY: NIKKE', ja: '勝利の女神：NIKKE', zh: '胜利女神：妮姬' }, '트릭컬 리바이브': { en: 'Trickcal' },
  '메이플스토리': { en: 'MapleStory', ja: 'メイプルストーリー', zh: '冒险岛' }, 'FC 온라인': { en: 'FC Online' },
  '디아블로 IV': { en: 'Diablo IV', ja: 'ディアブロ IV', zh: '暗黑破坏神 IV' }, '월드 오브 워크래프트': { en: 'World of Warcraft', ja: 'ワールド オブ ウォークラフト', zh: '魔兽世界' },
  '하스스톤': { en: 'Hearthstone', ja: 'ハースストーン', zh: '炉石传说' }, '하스스톤 (전장)': { en: 'Hearthstone (Battlegrounds)', ja: 'ハースストーン (バトルグラウンド)', zh: '炉石传说 (酒馆战棋)', pt: 'Hearthstone (Campos de Batalha)' },
  '우마무스메': { en: 'Umamusume: Pretty Derby', ja: 'ウマ娘 プリティーダービー', zh: '赛马娘' }, '판타시 스타 온라인 2 뉴 제네시스': { en: 'Phantasy Star Online 2 New Genesis', ja: 'ファンタシースターオンライン2 ニュージェネシス' }, '작혼: 리치 마작': { en: 'Mahjong Soul', ja: '雀魂 -じゃんたま-', zh: '雀魂', pt: 'Mahjong Soul' },
  '포켓몬 챔피언스': { en: 'Pokémon Champions', ja: 'ポケモンチャンピオンズ', zh: '宝可梦冠军' },
};
db.names = db.names || {};
for (const [k, v] of Object.entries(NAMES)) db.names[k] = { pt: v.en, ja: v.en, zh: v.en, ...v };
for (const g of games) if (!db.names[g.name]?.en) try {
  const o = {};
  for (const [L, sl] of [['en', 'english'], ['ja', 'japanese'], ['zh', 'schinese'], ['pt', 'brazilian']]) {
    const j = await (await fetch(`https://store.steampowered.com/api/appdetails?appids=${g.appid}&filters=basic&l=${sl}&cc=us`)).json();
    let nm = j[g.appid]?.data?.name;
    if (!nm) nm = (await (await fetch(`https://store.steampowered.com/api/appdetails?appids=${g.appid}&filters=basic&l=${sl}&cc=jp`)).json())[g.appid]?.data?.name; // 미국에서 안 파는 게임 if (nm) o[L] = nm.replace(/[™®]/g, '').trim();
    await sleep(1600); // 스토어 API 는 5분에 약 200번까지
  }
  if (o.en) db.names[g.name] = o;
} catch (e) { console.error('이름 실패', g.name, e.message); }
// 스팀 공식 헤더 그림 주소 (새 게임은 주소 형식이 달라서 스토어 API 로 확인, 한 번만)
db.icons = db.icons || {};
for (const g of games) if (!db.icons[g.appid]) try {
  const j = await (await fetch(`https://store.steampowered.com/api/appdetails?appids=${g.appid}&filters=basic`)).json();
  const u = j[g.appid]?.data?.header_image; if (u) db.icons[g.appid] = u;
  await sleep(300);
} catch (e) { console.error('헤더 그림 실패', g.name, e.message); }
db.items.sort((a, b) => b.date - a.date);
db.items = db.items.slice(0, 1000);
db.updated = Date.now();
fs.mkdirSync(new URL('site/', DIR), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(db, null, 1));
console.log('추가', added, '총', db.items.length);
