import { EVENTS, POLITIES, SEGMENTS } from './atlas';
import type { ActiveState, AtlasEvent, Polity, Segment, StateInterval, Year } from './types';

/** P0 视野：三国魏晋 → 隋唐（留出前后余量） */
export const RANGE: { from: Year; to: Year } = { from: 200, to: 960 };

export const polityById = new Map<string, Polity>(POLITIES.map((p) => [p.id, p]));
export const segmentById = new Map<string, Segment>(SEGMENTS.map((s) => [s.id, s]));
export const eventById = new Map<string, AtlasEvent>(EVENTS.map((e) => [e.id, e]));

export const clampYear = (y: number): Year =>
  Math.max(RANGE.from, Math.min(RANGE.to - 1, Math.round(y)));

// ─────────────────────────────────────────────────────────────────────────────
// 状态区间：把史料切成「区间内疆域完全不变」的最大片段。
// 这是 DESIGN.md §1 的核心决定 —— 游标连续，状态离散。
// 得到区间表之后，时间轴本身就能画出「哪几十年什么都没变、哪几年变了很多」。
// ─────────────────────────────────────────────────────────────────────────────

function buildIntervals(): StateInterval[] {
  const marks = new Set<number>([RANGE.from, RANGE.to]);
  for (const s of SEGMENTS) {
    if (s.from > RANGE.from && s.from < RANGE.to) marks.add(s.from);
    if (s.to > RANGE.from && s.to < RANGE.to) marks.add(s.to);
  }
  const bounds = [...marks].sort((a, b) => a - b);
  const out: StateInterval[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const from = bounds[i];
    const to = bounds[i + 1];
    const segmentIds = SEGMENTS.filter((s) => s.from <= from && s.to > from).map((s) => s.id);
    out.push({ from, to, segmentIds });
  }
  return out;
}

export const INTERVALS: StateInterval[] = buildIntervals();

/** 区间变更描述，用于游标跨过边界时顶部浮出的那一句话 */
export interface Transition {
  year: Year;
  label: string;
  addedPolityIds: string[];
  removedPolityIds: string[];
  events: AtlasEvent[];
}

function polityIdsOf(segmentIds: string[]): string[] {
  const ids = new Set<string>();
  for (const id of segmentIds) {
    const s = segmentById.get(id);
    if (s) ids.add(s.polityId);
  }
  return [...ids];
}

export const TRANSITIONS: Transition[] = INTERVALS.map((iv, i) => {
  const prev = i === 0 ? null : INTERVALS[i - 1];
  const before = new Set(prev ? polityIdsOf(prev.segmentIds) : []);
  const after = new Set(polityIdsOf(iv.segmentIds));
  const addedPolityIds = [...after].filter((id) => !before.has(id));
  const removedPolityIds = [...before].filter((id) => !after.has(id));
  const events = eventsAtYear(iv.from);
  const nameOf = (id: string) => polityById.get(id)?.name ?? id;

  let label: string;
  if (i === 0) {
    label = `${yearLabel(iv.from)} · 视野起点`;
  } else if (events.length > 0) {
    label = `${yearLabel(iv.from)} · ${events.map((e) => e.title).join('、')}`;
  } else if (addedPolityIds.length && removedPolityIds.length) {
    label = `${yearLabel(iv.from)} · ${removedPolityIds.map(nameOf).join('、')}亡，${addedPolityIds
      .map(nameOf)
      .join('、')}立`;
  } else if (addedPolityIds.length) {
    label = `${yearLabel(iv.from)} · ${addedPolityIds.map(nameOf).join('、')}立`;
  } else if (removedPolityIds.length) {
    label = `${yearLabel(iv.from)} · ${removedPolityIds.map(nameOf).join('、')}亡`;
  } else {
    label = `${yearLabel(iv.from)} · 疆域调整`;
  }
  return { year: iv.from, label, addedPolityIds, removedPolityIds, events };
});

/** 年份显示：负数加「前」 */
export function yearLabel(y: Year): string {
  return y < 0 ? `前${-y}年` : `${y}年`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 查询：二分查找定位区间，O(log n)。滑动时零延迟。
// ─────────────────────────────────────────────────────────────────────────────

export function intervalIndexAt(year: Year): number {
  let lo = 0;
  let hi = INTERVALS.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (INTERVALS[mid].from <= year) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function activeSegmentsAt(year: Year): Segment[] {
  const iv = INTERVALS[intervalIndexAt(year)];
  return iv.segmentIds.map((id) => segmentById.get(id)!).filter(Boolean);
}

export function eventsAtYear(year: Year): AtlasEvent[] {
  return EVENTS.filter((e) => e.y === year);
}

/** 有纪事的年份，升序 */
export const EVENT_YEARS: Year[] = [...new Set(EVENTS.map((e) => e.y))].sort((a, b) => a - b);

export function prevEventYear(year: Year): Year | null {
  for (let i = EVENT_YEARS.length - 1; i >= 0; i--) if (EVENT_YEARS[i] < year) return EVENT_YEARS[i];
  return null;
}

export function nextEventYear(year: Year): Year | null {
  for (const y of EVENT_YEARS) if (y > year) return y;
  return null;
}

/** 地图上只画当前年份的事件 —— 时间轴走到哪，就只看那一刻发生了什么 */
export function stateAt(year: Year): ActiveState {
  return { year, segments: activeSegmentsAt(year), events: eventsAtYear(year) };
}

/** 某个政权的全部疆域段，按起始年排序 */
export function segmentsOfPolity(polityId: string): Segment[] {
  return SEGMENTS.filter((s) => s.polityId === polityId).sort((a, b) => a.from - b.from);
}

// ─────────────────────────────────────────────────────────────────────────────
// 时间轴派生数据
// ─────────────────────────────────────────────────────────────────────────────

/** 事件密度直方图：以 5 年为一桶 */
export const EVENT_BUCKETS: { from: Year; count: number }[] = (() => {
  const step = 5;
  const start = Math.floor(RANGE.from / step) * step;
  const out: { from: Year; count: number }[] = [];
  for (let y = start; y < RANGE.to; y += step) out.push({ from: y, count: 0 });
  for (const e of EVENTS) {
    if (e.y < RANGE.from || e.y >= RANGE.to) continue;
    const idx = Math.floor((e.y - start) / step);
    if (out[idx]) out[idx].count++;
  }
  return out;
})();

/** 有多少个年份真的发生了疆域变化 —— 用来衡量「史料密度」 */
export const CHANGE_YEARS: Year[] = TRANSITIONS.filter((t) => t.addedPolityIds.length || t.removedPolityIds.length).map((t) => t.year);
