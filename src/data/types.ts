export type Year = number; // 公元前为负，如 -221

/** 控制强度六级 —— 本项目的核心表达。见 DESIGN.md §4 */
export type ControlLevel = 'core' | 'military' | 'indirect' | 'tributary' | 'nominal' | 'raided';

/**
 * 空间精度。取自 HistoryMapV2 的治理模型：
 * 三档比原来的 1/2/3 更能自解释，而且给「有争议」留了独立位置。
 */
export type SpatialPrecision = 'specified' | 'approximate' | 'disputed';

export type Confidence = 'high' | 'medium' | 'low';

export type PolityKind = 'dynasty' | 'kingdom' | 'khanate' | 'empire' | 'tribe' | 'city_state';

export type EventType = '战争' | '和议' | '迁都' | '变法' | '灾害' | '人物' | '科技' | '宗教' | '建制';

// ─────────────────────────────────────────────────────────────────────────────
// 出处与审查 —— 吸收自 HistoryMapV2 的治理模型
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 一条证据，必须指向已登记的来源。
 *
 * `locator` 是卷次／页码／段落这类可被第三方复核的定位。暂时填不出就留空，
 * 由 coverage 明确声明「记录级定位未补」—— 缺口要可见，不能假装填过。
 */
export interface Evidence {
  sourceId: string;
  locator?: string;
  note?: string;
}

/** 时间精度。只知某年就不要编造确日。 */
export type Precision = 'day' | 'month' | 'year' | 'range';

/**
 * 一个不确定边界：真实值落在 [earliest, latest] 之间，整数年。
 *
 * 用整数年而不是 ISO 日期，是因为本项目现有数据的精度就是年 ——
 * 编造到日反而是假的。将来若要支持日精度，再扩这个类型。
 */
export interface Bound {
  earliest: Year;
  latest: Year;
}

/**
 * 存续区间。**这是权威值**，整数 from/to 由它机械展开。
 * 两个端点各带一个不确定范围 —— 「亡于 265 还是 266」本身就是史料分歧。
 */
export interface Validity {
  start: Bound;
  endExclusive: Bound;
  precision: Precision;
  label: string;
}

export type ReviewStatus = 'pending' | 'verified' | 'rejected';

/**
 * 审查记录。**软件测试不等于史料复核** —— 测试通过不自动赋予 verified。
 * 没有真人或 agent 逐条核对过，就得是 pending。
 */
export interface Review {
  status: ReviewStatus;
  reviewerKind: 'human' | 'agent';
  reviewer: string;
  checkedAt: string;
  note?: string;
}

/**
 * 时间支撑方式：
 *   interval —— 该几何在一段区间内成立
 *   snapshot —— 只对应某一年的快照，**不得在切片之间插值**
 */
export type TemporalSupport = 'interval' | 'snapshot';

/** 几何的编制方法。配准控制点、比例尺与误差必须留痕。 */
export interface Compilation {
  method: string;
  sourceScale?: string;
  errorNote?: string;
}

export interface Source {
  id: string;
  work: string;
  creator?: string;
  edition?: string;
  locus?: string;
  url?: string | null;
  accessedAt?: string;
  /** 是否允许再分发。denied 的一律不得随站点发布。 */
  redistribution: 'allowed' | 'unknown' | 'denied';
  license: string;
  permissionEvidence?: string;
}

export interface Polity {
  id: string;
  name: string;
  aliases?: string[];
  kind: PolityKind;
  from: Year;
  to: Year;
  validity?: Validity;
  color: string;
  capital?: { name: string; at: [number, number] };
  note?: string;
  evidence?: Evidence[];
}

export interface Segment {
  id: string;
  polityId: string;
  /** 左闭右开：[from, to)。由 validity 机械展开，供状态机二分查找。 */
  from: Year;
  to: Year;
  validity: Validity;
  temporalSupport: TemporalSupport;
  /** temporalSupport === 'snapshot' 时必填 */
  snapshotYear?: Year;
  control: ControlLevel;
  spatialPrecision: SpatialPrecision;
  confidence: Confidence;
  compilation: Compilation;
  review: Review;
  evidence: Evidence[];
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
  /** 已核验事实的独立复述 */
  summary: string;
  /** 史家的原因判断与争论 —— 与事实分开，不作为事实呈现 */
  interpretation?: string;
  evidence: Evidence[];
  review: Review;
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
  spatialPrecision: SpatialPrecision;
  note?: string;
  evidence: Evidence[];
  sourceId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 覆盖声明 —— 缺口必须显式可见，而不是藏在 README 里
// ─────────────────────────────────────────────────────────────────────────────

export type CoverageStatus = 'verified' | 'pending' | 'missing';

export interface CoverageEntry {
  id: string;
  startYear: Year;
  endYear: Year;
  topic: 'territory' | 'event' | 'place' | 'provenance';
  status: CoverageStatus;
  /** 为什么缺、缺到什么程度 */
  reason: string;
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
