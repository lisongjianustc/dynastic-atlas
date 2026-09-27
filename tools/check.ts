/**
 * 数据体检（不依赖浏览器）。
 *   npx esbuild tools/check.ts --bundle --platform=node --format=esm --outfile=/tmp/atlas-check.mjs && node /tmp/atlas-check.mjs
 */
import { EVENTS, POLITIES, SEGMENTS } from '../src/data/atlas';
import { PLACES } from '../src/data/places';
import { INTERVALS, RANGE, TRANSITIONS, activeSegmentsAt, yearLabel } from '../src/data/state';
import { validateAtlas } from '../src/data/validate';
import { bboxOf } from '../src/data/geom';

const issues = validateAtlas();
const errors = issues.filter((i) => i.level === 'error');
const warns = issues.filter((i) => i.level === 'warn');

console.log(`政权 ${POLITIES.length} · 疆域段 ${SEGMENTS.length} · 事件 ${EVENTS.length} · 地点 ${PLACES.length} · 状态区间 ${INTERVALS.length}`);
console.log(`校验：${errors.length} 错误 / ${warns.length} 提示`);
for (const i of errors) console.log(`  ✗ [${i.where}] ${i.what}`);
for (const i of warns) console.log(`  ! [${i.where}] ${i.what}`);

// 顶点与包围盒，用来一眼看出几何是否画歪
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

// 抽样：几个关键年份应当有哪些政权
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

// 地点落位：每个地点在它的年代区间内，至少有一年真的落在某个政权的面上。
// 能抓出「坐标画到海里/画到域外」这类错误。
const inRing = (pt: number[], ring: number[][]) => {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const stray: string[] = [];
for (const pl of PLACES) {
  let hit = false;
  for (let y = pl.from; y < pl.to && !hit; y++) {
    for (const seg of activeSegmentsAt(y)) {
      if (inRing(pl.at, seg.geometry as number[][])) {
        hit = true;
        break;
      }
    }
  }
  if (!hit) stray.push(`${pl.id} ${pl.name} [${pl.at}] ${yearLabel(pl.from)}-${yearLabel(pl.to)}`);
}
console.log(
  stray.length
    ? `\n地点未落在任何疆域内（${stray.length}）：\n  ` + stray.slice(0, 12).join('\n  ')
    : '\n地点落位检查通过',
);
// 状态区间分布：哪些区间什么都没变
const noChange = TRANSITIONS.filter((t) => !t.addedPolityIds.length && !t.removedPolityIds.length);
console.log(`\n视野 ${yearLabel(RANGE.from)}–${yearLabel(RANGE.to)}；无政权增减的区间 ${noChange.length}/${TRANSITIONS.length}`);
