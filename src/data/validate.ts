import { EVENTS, POLITIES, SEGMENTS } from './atlas';
import { PLACES } from './places';
import { SOURCES } from './sources';
import type { Evidence, Review } from './types';

export interface ValidationIssue {
  level: 'error' | 'warn';
  where: string;
  what: string;
  fix?: string;
}

/**
 * 数据纪律的机械闸门。
 *
 * 第一原则（见 docs/EDITORIAL.md）：**没有出处，进不了库。**
 * 第二原则：**软件测试不等于史料复核** —— 校验通过不自动赋予 verified。
 */

/**
 * 自交检测。退化环（例如把边界链接反了，环里出现一条横穿中国的重复边）
 * 在渲染上表现为莫名的针状毛刺，但在点落测试里往往仍然「通过」。
 * 这个 bug 真的出现过，所以把它变成机械闸门。
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
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
    if (d1 === 0 && d2 === 0 && d3 === 0 && d4 === 0) {
      return onSeg(p1, p2, p3) || onSeg(p1, p2, p4) || onSeg(p3, p4, p1) || onSeg(p3, p4, p2);
    }
    return false;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (segsIntersect(ring[i], ring[i + 1], ring[j], ring[j + 1])) return true;
    }
  }
  return false;
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

export function validateAtlas(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sourceIds = new Set(SOURCES.map((s) => s.id));
  const polityIds = new Set(POLITIES.map((p) => p.id));

  const push = (level: ValidationIssue['level'], where: string, what: string, fix?: string) =>
    issues.push({ level, where, what, fix });

  // ── 来源登记表本身 ──
  const seenSource = new Set<string>();
  for (const s of SOURCES) {
    if (seenSource.has(s.id)) push('error', `source ${s.id}`, '来源 id 重复');
    seenSource.add(s.id);
    if (!s.work) push('error', `source ${s.id}`, '缺少 work');
    if (!s.license) push('error', `source ${s.id}`, '缺少许可说明');
    // 受限来源必须写明凭什么可以引用 —— 这是将来别人复用仓库时唯一站得住的依据
    if (s.redistribution === 'denied' && !s.permissionEvidence) {
      push(
        'error',
        `source ${s.id}`,
        'redistribution=denied 但未写 permissionEvidence',
        '说明凭什么可以引用它、以及为何仓库内不含其数据',
      );
    }
  }
  const deniedSources = new Set(SOURCES.filter((s) => s.redistribution === 'denied').map((s) => s.id));

  // ── 证据与审查（贯通三类记录） ──
  const checkEvidence = (where: string, evidence: Evidence[] | undefined) => {
    if (!evidence || evidence.length === 0) {
      push('error', where, '没有任何出处 —— 无出处不入库', '补 evidence: [{ sourceId, locator, note }]');
      return;
    }
    for (const e of evidence) {
      if (!sourceIds.has(e.sourceId)) push('error', where, `evidence 指向未登记的来源：${e.sourceId}`);
    }
  };
  const checkReview = (where: string, review: Review) => {
    if (review.status !== 'pending' && !review.reviewer) {
      push('error', where, `review.status=${review.status} 但没写 reviewer`, '软件测试不等于史料复核，必须留下实际核验者');
    }
    if (review.status === 'verified' && review.reviewerKind === 'agent') {
      push('warn', where, 'agent 给出的 verified 不等于专家审定，UI 必须如实呈现');
    }
  };

  // ── 疆域段 ──
  for (const s of SEGMENTS) {
    const where = `segment ${s.id}`;
    checkEvidence(where, s.evidence);
    checkReview(where, s.review);

    if (!polityIds.has(s.polityId)) push('error', where, `polityId 不存在：${s.polityId}`);
    if (!(s.from < s.to)) push('error', where, `时间区间非法：[${s.from}, ${s.to})`);
    if (s.geometry.length < 4) push('error', where, `外环点数不足：${s.geometry.length}`);

    const first = s.geometry[0];
    const last = s.geometry[s.geometry.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) push('error', where, '外环未闭合');

    for (const [lon, lat] of s.geometry) {
      if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
        push('error', where, `坐标越界：[${lon}, ${lat}]`);
        break;
      }
    }
    if (selfIntersects(s.geometry)) {
      push('error', where, '外环自交 —— 通常是边界链接反了，会渲染出针状毛刺', '检查 ring() 里各链的拼接方向');
    }

    // validity 是权威值，整数 from/to 必须与它一致
    const v = s.validity;
    if (v.start.earliest > v.start.latest) push('error', where, 'validity.start 区间倒置');
    if (v.endExclusive.earliest > v.endExclusive.latest) push('error', where, 'validity.endExclusive 区间倒置');
    if (v.start.latest >= v.endExclusive.earliest) {
      push('error', where, 'validity 连「确定成立」的区间都为空');
    }
    if (s.from !== v.start.earliest || s.to !== v.endExclusive.latest) {
      push(
        'error',
        where,
        `整数区间与 validity 不一致：from/to=${s.from}/${s.to}，validity 展开应为 ${v.start.earliest}/${v.endExclusive.latest}`,
      );
    }
    if (s.temporalSupport === 'snapshot' && s.snapshotYear == null) {
      push('error', where, 'temporalSupport=snapshot 但没有 snapshotYear');
    }
    if (s.temporalSupport === 'interval' && s.snapshotYear != null) {
      push('error', where, 'temporalSupport=interval 却带了 snapshotYear');
    }
    if (!s.compilation?.method) {
      push('error', where, '没有记录编制方法', '写清是人工绘制还是取自哪套参照几何');
    }
    if (s.spatialPrecision === 'approximate' && s.confidence === 'high') {
      push('warn', where, '示意边界不应急于标 high 可信度');
    }
    if (s.spatialPrecision === 'specified' && s.compilation.method.includes('人工绘制示意')) {
      push('warn', where, '标为 specified，但编制方法写的是人工绘制示意');
    }
  }

  // 同一政权 **同一控制层级** 的时间段不得重叠 —— 但仅在空间上也重叠时才成立。
  // 唐的安西都护府（西域）与安东都护府（朝鲜半岛）同为 military，时间重叠却相隔万里。
  const byPolityControl = new Map<string, typeof SEGMENTS>();
  for (const s of SEGMENTS) {
    const key = `${s.polityId}|${s.control}`;
    const list = byPolityControl.get(key) ?? [];
    list.push(s);
    byPolityControl.set(key, list);
  }
  for (const [key, list] of byPolityControl) {
    const sorted = [...list].sort((a, b) => a.from - b.from);
    for (let i = 1; i < sorted.length; i++) {
      for (let j = 0; j < i; j++) {
        const prev = sorted[j];
        const cur = sorted[i];
        if (cur.from >= prev.to) continue;
        if (!bboxOverlap(bbox(prev.geometry), bbox(cur.geometry))) continue;
        push('error', key, `同层级疆域段时间与空间双双重叠：${prev.id} 与 ${cur.id}`);
      }
    }
  }

  // 同时并立的政权撞色
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
        if (a.from < b.to && b.from < a.to) push('warn', 'palette', `${a.name} 与 ${b.name} 并存却同色 ${color}`);
      }
    }
  }

  // ── 地点 ──
  for (const pl of PLACES) {
    const where = `place ${pl.id}`;
    checkEvidence(where, pl.evidence);
    if (!sourceIds.has(pl.sourceId)) push('error', where, `sourceId 未登记：${pl.sourceId}`);
    if (!(pl.from < pl.to)) push('error', where, `年代区间非法：[${pl.from}, ${pl.to})`);
    const [lon, lat] = pl.at;
    if (lon < 70 || lon > 145 || lat < 15 || lat > 55) {
      push('error', where, `坐标偏离视野：[${lon}, ${lat}]`);
    }
  }
  const dupNames = new Map<string, number>();
  for (const pl of PLACES) dupNames.set(pl.name, (dupNames.get(pl.name) ?? 0) + 1);
  for (const [n, c] of dupNames) if (c > 1) push('warn', 'places', `地点重名：${n} ×${c}`);

  // ── 事件 ──
  for (const e of EVENTS) {
    const where = `event ${e.id}`;
    checkEvidence(where, e.evidence);
    checkReview(where, e.review);
    if (!sourceIds.has(e.sourceId)) push('error', where, `sourceId 未登记：${e.sourceId}`);
    for (const pid of e.polityIds) {
      if (!polityIds.has(pid)) push('error', where, `polityId 不存在：${pid}`);
    }
    if (e.y < -3000 || e.y > 2100) push('error', where, `年份可疑：${e.y}`);
  }

  // ── 政权 ──
  for (const p of POLITIES) {
    if (!(p.from < p.to)) push('error', `polity ${p.id}`, `存续区间非法：[${p.from}, ${p.to})`);
    if (p.validity && (p.from !== p.validity.start.earliest || p.to !== p.validity.endExclusive.latest)) {
      push('error', `polity ${p.id}`, '整数区间与 validity 不一致');
    }
  }

  // ── 授权红线 ──
  // 引用受限来源的结论可以，复制其数据不行。仓库里必须没有任何一条记录
  // 是「把 CHGIS / 图集的矢量搬过来」的产物。
  const deniedUsed = SEGMENTS.filter((s) => s.evidence.some((e) => deniedSources.has(e.sourceId)));
  if (deniedUsed.length) {
    push(
      'warn',
      'licensing',
      `${deniedUsed.length} 条疆域段引用的是限制再分发的来源（谭其骧图集 / CHGIS）。引用其结论可以，复制其数据不行。`,
      '确认这些段的 compilation.method 写明是人工重绘，且仓库内不存在原图或其矢量化产物。',
    );
  }

  return issues;
}
