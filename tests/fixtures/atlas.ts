import { normalizePlace, normalizeSegment, yearValidity } from '../../src/data/governance';
import type { AtlasBundle } from '../../src/data/validate';
import type { AtlasEvent, Evidence, Place, Polity, Segment, Source } from '../../src/data/types';

/**
 * 测试夹具。
 *
 * 校验器测试的关键是**注入故意损坏的数据**：一个从不报错的校验器等于没有校验器。
 * 所以这里的工厂产出的是「最小合法集」，各用例只破坏其中一个不变式。
 */

export const source = (o: Partial<Source> = {}): Source => ({
  id: 's-test',
  work: '测试来源',
  redistribution: 'allowed',
  license: '公有领域',
  ...o,
});

export const polity = (o: Partial<Polity> = {}): Polity => ({
  id: 'p-test',
  name: '测试政权',
  kind: 'dynasty',
  from: 200,
  to: 300,
  validity: yearValidity(200, 300),
  color: '#4E79A7',
  ...o,
});

/** 一个方框外环，圆心默认 (110, 35)，半径 5° */
export const square = (cx = 110, cy = 35, r = 5): [number, number][] => [
  [cx - r, cy - r],
  [cx + r, cy - r],
  [cx + r, cy + r],
  [cx - r, cy + r],
  [cx - r, cy - r],
];

/** 自交的「蝴蝶结」外环 —— 用来验证自交闸门真的会拦 */
export const bowtie = (cx = 110, cy = 35, r = 5): [number, number][] => [
  [cx - r, cy - r],
  [cx + r, cy + r],
  [cx + r, cy - r],
  [cx - r, cy + r],
  [cx - r, cy - r],
];

export const segment = (o: Partial<Segment> = {}): Segment => {
  const merged: Segment = {
    ...normalizeSegment({
      id: 'seg-test',
      polityId: 'p-test',
      from: 200,
      to: 300,
      control: 'core',
      borderPrecision: 1,
      confidence: 'medium',
      sourceId: 's-test',
      geometry: square(),
    }),
    ...o,
  };
  // from/to 是 validity 的派生值：只改 from/to 而不给 validity 时重新展开，
  // 让夹具保持自洽。想测「不一致」的用例显式传 validity。
  if ((o.from !== undefined || o.to !== undefined) && o.validity === undefined) {
    merged.validity = yearValidity(merged.from, merged.to);
  }
  return merged;
};

export const event = (o: Partial<AtlasEvent> = {}): AtlasEvent => ({
  id: 'ev-test',
  title: '测试事件',
  y: 250,
  at: [110, 35],
  place: '测试地点',
  polityIds: ['p-test'],
  persons: [],
  importance: 3,
  type: '战争',
  summary: '测试用摘要。',
  evidence: [{ sourceId: 's-test' }] as Evidence[],
  review: { status: 'pending', reviewerKind: 'agent', reviewer: 'test', checkedAt: '2026-10-01' },
  sourceId: 's-test',
  ...o,
});

export const place = (o: Partial<Place> = {}): Place => ({
  ...normalizePlace({
    id: 'pl-test',
    name: '测试地点',
    kind: 'seat',
    at: [110, 35],
    from: 200,
    to: 300,
    rank: 1,
    sourceId: 's-test',
  }),
  ...o,
});

/** 最小合法集：四个校验维度各一条 */
export const bundle = (o: Partial<AtlasBundle> = {}): AtlasBundle => ({
  segments: [segment()],
  events: [event()],
  places: [place()],
  polities: [polity()],
  sources: [source()],
  ...o,
});
