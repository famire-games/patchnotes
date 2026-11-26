// 롤 게임 데이터 → site/lol/*.json
// 한국어 이름·설명 = Riot Data Dragon(ko_KR), 스킬 수치(피해·계수) = Meraki Analytics
import fs from 'node:fs';
const OUT = new URL('site/lol/', import.meta.url);
fs.mkdirSync(OUT, { recursive: true });
const get = async u => { for (let k = 0; k < 3; k++) { try { const r = await fetch(u); if (r.ok) return r.json(); } catch {} await new Promise(f => setTimeout(f, 1000)); } throw new Error('fail ' + u); };
const V = (await get('https://ddragon.leagueoflegends.com/api/versions.json'))[0];
const DD = `https://ddragon.leagueoflegends.com/cdn/${V}/data/ko_KR`;
const MK = 'https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions';
console.log('버전', V);

const DICT = [[/Magic Damage/g,'마법 피해'],[/Physical Damage/g,'물리 피해'],[/True Damage/g,'고정 피해'],[/Mixed Damage/g,'혼합 피해'],
 [/Bonus/g,'추가'],[/Minimum/g,'최소'],[/Maximum/g,'최대'],[/Total/g,'총'],[/Increased/g,'증가'],[/Reduced/g,'감소'],
 [/Damage/g,'피해'],[/Heal(ing)?/g,'회복'],[/Shield/g,'보호막'],[/Duration/g,'지속 시간'],[/Slow/g,'둔화'],[/Stun/g,'기절'],
 [/Movement Speed/g,'이동 속도'],[/Attack Speed/g,'공격 속도'],[/Armor Penetration/g,'방어구 관통력'],[/Armor/g,'방어력'],
 [/Magic Resistance/g,'마법 저항력'],[/Cooldown Refund/g,'재사용 대기시간 감소'],[/Cooldown/g,'재사용 대기시간'],
 [/Mana Restored/g,'마나 회복'],[/Mana/g,'마나'],[/Health/g,'체력'],[/Per Second/g,'초당'],[/per Second/g,'초당'],
 [/Per Pass/g,'왕복당'],[/Per Hit/g,'타격당'],[/Per Stack/g,'중첩당'],[/Range/g,'사거리'],[/Radius/g,'반경'],[/Speed/g,'속도'],
 [/Champions?/g,'챔피언'],[/Minions?/g,'미니언'],[/Monsters?/g,'몬스터'],[/Knock[ -]?up/gi,'에어본'],[/Root/g,'속박'],
 [/Charm/g,'매혹'],[/Fear/g,'공포'],[/Silence/g,'침묵'],[/Recharge Time/g,'충전 시간'],[/Ratio/g,'계수'],[/Missing/g,'잃은'],
 [/Current/g,'현재'],[/Target's/g,'대상의'],[/Damage Reduction/g,'피해 감소'],[/Attack Damage/g,'공격력'],[/Ability Power/g,'주문력']];
const ko = s => DICT.reduce((t, [a, b]) => t.replace(a, b), s);
const UNIT = u => u.replace('% AP', '% 주문력').replace('% bonus AD', '% 추가 공격력').replace('% AD', '% 공격력')
  .replace('% bonus health', '% 추가 체력').replace('% maximum health', '% 최대 체력').replace("% of target's maximum health", '% 대상 최대 체력')
  .replace('% bonus armor', '% 추가 방어력').replace('% bonus magic resistance', '% 추가 마법 저항력').replace('% missing health', '% 잃은 체력');
function fmtMod(m) {
  const u = UNIT(m.units[0] || ''), vals = m.values;
  const same = vals.every(v => v === vals[0]);
  return (same ? String(vals[0]) : vals.join('/')) + u;
}
function numbers(ab) {
  const out = [];
  for (const e of ab?.effects || []) for (const l of e.leveling || [])
    out.push({ k: ko(l.attribute), v: l.modifiers.map((m, i) => (i ? '+ ' : '') + fmtMod(m)).join(' ') });
  return out.slice(0, 10);
}
const clean = s => (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\{\{[^}]*\}\}/g, '').trim();

// 챔피언
const list = (await get(`${DD}/champion.json`)).data;
const champs = [];
for (const id of Object.keys(list)) {
  const c = Object.values((await get(`${DD}/champion/${id}.json`)).data)[0];
  let mk = null; try { mk = await get(`${MK}/${id}.json`); } catch { console.warn('수치 없음', id); }
  const keys = ['Q', 'W', 'E', 'R'];
  champs.push({ id, key: c.key, name: c.name, title: c.title, tags: c.tags, partype: c.partype, stats: c.stats,
    info: c.info,
    passive: { name: c.passive.name, desc: clean(c.passive.description), img: c.passive.image.full, nums: numbers(mk?.abilities?.P?.[0]) },
    spells: c.spells.map((s, i) => ({ key: keys[i], name: s.name, desc: clean(s.description), img: s.image.full,
      cd: s.cooldownBurn, cost: s.costBurn, costType: clean(s.resource || '').replace(/\d|\//g,'').trim(), range: s.rangeBurn,
      nums: numbers(mk?.abilities?.[keys[i]]?.[0]) })) });
  process.stdout.write('.');
}
champs.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
fs.writeFileSync(new URL('champions.json', OUT), JSON.stringify({ v: V, champs }));

// 룬
const runes = (await get(`${DD}/runesReforged.json`)).map(t => ({ name: t.name, icon: t.icon,
  slots: t.slots.map(s => s.runes.map(r => ({ name: r.name, icon: r.icon, short: clean(r.shortDesc), long: clean(r.longDesc) }))) }));
fs.writeFileSync(new URL('runes.json', OUT), JSON.stringify({ v: V, runes }));

// 아이템 (소환사의 협곡 구매 가능한 것만)
const it = (await get(`${DD}/item.json`)).data;
const items = Object.entries(it).filter(([, x]) => x.maps?.['11'] && x.gold?.purchasable && x.inStore !== false && !x.requiredChampion)
  .map(([id, x]) => ({ id, name: x.name, plain: x.plaintext, desc: clean(x.description), gold: x.gold.total, sell: x.gold.sell,
    from: x.from || [], into: x.into || [], tags: x.tags, depth: x.depth || 1 }));
const seenName = new Set();
const uniq = items.sort((a, b) => b.gold - a.gold).filter(x => !seenName.has(x.name) && seenName.add(x.name));
fs.writeFileSync(new URL('items.json', OUT), JSON.stringify({ v: V, items: uniq }));
console.log('\n챔피언', champs.length, '룬', runes.length, '아이템', uniq.length);
