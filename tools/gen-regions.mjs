/**
 * 生成 src/data/regions.ts —— 真实地理参照几何。
 *
 * 这些是**数据**，不是手写代码：从 Natural Earth 的 10m 区域多边形与河道中提出来，
 * 供 src/data/geo.ts 拼装政权外环。改了参照要重跑：
 *
 *   npm run basemap && npm run regions
 *
 * 三种模式：
 *   ring   直接取区域外环（政权本身就是这块地理单元时用，如成汉≈四川盆地）
 *   ridge  取山脉多边形按经度采样的南北缘中线（分水岭；沿任一条边走都会切掉盆地）
 *   route  沿河道中心线在两个锚点之间走一遍（黄河中段就是东西魏的分界）
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(readFileSync(resolve(HERE, '.ref', `${f}.geojson`), 'utf8'));

const RANGES = load('ranges');
const RIVERS = load('rivers');

const pick = (fc, grep) => {
  const hits = fc.features.filter((f) => (f.properties?.name ?? '').toLowerCase().includes(grep.toLowerCase()));
  if (!hits.length) throw new Error(`参照数据里找不到：${grep}`);
  return hits;
};

const r2 = (n) => Math.round(n * 100) / 100;
const fmt = (pts) => {
  const rows = pts.map(([x, y]) => `[${r2(x)}, ${r2(y)}]`);
  const out = [];
  for (let i = 0; i < rows.length; i += 5) out.push('  ' + rows.slice(i, i + 5).join(', ') + ',');
  return out.join('\n');
};

function ringOf(grep, sample = 1) {
  const hit = pick(RANGES, grep).sort((a, b) => b.geometry.coordinates.length - a.geometry.coordinates.length)[0];
  const ring = hit.geometry.coordinates;
  const pts = ring.filter((_, i) => i % sample === 0);
  if (pts[pts.length - 1][0] !== ring[ring.length - 1][0]) pts.push(ring[ring.length - 1]);
  return { pts, src: hit.properties.name, raw: ring.length };
}

function ridgeOf(grep, lonA, lonB, step) {
  const rings = pick(RANGES, grep).map((f) => f.geometry.coordinates);
  const cross = (x) => {
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
  };
  const pts = [];
  for (let x = lonA; x <= lonB + 1e-9; x = Math.round((x + step) * 1000) / 1000) {
    const ys = cross(x);
    if (ys.length < 2) continue;
    pts.push([x, (ys[0] + ys[ys.length - 1]) / 2]);
  }
  return { pts, src: pick(RANGES, grep)[0].properties.name, raw: pts.length };
}

/** 沿河道走：把多段折线拼成图后取最短路，与 tools/route.mjs 同一套办法 */
function routeOf(grep, a, b, step) {
  const nodes = [];
  const adj = [];
  const push = (x, y) => (nodes.push({ x, y }), adj.push([]), nodes.length - 1);
  const link = (u, v, pen = 1) => {
    const w = Math.hypot(nodes[u].x - nodes[v].x, nodes[u].y - nodes[v].y) * pen;
    adj[u].push([v, w]);
    adj[v].push([u, w]);
  };
  const ends = [];
  for (const f of pick(RIVERS, grep)) {
    const line = f.geometry.coordinates;
    if (line.length < 2) continue;
    const ids = line.map(([x, y]) => push(x, y));
    for (let i = 1; i < ids.length; i++) link(ids[i - 1], ids[i]);
    ends.push(ids[0], ids[ids.length - 1]);
  }
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      if (Math.hypot(nodes[ends[i]].x - nodes[ends[j]].x, nodes[ends[i]].y - nodes[ends[j]].y) < 0.35) {
        link(ends[i], ends[j], 200);
      }
    }
  }
  const nearest = ([x, y]) => {
    let best = -1;
    let bd = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const d = (nodes[i].x - x) ** 2 + (nodes[i].y - y) ** 2;
      if (d < bd) (bd = d), (best = i);
    }
    return best;
  };
  const s = nearest(a);
  const g = nearest(b);
  const dist = new Float64Array(nodes.length).fill(Infinity);
  const prev = new Int32Array(nodes.length).fill(-1);
  dist[s] = 0;
  const pq = [[0, s]];
  while (pq.length) {
    pq.sort((p, q) => p[0] - q[0]);
    const [d, u] = pq.shift();
    if (d > dist[u]) continue;
    if (u === g) break;
    for (const [v, w] of adj[u]) {
      if (d + w < dist[v]) (dist[v] = d + w), (prev[v] = u), pq.push([d + w, v]);
    }
  }
  if (dist[g] === Infinity) throw new Error(`${grep}: 两锚点之间没有通路`);
  const path = [];
  for (let v = g; v !== -1; v = prev[v]) path.push(v);
  path.reverse();
  const out = [path[0]];
  for (const idx of path.slice(1)) {
    const last = nodes[out[out.length - 1]];
    if (Math.hypot(nodes[idx].x - last.x, nodes[idx].y - last.y) >= step) out.push(idx);
  }
  if (out[out.length - 1] !== path[path.length - 1]) out.push(path[path.length - 1]);
  return { pts: out.map((i) => [nodes[i].x, nodes[i].y]), src: pick(RIVERS, grep)[0].properties.name, raw: path.length };
}

const SPECS = [
  { name: 'TIBET_PLATEAU', mode: 'ring', grep: 'PLATEAU OF TIBET', sample: 2 },
  { name: 'HIMALAYA', mode: 'ring', grep: 'HIMALAYAS', sample: 3 },
  { name: 'SICHUAN_BASIN', mode: 'ring', grep: 'SICHUAN BASIN', sample: 1 },
  { name: 'TARIM_BASIN', mode: 'ring', grep: 'TARIM BASIN', sample: 1 },
  { name: 'LOESS_PLATEAU', mode: 'ring', grep: 'Loess Plateau', sample: 2 },
  { name: 'ORDOS', mode: 'ring', grep: 'Mu Us', sample: 2 },
  { name: 'MANCHURIA', mode: 'ring', grep: 'MANCHURIAN PLAIN', sample: 3 },
  { name: 'TAIHANG', mode: 'ring', grep: 'Taihang', sample: 3 },
  { name: 'DABIE', mode: 'ring', grep: 'Dabie', sample: 2 },
  { name: 'NANLING', mode: 'ring', grep: 'Nan Ling', sample: 3 },
  { name: 'ALTUN', mode: 'ring', grep: 'ALTUN', sample: 3 },
  { name: 'KUNLUN_CREST', mode: 'ridge', grep: 'KUNLUN', lonA: 78, lonB: 99, step: 1.5 },
  { name: 'TIAN_SHAN_CREST', mode: 'ridge', grep: 'TIAN SHAN', lonA: 74, lonB: 92, step: 1.5 },
  { name: 'DABIE_CREST', mode: 'ridge', grep: 'Dabie', lonA: 113.2, lonB: 117, step: 0.4 },
  { name: 'HUANG_MID', mode: 'route', grep: 'Huang', a: [111.2, 40.3], b: [110.3, 34.6], step: 0.22 },
];

let ts = `import type { Pt } from './geo';

/**
 * 本文件由 tools/gen-regions.mjs 从 Natural Earth 10m 参照数据生成，请勿手改。
 * 重新生成：npm run basemap && npm run regions
 *
 * 这些是真实地理实体的轮廓或中线，用来给政权外环提供可依据的骨架 ——
 * 比凭空插值可信得多。\n */\n\n`;

for (const spec of SPECS) {
  const { pts, src, raw } =
    spec.mode === 'ring'
      ? ringOf(spec.grep, spec.sample)
      : spec.mode === 'ridge'
        ? ridgeOf(spec.grep, spec.lonA, spec.lonB, spec.step)
        : routeOf(spec.grep, spec.a, spec.b, spec.step);
  const how = spec.mode === 'ring' ? '外环' : spec.mode === 'ridge' ? '南北缘中线' : '河道';
  ts += `/** ${src} ${how}：${raw} → ${pts.length} 点 */\nexport const ${spec.name}: Pt[] = [\n${fmt(pts)}\n];\n\n`;
  console.log(`${spec.name.padEnd(18)} ${String(pts.length).padStart(3)} 点  (${src} · ${how})`);
}

writeFileSync(resolve(HERE, '../src/data/regions.ts'), ts);
console.log(`\n写入 src/data/regions.ts  ${(ts.length / 1024).toFixed(1)} KB`);
