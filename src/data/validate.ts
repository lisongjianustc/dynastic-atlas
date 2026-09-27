import { EVENTS, POLITIES, SEGMENTS, SOURCES } from './atlas';
import { PLACES } from './places';

export interface ValidationIssue {
  level: 'error' | 'warn';
  where: string;
  what: string;
  fix?: string;
}

/**
 * 自交检测。退化环（例如把边界链接反了，环里出现一条横穿中国的重复边）
 * 在渲染上表现为莫名的针状毛刺，但在点落测试里往往仍然「通过」。
 * 这个 bug 真的发生过一次，所以把它变成机械闸门。
 */
function selfIntersects(ring: [number, number][]): boolean {
  const n = ring.length - 1;
  if (n < 4) return false;
  const cross = (a: number[], b: number[], c: number[]) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const onSeg = (a: number[], b: number[], c: number[]) =>
    Math.min(a[0], b[0]) <= c[0] &&
    c[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= c[1] &&
    c[1] <= Math.max(a[1], b[1]);

  const segsIntersect = (p1: number[], p2: number[], p3: number[], p4: number[]) => {
    const d1 = cross(p3, p4, p1);
    const d2 = cross(p3, p4, p2);
    const d3 = cross(p1, p2, p3);
    const d4 = cross(p1, p2, p4);
    // 真穿越
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
    // 共线且有重叠长度 —— 重复边（边界链接反了的典型症状）属于这一种，必须抓
    if (d1 === 0 && d2 === 0 && d3 === 0 && d4 === 0) {
      return onSeg(p1, p2, p3) || onSeg(p1, p2, p4) || onSeg(p3, p4, p1) || onSeg(p3, p4, p2);
    }
    return false;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // 跳过相邻边（共享端点）
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (segsIntersect(ring[i], ring[i + 1], ring[j], ring[j + 1])) return true;
    }
  }
  return false;
}

/**
 * 数据纪律的机械闸门（DESIGN.md §9 第 1 条）。
 * 关键一条：没有 sourceId 或 sourceId 指不到来源的疆域段，直接判 error。
 * 这不是提示，是入不了库的意思。
 */
export function validateAtlas(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sourceIds = new Set(SOURCES.map((s) => s.id));
  const polityIds = new Set(POLITIES.map((p) => p.id));

  for (const s of SEGMENTS) {
    if (!s.sourceId || !sourceIds.has(s.sourceId)) {
      issues.push({ level: 'error', where: `segment ${s.id}`, what: `sourceId 缺失或未登记：${s.sourceId ?? '(空)'}`, fix: '在 data/atlas.ts 的 SOURCES 中登记出处' });
    }
    if (!polityIds.has(s.polityId)) {
      issues.push({ level: 'error', where: `segment ${s.id}`, what: `polityId 不存在：${s.polityId}` });
    }
    if (!(s.from < s.to)) {
      issues.push({ level: 'error', where: `segment ${s.id}`, what: `时间区间非法：[${s.from}, ${s.to})` });
    }
    if (s.geometry.length < 4) {
      issues.push({ level: 'error', where: `segment ${s.id}`, what: `外环点数不足：${s.geometry.length}` });
    }
    const first = s.geometry[0];
    const last = s.geometry[s.geometry.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      issues.push({ level: 'error', where: `segment ${s.id}`, what: '外环未闭合' });
    }
    for (const [lon, lat] of s.geometry) {
      if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
        issues.push({ level: 'error', where: `segment ${s.id}`, what: `坐标越界：[${lon}, ${lat}]` });
        break;
      }
    }
    if (selfIntersects(s.geometry)) {
      issues.push({
        level: 'error',
        where: `segment ${s.id}`,
        what: '外环自交 —— 通常是边界链接反了，会渲染出针状毛刺',
        fix: '检查 ring() 里各链的拼接方向',
      });
    }
    if (s.borderPrecision === 1 && s.confidence === 'high') {
      issues.push({ level: 'warn', where: `segment ${s.id}`, what: '粗略边界不应急于标 high 可信度' });
    }
  }

  // 同一政权 **同一控制层级** 的时间段不得重叠 —— 但仅在空间上也重叠时才成立。
  // 唐的安西都护府（西域）与安东都护府（朝鲜半岛）同为 military，时间重叠却相隔万里。
  // 用包围盒近似判空间重叠：会漏掉少量细长交叠，作为机械闸门够用。
  const byPolityControl = new Map<string, typeof SEGMENTS>();
  for (const s of SEGMENTS) {
    const key = `${s.polityId}|${s.control}`;
    const list = byPolityControl.get(key) ?? [];
    list.push(s);
    byPolityControl.set(key, list);
  }

  const bbox = (g: [number, number][]) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of g) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return [minX, minY, maxX, maxY] as const;
  };
  const bboxOverlap = (a: readonly number[], b: readonly number[]) =>
    a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];

  for (const [key, list] of byPolityControl) {
    const sorted = [...list].sort((a, b) => a.from - b.from);
    for (let i = 1; i < sorted.length; i++) {
      for (let j = 0; j < i; j++) {
        const prev = sorted[j];
        const cur = sorted[i];
        if (cur.from >= prev.to) continue;
        if (!bboxOverlap(bbox(prev.geometry), bbox(cur.geometry))) continue;
        issues.push({
          level: 'error',
          where: key,
          what: `同层级疆域段时间与空间双双重叠：${prev.id} 与 ${cur.id}`,
        });
      }
    }
  }

  // 同时并立的政权撞色 —— 只是提示，空间上往往相隔很远
  const colors = new Map<string, string[]>();
  for (const p of POLITIES) {
    const list = colors.get(p.color) ?? [];
    list.push(p.id);
    colors.set(p.color, list);
  }
  for (const [color, ids] of colors) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = POLITIES.find((p) => p.id === ids[i])!;
        const b = POLITIES.find((p) => p.id === ids[j])!;
        if (a.from < b.to && b.from < a.to) {
          issues.push({ level: 'warn', where: 'palette', what: `${a.name} 与 ${b.name} 并存却同色 ${color}` });
        }
      }
    }
  }

  for (const pl of PLACES) {
    if (!sourceIds.has(pl.sourceId)) {
      issues.push({ level: 'error', where: `place ${pl.id}`, what: `sourceId 未登记：${pl.sourceId}` });
    }
    if (!(pl.from < pl.to)) {
      issues.push({ level: 'error', where: `place ${pl.id}`, what: `年代区间非法：[${pl.from}, ${pl.to})` });
    }
    const [lon, lat] = pl.at;
    if (lon < 70 || lon > 145 || lat < 15 || lat > 55) {
      issues.push({ level: 'error', where: `place ${pl.id}`, what: `坐标偏离视野：[${lon}, ${lat}]` });
    }
  }
  const dupNames = new Map<string, number>();
  for (const pl of PLACES) dupNames.set(pl.name, (dupNames.get(pl.name) ?? 0) + 1);
  for (const [n, c] of dupNames) if (c > 1) issues.push({ level: 'warn', where: 'places', what: `地点重名：${n} ×${c}` });

  for (const e of EVENTS) {
    if (!sourceIds.has(e.sourceId)) {
      issues.push({ level: 'error', where: `event ${e.id}`, what: `sourceId 未登记：${e.sourceId}` });
    }
    for (const pid of e.polityIds) {
      if (!polityIds.has(pid)) {
        issues.push({ level: 'error', where: `event ${e.id}`, what: `polityId 不存在：${pid}` });
      }
    }
    if (e.y < -3000 || e.y > 2100) {
      issues.push({ level: 'error', where: `event ${e.id}`, what: `年份可疑：${e.y}` });
    }
  }

  return issues;
}
