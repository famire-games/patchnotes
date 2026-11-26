// 하스스톤 전장 데이터 → site/hs/bg.json
// 주 출처: Blizzard Battle.net Game Data API (현재 시즌 카드만, 공식 이미지). 약관상 30일 안에 다시 실행해 갱신.
// 보조: HearthstoneJSON koKR (장신구 크기 구분용, dbfId = 블리자드 id)
import fs from 'node:fs';
const OUT = new URL('site/hs/', import.meta.url);
fs.mkdirSync(OUT, { recursive: true });
const CID = process.env.BLIZZARD_CLIENT_ID, CSEC = process.env.BLIZZARD_CLIENT_SECRET;
if (!CID || !CSEC) { console.error('BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET 환경변수가 필요합니다'); process.exit(1); }

const tok = (await (await fetch('https://oauth.battle.net/token', { method: 'POST',
  headers: { Authorization: 'Basic ' + Buffer.from(CID + ':' + CSEC).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'grant_type=client_credentials' })).json()).access_token;
const api = async (path, tries = 3) => {
  for (let i = 0; ; i++) {
    const r = await fetch('https://kr.api.blizzard.com/hearthstone/' + path + (path.includes('?') ? '&' : '?') + 'locale=ko_KR',
      { headers: { Authorization: 'Bearer ' + tok } });
    if (r.ok) return r.json();
    if (i >= tries) throw new Error(path + ' ' + r.status);
    await new Promise(s => setTimeout(s, 1000 * (i + 1)));
  }
};
const list = async (ty) => { const out = []; for (let p = 1; ; p++) {
  const r = await api(`cards?gameMode=battlegrounds&bgCardType=${ty}&pageSize=500&page=${p}`);
  out.push(...r.cards); if (p >= (r.pageCount || 1)) return out; } };
const cache = new Map();
const card = (id) => { if (!id) return null; if (!cache.has(id)) cache.set(id, api(`cards/${id}?gameMode=battlegrounds`).catch(() => null)); return cache.get(id); };
const pool = async (arr, fn, n = 8) => { const res = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < arr.length) { const k = i++; res[k] = await fn(arr[k]); } })); return res; };

const txt = s => (s || '').replace(/\[x\]/g, '').replace(/[$#](\d+)/g, '$1').replace(/\|\d+\(([^,()]*),[^)]*\)/g, '$1').replace(/@/g, '').replace(/\n/g, ' ')
  .replace(/<(?!\/?b>)[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const img = x => x?.battlegrounds?.image || x?.image || '';
const crop = x => x?.cropImage || '';
const ko = (a, b) => a.name.localeCompare(b.name, 'ko');
const uniq = (arr) => { const s = new Set(); return arr.filter(x => !s.has(x.name) && s.add(x.name)); };

const types = await api('metadata/minionTypes');
const RACE = new Map(types.map(t => [t.id, t.name]));
const races = x => [...new Set([x.minionTypeId, ...(x.multiTypeIds || [])].filter(Boolean).map(i => RACE.get(i)).filter(Boolean))];

let hsj = new Map();
try { const c = await (await fetch('https://api.hearthstonejson.com/v1/latest/koKR/cards.json')).json(); hsj = new Map(c.map(x => [x.dbfId, x])); }
catch { console.warn('HearthstoneJSON 실패 — 장신구 크기는 비용으로 추정'); }

// 15시즌(12/1~) 기준: 장신구는 시즌 아웃, 변칙·퀘스트·퀘스트 보상도 이번 시즌 없음 → 시간왜곡 선술집만 추가
const [H, M, S, W] = await Promise.all(['hero', 'minion', 'spell', 'timewarp'].map(list));

const heroes = uniq(await pool(H, async x => {
  const hp = hsj.get(hsj.get(x.id)?.heroPowerDbfId);
  const p = (await card(x.battlegrounds?.heroPowerId)) || (await card(hsj.get(x.id)?.heroPowerDbfId)) || (hp && { name: hp.name, manaCost: hp.cost, text: hp.text }), b = await card(x.battlegrounds?.companionId);
  return { id: String(x.id), name: x.name, armor: x.armor || 0, hp: x.health, img: img(x), duos: !!x.battlegrounds?.duosOnly, solos: !!x.battlegrounds?.solosOnly,
    power: { name: txt(p?.name) || '영웅 능력', cost: p?.manaCost ?? 0, text: txt(p?.text) },
    buddy: b ? { name: b.name, tier: b.battlegrounds?.tier, atk: b.attack, hp: b.health, text: txt(b.text), img: img(b) } : null };
})).sort(ko);

const minions = uniq(await pool(M, async x => {
  const g = await card(x.battlegrounds?.upgradeId);
  return { id: String(x.id), name: x.name, tier: x.battlegrounds?.tier, atk: x.attack, hp: x.health, races: races(x),
    text: txt(x.text), golden: g ? txt(g.text) : '', gatk: g?.attack, ghp: g?.health, img: img(x),
    duos: !!x.battlegrounds?.duosOnly, solos: !!x.battlegrounds?.solosOnly };
})).sort((a, b) => a.tier - b.tier || ko(a, b));

const simple = x => ({ id: String(x.id), name: x.name, text: txt(x.text), img: img(x), crop: crop(x), duos: !!x.battlegrounds?.duosOnly, solos: !!x.battlegrounds?.solosOnly });
const spells = uniq(S.map(x => ({ ...simple(x), tier: x.battlegrounds?.tier, cost: x.manaCost })))
  .sort((a, b) => (a.tier || 0) - (b.tier || 0) || ko(a, b));
const timewarp = uniq(W.map(x => ({ ...simple(x), cost: x.manaCost, atk: x.attack, hp: x.health, races: races(x),
  kind: x.cardTypeId === 4 ? '하수인' : '주문' }))).sort((a, b) => a.cost - b.cost || ko(a, b));

// 관련 카드: 효과 문구에 다른 카드 이름(토큰 등)이 나오면 그 카드 정보·그림을 붙임
// 우선 블리자드 목록, 없으면 HearthstoneJSON 전장 세트(새 토큰은 패치 후 갱신되면 자동 반영)
const ref = new Map();
for (const x of [...minions, ...spells, ...timewarp]) if (!ref.has(x.name))
  ref.set(x.name, { name: x.name, text: x.text, img: x.img || x.crop, atk: x.atk, hp: x.hp, tier: x.tier });
for (const h of hsj.values()) {
  if (h.set !== 'BATTLEGROUNDS' || !h.name || !h.text || /_G$/.test(h.id) || !['MINION', 'SPELL', 'BATTLEGROUND_SPELL'].includes(h.type)) continue;
  if (ref.has(h.name)) continue;
  ref.set(h.name, { name: h.name, text: txt(h.text), atk: h.attack, hp: h.health, tier: h.techLevel,
    img: h.type === 'MINION' ? `https://art.hearthstonejson.com/v1/bgs/latest/koKR/256x/${h.id}.png` : `https://art.hearthstonejson.com/v1/render/latest/koKR/256x/${h.id}.png` });
}
const refNames = [...ref.keys()].filter(n => n.length >= 3).sort((a, b) => b.length - a.length);
const related = (self, ...texts) => {
  let t = texts.filter(Boolean).join(' ').replace(/<\/?b>/g, ''); const out = [];
  for (const n of refNames) if (n !== self && t.includes(n)) { out.push(ref.get(n)); t = t.split(n).join(' '); }
  return out.length ? out : undefined;
};
for (const x of minions) x.related = related(x.name, x.text, x.golden);
for (const x of [...spells, ...timewarp]) x.related = related(x.name, x.text);
for (const x of heroes) x.related = related(x.name, x.power.text, x.buddy?.text);
// 본문에 나오지만 데이터가 아직 없는 이름(「…을/를 얻습니다」 등)은 missing 으로 표시
const unknownTok = (t) => [...(t || '').replace(/<\/?b>/g, '').matchAll(/(?:^|[:.,] )([가-힣' ]{3,15}?)(?:을|를) (?:둘 |셋 |\d+개 )?(?:얻|소환)/g)]
  .flatMap(m => m[1].trim().split(/(?:와|과) /)).filter(n => n.length >= 3 && !/전투/.test(n) && !ref.has(n) && !/^(무작위|내 |내가|그 |이 )|하수인|카드|주문|혈석|능력치|공격력|생명력|피해|동전|방어도|보너스|천상의|골드|포상|오색비룡/.test(n));
for (const x of [...minions, ...spells, ...timewarp]) { const u = [...new Set(unknownTok(x.text))]; if (u.length) x.missing = u; }

fs.writeFileSync(new URL('bg.json', OUT), JSON.stringify({ built: Date.now(), source: 'Blizzard', heroes, minions, spells, timewarp }));
console.log({ heroes: heroes.length, minions: minions.length, spells: spells.length, timewarp: timewarp.length,
  noPower: heroes.filter(h => !h.power.name).length, noImg: minions.filter(m => !m.img).length });
