// 검색 등록용 정적 페이지: 패치마다 한 장(언어별), 게임마다 목록 한 장, sitemap.xml·RSS(feed.xml)
// 영어 = 기본(/p/, /g/), 다른 언어 = /ko/p/ 처럼 앞에 언어. 번역이 있는 언어만 만든다.
import fs from 'fs';
const DIR = new URL('./site/', import.meta.url);
const BASE = 'https://patchworkgg.pages.dev';
const db = JSON.parse(fs.readFileSync(new URL('data.json', DIR)));
const LANGS = ['en', 'ko', 'ja', 'zh', 'pt'];
const HL = { en: 'en', ko: 'ko', ja: 'ja', zh: 'zh-Hans', pt: 'pt-BR' };
const UI = {
  en: { pn: 'Patch Notes', sum: 'Summary', hl: 'Key changes', buff: 'Buffs', nerf: 'Nerfs', fix: 'Bug fixes', src: 'Official announcement', open: 'Rate & discuss on Patchwork', all: 'All patch notes', latest: 'Latest {g} patch notes, summarized: buffs, nerfs and bug fixes at a glance.', home: 'Home' },
  ko: { pn: '패치노트', sum: '요약', hl: '주요 변경', buff: '상향', nerf: '하향', fix: '버그 수정', src: '공식 공지 원문', open: 'Patchwork에서 평가·댓글 보기', all: '전체 패치노트', latest: '{g} 최신 패치노트 요약: 상향·하향·버그 수정을 한눈에.', home: '홈' },
  ja: { pn: 'パッチノート', sum: '概要', hl: '主な変更', buff: '上方修正', nerf: '下方修正', fix: 'バグ修正', src: '公式告知', open: 'Patchworkで評価・コメント', all: 'すべてのパッチノート', latest: '{g}の最新パッチノート要約：上方・下方修正、バグ修正をひと目で。', home: 'ホーム' },
  zh: { pn: '更新公告', sum: '摘要', hl: '主要改动', buff: '加强', nerf: '削弱', fix: '错误修复', src: '官方公告', open: '在 Patchwork 评分和讨论', all: '全部更新公告', latest: '{g} 最新更新公告摘要：加强、削弱与错误修复一目了然。', home: '首页' },
  pt: { pn: 'Notas de atualização', sum: 'Resumo', hl: 'Principais mudanças', buff: 'Buffs', nerf: 'Nerfs', fix: 'Correções', src: 'Anúncio oficial', open: 'Avalie e comente no Patchwork', all: 'Todas as notas', latest: 'Últimas notas de atualização de {g} resumidas: buffs, nerfs e correções.', home: 'Início' },
};
const PID = i => String(i.gid || i.url).replace(/[\/.#$\[\]]/g, '_').slice(0, 500);
const FILE = i => PID(i).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const GN = (g, L) => L === 'ko' ? g : (db.names?.[g]?.[L] || db.names?.[g]?.en || g);
const gslug = i => String(typeof i.appid === 'number' ? 'steam-' + i.appid : i.appid).replace(/[^A-Za-z0-9_-]/g, '_');
const pre = L => L === 'en' ? '' : '/' + L;
const TX = (i, L) => L === 'ko' ? i : i.i18n?.[L];
const langsOf = i => LANGS.filter(L => TX(i, L)?.title);
const day = (t, L) => new Date(t * 1000).toLocaleDateString({ en: 'en-US', ko: 'ko-KR', ja: 'ja-JP', zh: 'zh-CN', pt: 'pt-BR' }[L], { year: 'numeric', month: 'long', day: 'numeric' });
const iso = t => new Date(t * 1000).toISOString();

const CSS = `:root{--bg:#0f1115;--card:#171a21;--line:#262a33;--tx:#e6e8ec;--mute:#8a909c;--acc:#5aa9ff;--up:#4cc38a;--down:#ef6b6b}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.7 system-ui,"Malgun Gothic",sans-serif}
header{border-bottom:1px solid var(--line)}.wrap{max-width:820px;margin:0 auto;padding:0 16px}.top{display:flex;gap:12px;align-items:center;padding:12px 0}
.top a{color:inherit;text-decoration:none;font-weight:700;font-size:19px}.top b{color:var(--acc)}.lg{margin-left:auto;font-size:13px}.lg a{color:var(--mute);font-size:13px;font-weight:400;margin-left:8px}
main{padding:20px 16px 40px}h1{font-size:24px;line-height:1.35;margin:6px 0}.meta{color:var(--mute);font-size:13px}.meta a{color:var(--acc)}
h2{font-size:16px;margin:24px 0 6px}.up{color:var(--up)}.down{color:var(--down)}li{color:#cfd3da}.hero{width:100%;border-radius:10px;margin:14px 0}
.btn{display:inline-block;background:var(--acc);color:#071425;padding:9px 16px;border-radius:8px;font-weight:600;text-decoration:none;margin:22px 0}
.list a{display:block;padding:10px 0;border-bottom:1px solid var(--line);color:var(--tx);text-decoration:none}.list a:hover{color:var(--acc)}.list small{color:var(--mute);display:block}`;
const AD = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2407147539092560" crossorigin="anonymous"></script>';

function page({ L, path, alts, title, desc, body, ld, img }) {
  const links = alts.map(a => `<link rel="alternate" hreflang="${HL[a]}" href="${BASE}${pre(a)}${path}">`).join('\n')
    + (alts.includes('en') ? `\n<link rel="alternate" hreflang="x-default" href="${BASE}${path}">` : '');
  return `<!doctype html>
<html lang="${HL[L]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc).slice(0, 300)}">
<link rel="canonical" href="${BASE}${pre(L)}${path}">
${links}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc).slice(0, 300)}"><meta property="og:type" content="article">${img ? `<meta property="og:image" content="${esc(img)}">` : ''}
<link rel="alternate" type="application/rss+xml" title="Patchwork" href="${BASE}${pre(L)}/feed.xml">
${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` : ''}
${AD}
<style>${CSS}</style>
</head>
<body>
<header><div class="wrap top"><a href="/?lang=${L}">Patch<b>work</b></a><span class="lg">${alts.filter(a => a !== L).map(a => `<a href="${pre(a)}${path}">${a.toUpperCase()}</a>`).join('')}</span></div></header>
<main class="wrap">${body}</main>
<script>window.LANG=${JSON.stringify(L)}</script><script src="/i18n.js"></script><script src="/foot.js"></script>
</body>
</html>`;
}

const out = (rel, s) => { const u = new URL('.' + rel, DIR); fs.mkdirSync(new URL('./', u), { recursive: true }); fs.writeFileSync(u, s); };
const outP = (rel, s) => out(rel + '.html', s);
// 예전 생성물 지우고 새로
for (const L of LANGS) for (const d of ['p', 'g']) fs.rmSync(new URL(`.${pre(L)}/${d}/`, DIR), { recursive: true, force: true });

const items = db.items.filter(i => i.title).sort((a, b) => b.date - a.date);
const urls = []; // [path, alts, lastmod]
let n = 0;
for (const i of items) {
  const alts = langsOf(i), path = `/p/${FILE(i)}`;
  for (const L of alts) {
    const t = TX(i, L), U = UI[L], g = GN(i.game, L);
    const sec = (h, a, c = '') => a?.length ? `<h2 class="${c}">${h}</h2><ul>${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    const title = `${t.title} – ${g} ${U.pn}`;
    const body = `<div class="meta"><a href="${pre(L)}/g/${gslug(i)}">${esc(g)}</a> · <time datetime="${iso(i.date)}">${day(i.date, L)}</time></div>
<h1>${esc(t.title)}</h1>${i.maint ? `<p class="meta"><b>UTC ${new Date(i.maint.s * 1000).toISOString().slice(0, 16).replace("T", " ")} ~ ${i.maint.e ? new Date(i.maint.e * 1000).toISOString().slice(11, 16) : "?"}</b></p>` : ""}${i.img ? `<img class="hero" src="${esc(i.img)}" alt="${esc(g)}" loading="lazy">` : ''}
<p>${esc(t.summary)}</p>${sec(U.hl, t.highlights)}${sec(U.buff, t.buffs, 'up')}${sec(U.nerf, t.nerfs, 'down')}${sec(U.fix, t.fixes)}
<a class="btn" href="/?lang=${L}&p=${encodeURIComponent(PID(i))}">${U.open}</a>
<p class="meta">${U.src}: <a href="${esc(i.url)}" rel="nofollow noopener" target="_blank">${esc(i.origTitle)}</a></p>`;
    outP(pre(L) + path, page({ L, path, alts, title, desc: t.summary, body, img: i.img,
      ld: { '@context': 'https://schema.org', '@type': 'Article', headline: t.title.slice(0, 110), datePublished: iso(i.date), description: t.summary, about: { '@type': 'VideoGame', name: g }, ...(i.img && { image: i.img }), publisher: { '@type': 'Organization', name: 'Patchwork' } } }));
    n++;
  }
  if (alts.length) urls.push([path, alts, iso(i.date)]);
}
// 게임별 목록
const byGame = new Map();
for (const i of items) { const k = gslug(i); if (!byGame.has(k)) byGame.set(k, []); byGame.get(k).push(i); }
for (const [slug, list] of byGame) {
  const alts = LANGS.filter(L => list.some(i => TX(i, L)?.title)), path = `/g/${slug}`;
  for (const L of alts) {
    const U = UI[L], g = GN(list[0].game, L), mine = list.filter(i => TX(i, L)?.title);
    const body = `<h1>${esc(g)} ${U.pn}</h1><p class="meta">${esc(U.latest.replace('{g}', g))}</p><div class="list">${mine.map(i => `<a href="${pre(L)}/p/${FILE(i)}">${esc(TX(i, L).title)}<small>${day(i.date, L)}</small></a>`).join('')}</div>
<a class="btn" href="/?lang=${L}&game=${encodeURIComponent(list[0].game)}">${U.all}</a>`;
    outP(pre(L) + path, page({ L, path, alts, title: `${g} ${U.pn} | Patchwork`, desc: U.latest.replace('{g}', g), body,
      ld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${g} ${U.pn}`, about: { '@type': 'VideoGame', name: g } } }));
  }
  urls.push([path, alts, iso(list[0].date)]);
}
// RSS (언어별 최신 50개)
for (const L of LANGS) {
  const its = items.filter(i => TX(i, L)?.title).slice(0, 50);
  if (!its.length) continue;
  const x = s => esc(s).replace(/'/g, '&apos;');
  out(pre(L) + '/feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Patchwork – ${UI[L].pn}</title><link>${BASE}/?lang=${L}</link><description>${x(UI[L].latest.replace('{g}', '').trim())}</description><language>${HL[L]}</language>
${its.map(i => `<item><title>${x(GN(i.game, L) + ': ' + TX(i, L).title)}</title><link>${BASE}${pre(L)}/p/${FILE(i)}</link><guid>${BASE}${pre(L)}/p/${FILE(i)}</guid><pubDate>${new Date(i.date * 1000).toUTCString()}</pubDate><description>${x(TX(i, L).summary)}</description></item>`).join('\n')}
</channel></rss>`);
}
// sitemap: 기존 고정 페이지 + 생성 페이지
const fixed = ['/', '/about', '/info', '/lol', '/hs', '/pkc', '/privacy'];
const now = new Date().toISOString();
const ent = (path, alts, mod, q = L => `${BASE}${pre(L)}${path}`) => alts.map(L => `  <url><loc>${q(L)}</loc><lastmod>${mod}</lastmod>
${alts.map(a => `    <xhtml:link rel="alternate" hreflang="${HL[a]}" href="${q(a)}"/>`).join('\n')}
  </url>`).join('\n');
const qs = path => L => `${BASE}${path}?lang=${L}`;
fs.writeFileSync(new URL('sitemap.xml', DIR), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${fixed.map(p => ent(p, LANGS, now, qs(p))).join('\n')}
${urls.map(([p, a, m]) => ent(p, a, m)).join('\n')}
</urlset>
`);
console.log('정적 페이지', n, '게임 목록', byGame.size, 'sitemap URL', urls.reduce((s, u) => s + u[1].length, 0) + fixed.length * LANGS.length);
// 새 페이지(2일 안)는 IndexNow 로 Bing·네이버에 바로 알림 (Actions 에서만: INDEXNOW=1)
if (process.env.INDEXNOW) {
  const KEY = 'c873a8ede0ab23209b77dc951359c790', cut = Date.now() - 2 * 864e5;
  const fresh = urls.filter(u => Date.parse(u[2]) > cut).flatMap(([p, a]) => a.map(L => `${BASE}${pre(L)}${p}`));
  if (fresh.length) for (const ep of ['https://api.indexnow.org/indexnow', 'https://searchadvisor.naver.com/indexnow'])
    try { const r = await fetch(ep, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify({ host: 'patchworkgg.pages.dev', key: KEY, keyLocation: `${BASE}/${KEY}.txt`, urlList: fresh }) }); console.log('IndexNow', ep, r.status, fresh.length); } catch (e) { console.error('IndexNow', e.message); }
}
