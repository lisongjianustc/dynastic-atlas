/**
 * 史料核对台：把所有**可核查的事实主张**摊平成一张表。
 * 人（或 agent）逐条对着来源核，核完把结论写进 src/data/review.ts。
 */
import { EVENTS, POLITIES, SEGMENTS } from '../src/data/atlas';
import { PLACES } from '../src/data/places';
import { yearLabel } from '../src/data/state';

const yl = (y: number) => yearLabel(y);

console.log('══════ 一、政权存续区间（可对着纪年表核） ══════');
for (const p of POLITIES) {
  console.log(`${p.id.padEnd(14)} ${p.name.padEnd(10)} ${yl(p.from)}–${yl(p.to)}  段数 ${SEGMENTS.filter(s => s.polityId === p.id).length}`);
}

console.log('\n══════ 二、疆域段时间（应与政权存续相容） ══════');
for (const s of SEGMENTS) {
  const p = POLITIES.find(x => x.id === s.polityId)!;
  const before = s.from < p.from ? ' ⚠早于政权' : '';
  const after = s.to > p.to ? ' ⚠晚于政权' : '';
  console.log(`${s.id.padEnd(16)} ${p.name.padEnd(8)} ${yl(s.from)}–${yl(s.to)} ${s.control}${before}${after}${s.note ? '  // ' + s.note : ''}`);
}

console.log('\n══════ 三、事件（年份 / 地点 / 人物 / 相关政权） ══════');
for (const e of EVENTS) {
  const ps = e.polityIds.map(id => POLITIES.find(p => p.id === id)?.name ?? id).join('、') || '—';
  const bad = e.polityIds.filter(id => {
    const p = POLITIES.find(x => x.id === id);
    if (!p) return true;
    return !(p.from - 1 <= e.y && e.y <= p.to + 1);
  });
  console.log(`${e.id} ${yl(e.y).padEnd(8)} ${e.title.padEnd(18)} @${e.place.padEnd(10)} [${ps}]${bad.length ? '  ⚠政权年份不符' : ''}`);
}

console.log('\n══════ 四、地点（坐标 / 年代 / 类型） ══════');
for (const pl of PLACES) {
  console.log(`${pl.id.padEnd(14)} ${pl.name.padEnd(10)} ${pl.kind.padEnd(9)} ${pl.at[0].toFixed(2)},${pl.at[1].toFixed(2)}  ${yl(pl.from)}–${yl(pl.to)}  ${pl.note ?? ''}`);
}

console.log(`\n合计：政权 ${POLITIES.length} · 疆域段 ${SEGMENTS.length} · 事件 ${EVENTS.length} · 地点 ${PLACES.length}`);
console.log(`待核验记录 ${SEGMENTS.length + EVENTS.length} 条（疆域段 + 事件）`);
