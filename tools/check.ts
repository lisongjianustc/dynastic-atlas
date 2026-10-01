/**
 * 数据体检报告（人读的，不做断言）。
 *
 *   npm run report
 *
 * 断言都搬进了 `tests/data/`，由 vitest 负责，失败会给出行号与差异。
 * 这个脚本只负责把「一眼看得出画歪没有」的量化信息打出来：
 * 顶点数、包围盒、抽样年份、区间分布。
 * 两处都放断言的话，迟早会互相打架。
 */
import { EVENTS, POLITIES, SEGMENTS } from '../src/data/atlas';
import { SOURCES } from '../src/data/sources';
import { COVERAGE } from '../src/data/governance';
import { PLACES } from '../src/data/places';
import { INTERVALS, RANGE, TRANSITIONS, activeSegmentsAt, yearLabel } from '../src/data/state';
import { validateAtlas } from '../src/data/validate';
import { bboxOf } from '../src/data/geom';

const issues = validateAtlas();
const errors = issues.filter((i) => i.level === 'error');
const warns = issues.filter((i) => i.level === 'warn');

console.log(
  `政权 ${POLITIES.length} · 疆域段 ${SEGMENTS.length} · 事件 ${EVENTS.length} · 地点 ${PLACES.length} · 来源 ${SOURCES.length} · 状态区间 ${INTERVALS.length}`,
);

const byPrecision = SEGMENTS.reduce<Record<string, number>>(
  (a, s) => ((a[s.spatialPrecision] = (a[s.spatialPrecision] ?? 0) + 1), a),
  {},
);
const records = [...SEGMENTS, ...EVENTS, ...PLACES];
const reviewed = records.filter((r) => r.review.status === 'verified');
const deep = reviewed.filter((r) => r.review.depth === 'source').length;
const human = reviewed.filter((r) => r.review.reviewerKind === 'human').length;
const withLocator = records.filter((r) => r.evidence.some((e) => e.locator)).length;

console.log(`空间精度：${Object.entries(byPrecision).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(
  `审查：已核验 ${reviewed.length} / ${records.length}（逐条比对 ${deep} · 人工审定 ${human} · 其余 pending）`,
);
console.log(`页码级定位：${withLocator} / ${records.length} 条已填`);
console.log(
  `覆盖声明：${COVERAGE.length} 条（missing ${COVERAGE.filter((c) => c.status === 'missing').length} · pending ${
    COVERAGE.filter((c) => c.status === 'pending').length
  } · verified ${COVERAGE.filter((c) => c.status === 'verified').length}）`,
);
console.log(`校验：${errors.length} 错误 / ${warns.length} 提示`);
for (const i of errors) console.log(`  ✗ [${i.where}] ${i.what}`);
for (const i of warns) console.log(`  ! [${i.where}] ${i.what}`);

let verts = 0;
for (const s of SEGMENTS) verts += s.geometry.length;
console.log(`\n顶点总数 ${verts}，平均每段 ${(verts / SEGMENTS.length).toFixed(1)}`);

const bad: string[] = [];
for (const s of SEGMENTS) {
  const [minX, minY, maxX, maxY] = bboxOf(s.geometry);
  if (maxX - minX > 70 || maxY - minY > 40) {
    bad.push(`${s.id} 包围盒过大 ${(maxX - minX).toFixed(1)}°×${(maxY - minY).toFixed(1)}°`);
  }
  if (maxY < 15 || minY > 55 || maxX < 70 || minX > 145) {
    bad.push(`${s.id} 包围盒偏离中国区域 [${minX.toFixed(1)},${minY.toFixed(1)}]-[${maxX.toFixed(1)},${maxY.toFixed(1)}]`);
  }
}
console.log(bad.length ? `\n几何可疑：\n  ${bad.join('\n  ')}` : '\n几何包围盒检查通过');

const probes: [number, string][] = [
  [310, '永嘉前后'],
  [230, '三国'],
  [290, '西晋统一'],
  [383, '淝水之战当年'],
  [410, '十六国最碎'],
  [540, '东西魏并立'],
  [750, '天宝年间'],
  [880, '黄巢入长安'],
];
console.log('');
for (const [y, label] of probes) {
  const names = activeSegmentsAt(y)
    .map((s) => `${s.polityId}:${s.control}`)
    .join(' ');
  console.log(`${yearLabel(y).padEnd(8)} ${label.padEnd(12)} ${names}`);
}

const noChange = TRANSITIONS.filter((t) => !t.addedPolityIds.length && !t.removedPolityIds.length);
console.log(`\n视野 ${yearLabel(RANGE.from)}–${yearLabel(RANGE.to)}；无政权增减的区间 ${noChange.length}/${TRANSITIONS.length}`);
