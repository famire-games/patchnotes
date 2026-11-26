// 포켓몬 챔피언스 정보 → site/pkc/data.json  (출처: PokeAPI, Champions 도감·배울 수 있는 기술)
// 사용: node pkc_build.mjs   (요청은 .cache/pokeapi 에 저장해 두고 재사용)
import fs from 'node:fs';
const OUT = new URL('site/pkc/', import.meta.url);
const CACHE = new URL('.cache/pokeapi/', import.meta.url);
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(CACHE, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url) {
  const key = new URL(url.replace('https://pokeapi.co/api/v2/', '').replace(/\/$/, '').replace(/[\/?=&]/g, '_') + '.json', CACHE);
  // 저장본은 7일까지만 재사용 (게임 데이터가 바뀌면 일주일 안에 반영)
  if (fs.existsSync(key) && Date.now() - fs.statSync(key).mtimeMs < 7 * 864e5) return JSON.parse(fs.readFileSync(key));
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'patchnotes-site-builder' } });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json(); fs.writeFileSync(key, JSON.stringify(j)); return j;
    } catch (e) { if (i >= 4) throw new Error(url + ' ' + e.message); await sleep(1000 * (i + 1)); }
  }
}
const pool = async (arr, fn, n = 8) => { const res = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < arr.length) { const k = i++; res[k] = await fn(arr[k]); } })); return res; };
const ko = (names, fb) => (names || []).find(n => n.language.name === 'ko')?.name || fb;
const koText = (arr, key = 'flavor_text') => {
  const k = (arr || []).filter(x => x.language.name === 'ko');
  const t = (k.find(x => /scarlet|violet|legends|champions/.test(x.version_group?.name || '')) || k[k.length - 1])?.[key] || '';
  return t.replace(/\s+/g, ' ').trim();
};
const STAT = { hp: 'HP', attack: '공격', defense: '방어', 'special-attack': '특수공격', 'special-defense': '특수방어', speed: '스피드' };

const dex = await get('https://pokeapi.co/api/v2/pokedex/36/');
console.log('Champions 도감', dex.pokemon_entries.length);

const types = {};
for (const t of (await get('https://pokeapi.co/api/v2/type?limit=30')).results) {
  const d = await get(t.url);
  if (!d.names?.length || ['stellar', 'unknown', 'shadow'].includes(d.name)) continue;
  types[d.name] = { ko: ko(d.names, d.name), double: d.damage_relations.double_damage_to.map(x => x.name),
    half: d.damage_relations.half_damage_to.map(x => x.name), none: d.damage_relations.no_damage_to.map(x => x.name) };
}

const moveIds = new Set(), abilIds = new Set();
const mons = [];
await pool(dex.pokemon_entries, async (e) => {
  const sp = await get(e.pokemon_species.url);
  const spName = ko(sp.names, sp.name);
  for (const v of sp.varieties) {
    const isMega = /-mega/.test(v.pokemon.name);
    if (!v.is_default && !isMega) continue;
    const p = await get(v.pokemon.url);
    const moves = p.moves.filter(m => m.version_group_details.some(d => d.version_group.name === 'champions')).map(m => m.move.name);
    if (!v.is_default && !moves.length && !isMega) continue;
    moves.forEach(m => moveIds.add(m));
    p.abilities.forEach(a => abilIds.add(a.ability.name));
    const art = p.sprites.other?.['official-artwork']?.front_default || p.sprites.front_default || '';
    mons.push({ id: p.id, dex: e.entry_number, species: sp.name, name: isMega ? '메가' + spName + (/-x$/.test(p.name) ? ' X' : /-y$/.test(p.name) ? ' Y' : /-z$/.test(p.name) ? ' Z' : '') : spName,
      en: p.name, mega: isMega, types: p.types.map(t => t.type.name),
      stats: Object.fromEntries(p.stats.map(s => [s.stat.name, s.base_stat])),
      abilities: p.abilities.map(a => ({ id: a.ability.name, hidden: a.is_hidden })), moves, img: art });
  }
});
mons.sort((a, b) => a.dex - b.dex || a.mega - b.mega || a.id - b.id);
console.log('포켓몬(메가 포함)', mons.length, '기술', moveIds.size, '특성', abilIds.size);

const moves = {};
await pool([...moveIds], async (m) => {
  const d = await get('https://pokeapi.co/api/v2/move/' + m + '/');
  moves[m] = { name: ko(d.names, d.name), type: d.type.name, cls: d.damage_class.name, power: d.power, acc: d.accuracy, pp: d.pp,
    pri: d.priority, text: koText(d.flavor_text_entries) };
});
const abilities = {};
await pool([...abilIds], async (a) => {
  const d = await get('https://pokeapi.co/api/v2/ability/' + a + '/');
  abilities[a] = { name: ko(d.names, d.name), text: koText(d.flavor_text_entries) };
});

// 도구: 챔피언스에서 쓸 수 있는 지닌 도구 목록(pkc_items.json, Serebii 기준) → PokeAPI 로 한국어 이름·설명·그림
const IL = JSON.parse(fs.readFileSync(new URL('pkc_items.json', import.meta.url)));
const slug = n => n.toLowerCase().replace(/[’'.]/g, '').replace(/\s+/g, '-');
const items = [];
const megaOf = {};   // 메가스톤 → 메가 포켓몬 (영문 이름 비교)
await pool([...IL.mega.map(n => ['mega', n]), ...IL.held.map(n => ['held', n]), ...IL.berry.map(n => ['berry', n])], async ([kind, en]) => {
  let d = null; const alias = { leek: 'stick' };
  try { d = await get('https://pokeapi.co/api/v2/item/' + (alias[slug(en)] || slug(en)) + '/'); } catch {}
  items.push({ id: slug(en), en, kind, name: d ? ko(d.names, en) : en, text: d ? koText(d.flavor_text_entries, 'text') : '',
    img: d?.sprites?.default || '', missing: !d });
});
// 메가스톤 ↔ 메가 포켓몬 연결: 'Charizardite X' → charizard-mega-x
for (const it of items.filter(i => i.kind === 'mega')) {
  const who = (it.text.match(/^(.+?)에게 지니게/) || [])[1];
  const suf = (it.en.match(/ ([XYZ])$/) || [])[1];
  const m = who && mons.find(x => x.mega && x.name === '메가' + who + (suf ? ' ' + suf : ''));
  if (m) { it.mega = m.id; megaOf[m.id] = it.id; }
}
items.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
console.log('도구', items.length, '정보 없음', items.filter(i => i.missing).map(i => i.en).join(', '));

// 챔피언스 밸런스 조정 중 PokeAPI 에 아직 없는 것 (pkc_overrides.json)
const OV = JSON.parse(fs.readFileSync(new URL('pkc_overrides.json', import.meta.url)));
for (const [id, o] of Object.entries(OV.moves || {})) if (moves[id]) {
  for (const [k, v] of Object.entries(o)) if (!k.startsWith('_')) moves[id][k] = v;
  moves[id].patched = o._patch || true;
}
for (const [en, o] of Object.entries(OV.learn || {})) for (const m of mons.filter(x => x.en === en || x.species === en)) {
  m.moves = m.moves.filter(x => !(o.remove || []).includes(x)).concat((o.add || []).filter(x => !m.moves.includes(x)));
}
fs.writeFileSync(new URL('data.json', OUT), JSON.stringify({ built: Date.now(), source: 'PokeAPI', stat: STAT, types, mons, moves, abilities, items, itemSource: IL.source }));
console.log('저장 site/pkc/data.json');
