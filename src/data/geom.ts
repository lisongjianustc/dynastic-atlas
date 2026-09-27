import type { Pt } from './geo';

/** 面积加权多边形质心（比顶点均值稳，凹多边形不会飘出去） */
export function polygonCentroid(ring: Pt[]): Pt {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-9) return ring[0];
  return [cx / (6 * area), cy / (6 * area)];
}

export function bboxOf(ring: Pt[]): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

export function ringToGeoJSON(ring: Pt[]) {
  return { type: 'Polygon' as const, coordinates: [ring] };
}
