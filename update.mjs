// 스팀 공지에서 패치노트를 모아 Gemini 로 한국어 요약 → site/data.json
// 사용: node update.mjs   (GEMINI_API_KEY 필요, 이미 요약한 글은 건너뜀)
import fs from 'node:fs';
const DIR = new URL('.', import.meta.url);
const games = JSON.parse(fs.readFileSync(new URL('games.json', DIR)));
const OUT = new URL('site/data.json', DIR);
const db = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT)) : { items: [] };
const seen = new Set(db.items.map(i => i.gid));
const KEY = process.env.GEMINI_API_KEY;
const MODELS = (process.env.GEMINI_MODEL || 'gemini-flash-lite-latest,gemini-3.8-flash').split(',');
const PATCH_RE = /patch|update|hotfix|fix|changelog|release notes|version|v\d|season|업데이트|패치/i;
const MAX_NEW = +(process.env.MAX_NEW || 40);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function clean(s) {
  return s.replace(/\[img[^\]]*\][^\[]*\[\/img\]/gi, '').replace(/\[\/?[a-z0-9*]+(=[^\]]*)?\]/gi, '')
    .replace(/<[^>]+>/g, '').replace(/\{STEAM_CLAN_IMAGE\}\S*/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

async function gemini(prompt) {
  let last;
  for (const m of MODELS) for (let k = 0; k < 2; k++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(120000),
        headers: { 'x-goog-api-key': KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 } }) });
      if (!r.ok) throw new Error(m + ' ' + r.status);
      const j = await r.json();
      return JSON.parse(j.candidates[0].content.parts.map(p => p.text || '').join(''));
    } catch (e) { last = e; await sleep(3000); }
  }
  throw last;
}

const candidates = [];
for (const g of games) {
  try {
    const r = await fetch(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${g.appid}&count=8&maxlength=0&feeds=steam_community_announcements`);
    const j = await r.json();
    for (const n of j.appnews?.newsitems || []) {
      if (seen.has(n.gid) || !PATCH_RE.test(n.title)) continue;
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

candidates.sort((a, b) => b.n.date - a.n.date);
console.log('새 패치 후보', candidates.length, '→ 요약', Math.min(MAX_NEW, candidates.length));

let added = 0;
for (const { g, n } of candidates.slice(0, MAX_NEW)) {
  const body = clean(n.contents).slice(0, ['lol', 'val', 'tft'].includes(g.appid) ? 30000 : 12000);
  if (body.length < 80) continue;
  const prompt = `다음은 게임 "${g.name}"의 공식 패치 공지 원문이다. 한국 게이머를 위해 정리하라.
원문에 없는 내용은 절대 지어내지 마라. 패치/업데이트 내용이 아니면 isPatch=false.
JSON 으로만 답하라:
{"isPatch":bool,"title":"한국어 제목(짧게)","summary":"2~3문장 요약","highlights":["주요 변경 최대 6개"],"buffs":["상향 항목(없으면 빈 배열)"],"nerfs":["하향 항목(없으면 빈 배열)"],"fixes":["버그 수정 최대 5개 요약"]}

제목: ${n.title}
원문:
${body}`;
  try {
    const s = await gemini(prompt);
    if (!s.isPatch) { seen.add(n.gid); continue; }
    db.items.push({ gid: n.gid, appid: g.appid, game: g.name, date: n.date, url: n.url,
      origTitle: n.title, img: (n.img || '').replace(/&amp;/g, '&') || undefined, title: s.title, summary: s.summary, highlights: s.highlights || [],
      buffs: s.buffs || [], nerfs: s.nerfs || [], fixes: s.fixes || [] });
    added++; console.log('✓', g.name, '-', s.title);
  } catch (e) { console.error('요약 실패', g.name, e.message); }
  await sleep(1500);
}
// 손으로 정리한 패치(블리자드 등 자동 수집이 약관상 안 되는 게임): manual.json
try { for (const m of JSON.parse(fs.readFileSync(new URL('manual.json', DIR)))) { db.items = db.items.filter(i => i.gid !== m.gid); db.items.push(m); } }
catch (e) { console.error('manual.json', e.message); }
db.items.sort((a, b) => b.date - a.date);
db.items = db.items.slice(0, 500);
db.updated = Date.now();
fs.mkdirSync(new URL('site/', DIR), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(db, null, 1));
console.log('추가', added, '총', db.items.length);
