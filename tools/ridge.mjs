/**
 * 山脊线提取：对山脉区域的南北缘取中线。
 *
 * 为什么不用 route.mjs 沿多边形走？多边形的两条长边分别是山脉的北麓和南麓，
 * 沿任一条走都会把关中盆地或汉中盆地整块切出去。历史边界要的是**分水岭**，
 * 所以按经度采样，取南北缘的中点。
 *
 *   node tools/ridge.mjs "Qinling" 105 114 0.35 --name=QINLING_CREST
 *   node tools/ridge.mjs "Yin Mts"  105.5 112 0.3 --name=YIN_SHAN
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const [name, lonA, lonB, step] = process.argv.slice(2);
const opt = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const outName = opt('name', 'RIDGE');
const axis = opt('axis', 'lat'); // lat = 东西走向的山脉，取南北缘中点

const fc = JSON.parse(readFileSync(resolve(HERE, '.ref/ranges.geojson'), 'utf8'));
const feats = fc.features.filter((f) => (f.properties?.name ?? '').toLowerCase().includes(name.toLowerCase()));
if (!feats.length) {
  console.error(`找不到区域：${name}`);
  process.exit(1);
}

const rings = feats.map((f) => f.geometry.coordinates);
const A = Number(lonA);
const B = Number(lonB);
const S = Number(step);

/** 扫描线：求某条经线（或纬线）与所有环的交点，返回排序后的取值 */
function crossings(rings, x) {
  const ys = [];
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      if ((x1 > x && x2 > x) || (x1 < x && x2 < x) || x1 === x2) continue;
      ys.push(y1 + ((x - x1) / (x2 - x1)) * (y2 - y1));
    }
  }
  return [...new Set(ys.map((v) => Math.round(v * 1000) / 1000))].sort((a, b) => a - b);
}

const pts = [];
for (let x = A; x <= B + 1e-9; x = Math.round((x + S) * 1000) / 1000) {
  const ys = crossings(rings, x);
  if (ys.length < 2) continue;
  const lo = ys[0];
  const hi = ys[ys.length - 1];
  const mid = axis === 'lat' ? (lo + hi) / 2 : (lo + hi) / 2;
  pts.push([x, Math.round(mid * 100) / 100]);
}

console.log(`// ${name} 南北缘中线：取到 ${pts.length} 点（经度步长 ${S}°）`);
console.log(`export const ${outName}: Pt[] = [`);
for (let i = 0; i < pts.length; i += 5) {
  console.log('  ' + pts.slice(i, i + 5).map((p) => `[${p[0]}, ${p[1]}]`).join(', ') + ',');
}
console.log('];');
