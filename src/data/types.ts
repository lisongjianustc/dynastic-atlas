export type Year = number; // 公元前为负，如 -221

/** 控制强度六级 —— 本项目的核心表达。见 DESIGN.md §4 */
export type ControlLevel = 'core' | 'military' | 'indirect' | 'tributary' | 'nominal' | 'raided';

/** 1 粗略示意 / 2 中等 / 3 有明确条约或政区依据 */
export type BorderPrecision = 1 | 2 | 3;

export type Confidence = 'high' | 'medium' | 'low';

export type PolityKind = 'dynasty' | 'kingdom' | 'khanate' | 'empire' | 'tribe' | 'city_state';

export type EventType = '战争' | '和议' | '迁都' | '变法' | '灾害' | '人物' | '科技' | '宗教' | '建制';

export interface Source {
  id: string;
  work: string;
  edition?: string;
  locus?: string;
  url?: string;
  license: string;
}

export interface Polity {
  id: string;
  name: string;
  aliases?: string[];
  kind: PolityKind;
  from: Year;
  to: Year;
  color: string;
  capital?: { name: string; at: [number, number] };
  note?: string;
}

export interface Segment {
  id: string;
  polityId: string;
  from: Year;
  /** 左闭右开：[from, to) */
  to: Year;
  control: ControlLevel;
  borderPrecision: BorderPrecision;
  confidence: Confidence;
  sourceId: string;
  note?: string;
  /** 外环，lon/lat，首尾自动闭合 */
  geometry: [number, number][];
}

export interface AtlasEvent {
  id: string;
  title: string;
  y: Year;
  m?: number;
  at: [number, number];
  place: string;
  polityIds: string[];
  persons: string[];
  importance: 1 | 2 | 3 | 4 | 5;
  type: EventType;
  summary: string;
  sourceId: string;
}

/** 地点四类：都城/州治、关隘、军镇、边州 */
export type PlaceKind = 'seat' | 'pass' | 'garrison' | 'frontier';

export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  at: [number, number];
  /** 左闭右开 —— 该地在这个年代区间内值得标出 */
  from: Year;
  to: Year;
  /** 1 = 任何缩放都显示；2 = 放大到 4.2 级才显示 */
  rank: 1 | 2;
  note?: string;
  sourceId: string;
}

export interface ActiveState {
  year: Year;
  segments: Segment[];
  events: AtlasEvent[];
}

export interface StateInterval {
  from: Year;
  to: Year;
  segmentIds: string[];
}
