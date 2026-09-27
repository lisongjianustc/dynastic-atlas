/**
 * 沿真实海岸线/河道走一遍，输出可直接粘进 geo.ts 的坐标数组。
 *
 * 手绘的沿海边界必然粗糙；与其猜坐标，不如让参照数据说话。
 * 这里把 Natural Earth 的多段折线拼成图，用 Dijkstra 在两个锚点之间找通路，
 * 再按最小间距抽稀，打印成 TypeScript 字面量。
 *
 *   node tools/route.mjs coastline "120.9,32.6" "124.3,40.3" --name=COAST_N --step=0.25
 *   node tools/route.mjs rivers "104.6,34.3" "120.9,32.6" --grep=Huai --name=HUAIHE --step=0.25
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const file = args[0];
const anchorA = args[1].split(',').map(Number);
const anchorB = args[2].split(',').map(Number);
const opt = (k, d) => {
  const hit = args.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const name = opt('name', 'ROUTE');
const step = Number(opt('step', 0.25));
const grep = opt('grep', null);
const minpts = Number(opt('minpts', 0));

const fc = JSON.parse(readFileSync(resolve(HERE, '.ref', `${file}.geojson`), 'utf8'));

// ── 把多段折线拼成图 ──
const nodes = []; // {x, y}
const adj = []; // [[nodeIdx, w], ...]
const push = (x, y) => (nodes.push({ x, y }), adj.push([]), nodes.length - 1);
// 缝合边要付重罚：Natural Earth 的海岸线在河口/海峡处断开，
// 不罚的话最短路会从这里横穿海面抄近道。
const link = (a, b, penalty = 1) => {
  const w = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y) * penalty;
  adj[a].push([b, w]);
  adj[b].push([a, w]);
};

const ends = []; // 各折线的端点，用于跨段拼接
for (const f of fc.features) {
  if (grep && !(f.properties?.name ?? '').toLowerCase().includes(grep.toLowerCase())) continue;
  const line = f.geometry.coordinates;
  if (line.length < Math.max(2, minpts)) continue;
  const ids = line.map(([x, y]) => push(x, y));
  for (let i = 1; i < ids.length; i++) link(ids[i - 1], ids[i]);
  ends.push(ids[0], ids[ids.length - 1]);
}

// 端点之间就近缝合（Natural Earth 的海岸线在河口、海峡处是断开的）
for (let i = 0; i < ends.length; i++) {
  for (let j = i + 1; j < ends.length; j++) {
    const a = nodes[ends[i]];
    const b = nodes[ends[j]];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 0.35) link(ends[i], ends[j], 200);
  }
}

const nearest = ([x, y]) => {
  let best = -1;
  let bd = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    const d = (nodes[i].x - x) ** 2 + (nodes[i].y - y) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
};

const start = nearest(anchorA);
const goal = nearest(anchorB);
console.log(`// 锚点 ${anchorA} -> 节点 ${start} ${JSON.stringify([nodes[start].x, nodes[start].y])}`);
console.log(`// 锚点 ${anchorB} -> 节点 ${goal} ${JSON.stringify([nodes[goal].x, nodes[goal].y])}`);

// ── Dijkstra ──
const dist = new Float64Array(nodes.length).fill(Infinity);
const prev = new Int32Array(nodes.length).fill(-1);
dist[start] = 0;
const pq = [[0, start]];
while (pq.length) {
  pq.sort((a, b) => a[0] - b[0]);
  const [d, u] = pq.shift();
  if (d > dist[u]) continue;
  if (u === goal) break;
  for (const [v, w] of adj[u]) {
    if (d + w < dist[v]) {
      dist[v] = d + w;
      prev[v] = u;
      pq.push([d + w, v]);
    }
  }
}

if (dist[goal] === Infinity) {
  console.error('两端点之间没有通路 —— 换锚点，或调大端点缝合阈值');
  process.exit(1);
}

const path = [];
for (let v = goal; v !== -1; v = prev[v]) path.push(v);
path.reverse();

// ── 按最小间距抽稀 ──
const out = [path[0]];
for (const idx of path.slice(1)) {
  const last = nodes[out[out.length - 1]];
  const cur = nodes[idx];
  if (Math.hypot(cur.x - last.x, cur.y - last.y) >= step) out.push(idx);
}
if (out[out.length - 1] !== path[path.length - 1]) out.push(path[path.length - 1]);

const pts = out.map((i) => `[${nodes[i].x.toFixed(2)}, ${nodes[i].y.toFixed(2)}]`);
console.log(`// 路径代价 ${dist[goal].toFixed(2)}（含缝合重罚），原始 ${path.length} 点，抽稀后 ${pts.length} 点`);
console.log(`export const ${name}: Pt[] = [`);
for (let i = 0; i < pts.length; i += 5) console.log('  ' + pts.slice(i, i + 5).join(', ') + ',');
console.log('];');
