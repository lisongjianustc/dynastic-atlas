/**
 * 底图与参照数据。
 *
 * 输出两份，用途不同：
 *   public/basemap/*.geojson   110m 自然地理，随站点分发（要小）
 *   tools/.ref/*.geojson       10m 海岸线与河道，**只在构建期用**（不进 bundle）
 *
 * 仍然只要自然地理要素，绝不含任何现代国界线。
 *
 *   node tools/build-basemap.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../public/basemap');
const REF = resolve(HERE, '.ref');
const RAW = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';

const VIEW = { minLon: 40, minLat: 0, maxLon: 160, maxLat: 65 };

const round = (n, p = 100) => Math.round(n * p) / p;

async function fetchGeoJSON(name) {
  const res = await fetch(`${RAW}/${name}.geojson`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}

function simplifyLine(coords, tol, bbox) {
  const inside = coords.filter(
    ([lon, lat]) =>
      lon >= bbox.minLon - 5 && lon <= bbox.maxLon + 5 && lat >= bbox.minLat - 5 && lat <= bbox.maxLat + 5,
  );
  if (inside.length < 2) return null;
  const out = [inside[0]];
  for (const pt of inside.slice(1)) {
    const last = out[out.length - 1];
    if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) >= tol) out.push(pt);
  }
  if (out.length < 2) return null;
  return out.map(([lon, lat]) => [round(lon, 1000), round(lat, 1000)]);
}

function simplifyRing(ring, tol) {
  const out = [ring[0]];
  for (const pt of ring.slice(1)) {
    const last = out[out.length - 1];
    if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) >= tol) out.push(pt);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) out.push(first);
  return out.length >= 4 ? out.map(([lon, lat]) => [round(lon, 100), round(lat, 100)]) : null;
}

function mapPolygonFeatures(fc, tol) {
  const features = [];
  for (const f of fc.features) {
    const geom = f.geometry;
    if (!geom) continue;
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
    for (const poly of polys) {
      const rings = poly.map((r) => simplifyRing(r, tol)).filter(Boolean);
      if (!rings.length || rings[0].length < 4) continue;
      features.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: rings } });
    }
  }
  return { type: 'FeatureCollection', features };
}

function mapLineFeatures(fc, tol, bbox, keep) {
  const features = [];
  for (const f of fc.features) {
    if (keep && !keep(f.properties ?? {})) continue;
    const geom = f.geometry;
    if (!geom) continue;
    const lines = geom.type === 'LineString' ? [geom.coordinates] : geom.type === 'MultiLineString' ? geom.coordinates : [];
    for (const line of lines) {
      const simplified = simplifyLine(line, tol, bbox);
      if (!simplified) continue;
      features.push({
        type: 'Feature',
        properties: { name: f.properties?.name ?? null },
        geometry: { type: 'LineString', coordinates: simplified },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

async function write(path, fc, label) {
  const json = JSON.stringify(fc);
  await writeFile(path, json);
  console.log(`${label.padEnd(22)} ${String(fc.features.length).padStart(4)} features  ${(json.length / 1024).toFixed(0)} KB`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(REF, { recursive: true });

  console.log('— 客户端底图（110m）—');
  await write(resolve(OUT, 'land.geojson'), mapPolygonFeatures(await fetchGeoJSON('ne_110m_land'), 0.18), 'land');
  await write(resolve(OUT, 'lakes.geojson'), mapPolygonFeatures(await fetchGeoJSON('ne_110m_lakes'), 0.12), 'lakes');
  await write(
    resolve(OUT, 'rivers.geojson'),
    mapLineFeatures(await fetchGeoJSON('ne_110m_rivers_lake_centerlines'), 0.22, VIEW),
    'rivers',
  );

  console.log('— 构建期参照（10m，不进 bundle）—');
  await write(
    resolve(REF, 'coastline.geojson'),
    mapLineFeatures(await fetchGeoJSON('ne_10m_coastline'), 0.02, VIEW),
    'coastline',
  );
  await write(
    resolve(REF, 'rivers.geojson'),
    mapLineFeatures(await fetchGeoJSON('ne_10m_rivers_lake_centerlines'), 0.03, VIEW, (p) => (p.scalerank ?? 9) <= 6),
    'rivers',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
