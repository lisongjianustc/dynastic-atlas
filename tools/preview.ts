/**
 * 把数据层直接渲染成 SVG 接触表 —— 不经浏览器，用来独立验证几何形状。
 *   npx esbuild tools/preview.ts --bundle --platform=node --format=esm --outfile=/tmp/atlas-preview.mjs
 *   node /tmp/atlas-preview.mjs && qlmanage -t -s 1800 -o /tmp/ql /tmp/atlas-preview.svg
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { POLITIES, SEGMENTS } from '../src/data/atlas';
import { activeSegmentsAt, yearLabel } from '../src/data/state';
import { EVENTS } from '../src/data/atlas';

const VIEW = { minLon: 68, maxLon: 143, minLat: 14, maxLat: 56 };
const PANEL_W = 880;
const PANEL_H = 620;
const YEARS = [230, 383, 540, 750];
const COLS = 2;

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2));
const Y0 = mercY(VIEW.minLat);
const Y1 = mercY(VIEW.maxLat);
const project = (lon: number, lat: number, ox: number, oy: number): [number, number] => {
  const x = ox + ((lon - VIEW.minLon) / (VIEW.maxLon - VIEW.minLon)) * PANEL_W;
  const y = oy + ((Y1 - mercY(lat)) / (Y1 - Y0)) * PANEL_H;
  return [x, y];
};

const land = JSON.parse(readFileSync('public/basemap/land.geojson', 'utf8'));

function pathOf(ring: number[][], ox: number, oy: number) {
  return (
    ring
      .map(([lon, lat], i) => {
        const [x, y] = project(lon, lat, ox, oy);
        return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join('') + 'Z'
  );
}

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PANEL_W * COLS}" height="${PANEL_H * YEARS.length / COLS}" viewBox="0 0 ${PANEL_W * COLS} ${(PANEL_H * YEARS.length) / COLS}">`;
svg += `<style>text{font-family:-apple-system,"PingFang SC",sans-serif}</style>`;

for (let i = 0; i < YEARS.length; i++) {
  const year = YEARS[i];
  const ox = (i % COLS) * PANEL_W;
  const oy = Math.floor(i / COLS) * PANEL_H;

  svg += `<rect x="${ox}" y="${oy}" width="${PANEL_W}" height="${PANEL_H}" fill="#0f1319"/>`;
  svg += `<g clip-path="url(#c${i})"><clipPath id="c${i}"><rect x="${ox}" y="${oy}" width="${PANEL_W}" height="${PANEL_H}"/></clipPath>`;

  for (const f of land.features) {
    const rings = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of rings) {
      svg += `<path d="${pathOf(poly[0], ox, oy)}" fill="#232a35" stroke="#39414f" stroke-width="0.5"/>`;
    }
  }

  for (const seg of activeSegmentsAt(year)) {
    const p = POLITIES.find((x) => x.id === seg.polityId)!;
    const fillOpacity = seg.control === 'core' ? 0.72 : seg.control === 'military' ? 0.5 : seg.control === 'indirect' ? 0.32 : 0.06;
    const dash = seg.control === 'tributary' ? 'stroke-dasharray="7 4"' : seg.control === 'indirect' ? 'stroke-dasharray="1.5 3"' : '';
    if (fillOpacity > 0.1) {
      svg += `<path d="${pathOf(seg.geometry, ox, oy)}" fill="${p.color}" fill-opacity="${fillOpacity}"/>`;
    }
    svg += `<path d="${pathOf(seg.geometry, ox, oy)}" fill="none" stroke="${p.color}" stroke-width="1.6" ${dash}/>`;
  }

  for (const e of EVENTS) {
    if (Math.abs(e.y - year) > 15) continue;
    const [x, y] = project(e.at[0], e.at[1], ox, oy);
    svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${2 + e.importance}" fill="#e05c4b" opacity="0.9"/>`;
  }

  svg += `</g>`;
  svg += `<rect x="${ox}" y="${oy}" width="${PANEL_W}" height="${PANEL_H}" fill="none" stroke="#2a323d"/>`;
  svg += `<text x="${ox + 14}" y="${oy + 30}" fill="#d9a441" font-size="22">${yearLabel(year)}</text>`;
  const names = [...new Set(activeSegmentsAt(year).map((s) => POLITIES.find((p) => p.id === s.polityId)!.name))];
  svg += `<text x="${ox + 14}" y="${oy + 50}" fill="#8b95a3" font-size="12">${names.join(' · ')}</text>`;
}
svg += `</svg>`;

writeFileSync('/tmp/atlas-preview.svg', svg);
console.log(`wrote /tmp/atlas-preview.svg  ${(svg.length / 1024).toFixed(0)} KB  years=${YEARS.join(',')}`);
console.log(`segments drawn: ${SEGMENTS.length} total`);
