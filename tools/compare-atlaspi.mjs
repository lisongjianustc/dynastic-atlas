/**
 * 把我的疆域面与 AtlasPI（Apache-2.0）的同名政权面做几何对比。
 *
 *   node tools/compare-atlaspi.mjs
 *
 * ## 这个对比能说明什么、不能说明什么
 *
 * AtlasPI 的精简数据集（/v1/export/geojson）每个政权**只有一个轮廓**，
 * 且往往是该政权最大疆域的近似，不带逐年变化。
 * 本项目则是按状态区间切分的面。
 *
 * 所以这个对比**只该看量级与方位**，不追逐点吻合：
 *   IoU 高 → 两套独立数据在这个政权的大致范围上互相印证
 *   IoU 低 → 至少一方错了，需要人去查
 * 它是**线索**，不是判决。
 *
 * 统计只取 control === 'core' 的段 —— military / indirect 是军镇与羁縻，
 * 本来就不该与「直辖疆域」的面直接比。
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ap = JSON.parse(readFileSync(resolve(HERE, '.ref/atlaspi.geojson'), 'utf8'));

/** 本项目 polityId → AtlasPI 的 name_original */
const MAP = {
  liang: '梁朝', chen: '陳朝', wei_n: '北魏', zhou_n: '北周', qi_n: '隋以前北朝',
  sui: '隋朝', tang: '唐朝', houzhao: '後趙', qianqin: '前秦', tuyuhun: '吐谷浑',
  gaogouli: '고구려', tubo: '吐蕃', huihu: 'ئۇيغۇر خانلىقى', bohai: '渤海國',
  nanzhao: '南詔', tujue_e: '𐰜𐰇𐰛:𐱅𐰇𐰼𐰜',
};

const ringsOf = (g) => (g.type === 'Polygon' ? g.coordinates : g.coordinates.flat());
const bboxOf = (rs) => {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const r of rs) for (const [x, y] of r) {
    if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y;
  }
  return [a, b, c, d];
};

/** 有符号面积（鞋带）。重心与面积必须用**同一个**符号约定，否则重心会飞到地球另一边 */
const signedArea = (ring) => {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    s += rj(ring, i, j);
  }
  return s / 2;
};
const rj = (ring, i, j) => ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];

const areaOf = (rs) => Math.abs(rs.reduce((n, r) => n + signedArea(r), 0));

const centroidOf = (rs) => {
  let cx = 0, cy = 0, a = 0;
  for (const r of rs) {
    const sa = signedArea(r);
    let x = 0, y = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const f = rj(r, i, j);
      x += (r[j][0] + r[i][0]) * f;
      y += (r[j][1] + r[i][1]) * f;
    }
    if (sa === 0) continue;
    cx += (x / (6 * sa)) * sa;
    cy += (y / (6 * sa)) * sa;
    a += sa;
  }
  return a === 0 ? [0, 0] : [cx / a, cy / a];
};

const inRing = (pt, ring) => {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/** 网格法估 IoU：多边形求交易错，这里只需量级，0.05° 网格在本项目精度上够用 */
const iou = (A, B, bbox, N = 160) => {
  const [x0, y0, x1, y1] = bbox;
  const dx = (x1 - x0) / N, dy = (y1 - y0) / N;
  let inter = 0, uni = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const p = [x0 + (i + 0.5) * dx, y0 + (j + 0.5) * dy];
      const a = A.some((r) => inRing(p, r));
      const b = B.some((r) => inRing(p, r));
      if (a && b) inter++;
      if (a || b) uni++;
    }
  }
  return uni ? inter / uni : 0;
};

const apByName = new Map(ap.features.map((f) => [f.properties.name_original, f]));
const { POLITIES, SEGMENTS, activeSegmentsAt } = await import('../.cache/atlas.mjs');

/** 取某政权在某年的直辖段并成一组环 */
const mineAt = (pid, year) =>
  activeSegmentsAt(year)
    .filter((s) => s.polityId === pid && s.control === 'core')
    .map((s) => s.geometry);

const pad = (s, n) => String(s).padEnd(n);
const num = (v, n, d = 1) => v.toFixed(d).padStart(n);

console.log('政权'.padEnd(10) + '年份   我的面积  AtlasPI  面积比    IoU    重心偏移   判定');
console.log('─'.repeat(84));

const rows = [];
for (const [pid, apName] of Object.entries(MAP)) {
  const f = apByName.get(apName);
  if (!f) continue;
  const B = ringsOf(f.geometry);
  const bboxB = bboxOf(B);
  const cenB = centroidOf(B);

  // **在本项目疆域最大的那一年比**。
  // AtlasPI 每个政权只给一个轮廓，且基本是最大疆域；拿建国那年的小疆域去比，
  // 量出来的 IoU 全是取样造成的假差异（早先 渤海 0.27、高句丽 0.24 就是这么来的）。
  const segs = SEGMENTS.filter((s) => s.polityId === pid && s.control === 'core');
  if (!segs.length) continue;
  let best = null;
  for (let y = segs[0].from; y < segs[segs.length - 1].to; y++) {
    const a = areaOf(mineAt(pid, y));
    if (!best || a > best.area) best = { year: y, area: a };
  }
  if (!best) continue;

  for (const year of [best.year]) {
    const A = mineAt(pid, year);
    if (!A.length) continue;
    const bboxA = bboxOf(A);
    const union = [
      Math.min(bboxA[0], bboxB[0]), Math.min(bboxA[1], bboxB[1]),
      Math.max(bboxA[2], bboxB[2]), Math.max(bboxA[3], bboxB[3]),
    ];
    const aA = areaOf(A), aB = areaOf(B);
    const [ca, cb] = [centroidOf(A), cenB];
    const off = Math.hypot(ca[0] - cb[0], ca[1] - cb[1]);
    const i = iou(A, B, union);
    const verdict = i >= 0.6 ? '互相印证' : i >= 0.4 ? '大致相符' : '差异大·待查';
    rows.push({ pid, year, aA, aB, i, off, verdict });
    const name = POLITIES.find((p) => p.id === pid)?.name ?? pid;
    console.log(
      pad(name, 10) + pad(year, 7) + num(aA, 9) + num(aB, 9) + num(aA / (aB || 1), 8, 2) +
      num(i, 8, 3) + num(off, 10, 2) + '  ' + verdict,
    );
  }
}

const ok = rows.filter((r) => r.i >= 0.4).length;
console.log('─'.repeat(84));
console.log(`可比 ${rows.length} 项：互相印证 ${rows.filter(r=>r.i>=0.6).length} · 大致相符 ${rows.filter(r=>r.i>=0.4&&r.i<0.6).length} · 差异大 ${rows.filter(r=>r.i<0.4).length}`);
console.log('\n注意：AtlasPI 每个政权只有一个轮廓（常取最大疆域），本项目按状态区间切分。');
console.log('IoU 高说明两套独立数据在量级与方位上互相印证；低则是**线索**，需要人去查，不是判决。');
