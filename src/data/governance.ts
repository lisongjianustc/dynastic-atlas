import type {
  AtlasEvent, Compilation, CoverageEntry, Evidence, Place, Polity,
  Review, Segment, SpatialPrecision, Validity, Year,
} from './types';

/**
 * 治理层 —— 证据、时间区间、审查、编制方法、覆盖声明。
 *
 * 这一层的方法论来自 HistoryMapV2：每条主张单独记录出处定位与时间精度；
 * 时间用区间而不是点；审查状态独立于软件测试；缺口显式声明而不是藏进 README。
 * 本项目的贡献是把它落到**有内容**的数据上。
 */

export const yearLabel = (y: Year): string => (y < 0 ? `前${-y}年` : `${y}年`);

/** 精确到年的区间（本项目绝大多数记录属于这一档） */
export const yearValidity = (from: Year, to: Year, label?: string): Validity => ({
  start: { earliest: from, latest: from },
  endExclusive: { earliest: to, latest: to },
  precision: 'year',
  label: label ?? `${yearLabel(from)}—${yearLabel(to)}`,
});

/** 史料有分歧时用：真实起止落在给定范围内，不假装知道确切年份 */
export const rangeValidity = (
  startRange: [Year, Year],
  endRange: [Year, Year],
  label: string,
): Validity => ({
  start: { earliest: startRange[0], latest: startRange[1] },
  endExclusive: { earliest: endRange[0], latest: endRange[1] },
  precision: 'range',
  label,
});

/** 状态机用的整数区间：取**可能范围的并集**，宁可多画一格也不漏掉 */
export const expandValidity = (v: Validity): { from: Year; to: Year } => ({
  from: v.start.earliest,
  to: v.endExclusive.latest,
});

/** 确定成立的区间。UI 用它把不确定的边缘标出来。 */
export const certainValidity = (v: Validity): { from: Year; to: Year } => ({
  from: v.start.latest,
  to: v.endExclusive.earliest,
});

// ─────────────────────────────────────────────────────────────────────────────
// 审查
// ─────────────────────────────────────────────────────────────────────────────

export const CHECKED_AT = '2026-10-01';

/**
 * 默认审查状态就是 pending，且必须这么说清楚。
 * 结构与几何过了机械校验，不等于有人逐条对过史料。
 */
export const REVIEW_PENDING: Review = {
  status: 'pending',
  reviewerKind: 'agent',
  reviewer: 'claude',
  checkedAt: CHECKED_AT,
  note: '结构与几何经机械校验；未逐条对照史料复核，故为 pending。软件测试不等于史料复核。',
};

// ─────────────────────────────────────────────────────────────────────────────
// 编制方法
// ─────────────────────────────────────────────────────────────────────────────

const NE = 'Natural Earth 10m 参照几何';
const HAND = '人工绘制示意';

/**
 * 哪些线段用了真实地理参照。留痕的目的是让下一个人知道
 * 「这一段可以信到哪里」—— 而不是一句笼统的「本图仅供参考」。
 */
const COMPILATION: Record<string, Compilation> = {
  'wei-01': { method: `${NE}：海岸线、长江、淮河、汉水、秦岭山脊；长城线串真实关隘`, sourceScale: '1:10m（参照几何）', errorNote: '内陆政治截取仍为人工判断，非史料原图配准' },
  'jin_w-01': { method: `${NE}：同上（魏地）`, sourceScale: '1:10m', errorNote: '内陆政治截取为人工判断' },
  'jin_w-02': { method: `${NE}：海岸线、长江、汉水、秦岭、交州弧`, sourceScale: '1:10m', errorNote: '交州南界为人工绘制' },
  'wei_n-01': { method: `${NE}：阴山山脉中线；代北政治边界人工`, sourceScale: '1:10m', errorNote: '并州南界为政治判断' },
  'wei_n-02': { method: `${NE}：海岸线、阴山、淮河、河西祁连`, sourceScale: '1:10m', errorNote: '陇右段人工' },
  'wei_e-01': { method: `${NE}：黄河中段河道（与西魏共用同一条线）+ 海岸线 + 淮河`, sourceScale: '1:10m', errorNote: '燕山段人工' },
  'wei_w-01': { method: `${NE}：黄河中段河道 + 秦岭山脊`, sourceScale: '1:10m', errorNote: '陕北、陇右段人工' },
  'cheng_han-01': { method: `${NE}：四川盆地外环`, sourceScale: '1:10m', errorNote: '成汉实际控制与盆地范围并不完全重合' },
  'tubo-01': { method: `${NE}：青藏高原外环 + 昆仑山脉中线`, sourceScale: '1:10m', errorNote: '北界按昆仑而非实际军事分界' },
  'tubo-02': { method: `${NE}：青藏高原外环 + 河西陇右政治边界`, sourceScale: '1:10m', errorNote: '河西段为人工绘制' },
  'tubo-03': { method: `${NE}：青藏高原外环 + 昆仑中线`, sourceScale: '1:10m', errorNote: '归义军复河西后吐蕃实际北界待核' },
  'hou_qin-01': { method: `${NE}：黄土高原外环南缘（北界）+ 秦岭山脊（南界）`, sourceScale: '1:10m', errorNote: '黄土高原不含渭河平原，须与秦岭合围' },
  'qianqin-01': { method: `${NE}：黄土高原外环南缘 + 秦岭山脊 + 关东政治边界`, sourceScale: '1:10m', errorNote: '关东段人工' },
  'xia-01': { method: `${NE}：鄂尔多斯高原外环（南界下压以纳入统万城）`, sourceScale: '1:10m', errorNote: '南界为政治判断' },
  'bohai-01': { method: `${NE}：松嫩平原外环东缘 + 日本海一侧人工`, sourceScale: '1:10m', errorNote: '东界为估计' },
  'bohai-02': { method: `${NE}：松嫩平原外环东缘 + 日本海一侧人工`, sourceScale: '1:10m', errorNote: '东界为估计' },
  'tang-anxi-01': { method: `${NE}：塔里木盆地外环 + 天山北麓 + 碎叶人工`, sourceScale: '1:10m', errorNote: '安西四镇实为军镇链，画成面是简化' },
  'tang-01': { method: `${NE}：海岸线、长江、淮河、汉水、阴山；安北为政治边界`, sourceScale: '1:10m', errorNote: '辽东 7 世纪末渐失，本段作全期近似' },
  'tang-02': { method: `${NE}：海岸线、长江、淮河、汉水；陇右西界为政治边界`, sourceScale: '1:10m', errorNote: '陇右退守线人工' },
  'sui-01': { method: `${NE}：黄河、长江、阴山、淮河`, sourceScale: '1:10m', errorNote: '巴蜀段人工' },
  'sui-02': { method: `${NE}：海岸线、长江、淮河、汉水`, sourceScale: '1:10m', errorNote: '交州段人工' },
};

const HEXI_CORRIDOR =
  `依据真实州县坐标（敦煌 94.66,40.14 / 酒泉 98.51,39.74 / 张掖 100.45,38.93 / 姑臧 102.63,37.93 / 金城 103.79,36.06）` +
  `与祁连北麓—北山走向定位走廊两缘；北山一侧无参照数据，为人工绘制`;

const COMPILATION_MORE: Record<string, Compilation> = {
  'han_zhao-01': { method: `${NE}：黄河中段河道（西界）+ 太行山脉南北缘中线（东界）`, sourceScale: '1:10m', errorNote: '南界（轵关—太行南端）为政治判断；晋阳此时在刘琨手中，未纳入' },
  'han_zhao-02': { method: `${NE}：黄河中段河道 + 太行山脉中线 + 秦岭山脊`, sourceScale: '1:10m', errorNote: '关中北缘（北山）与陇西段为人工绘制；本环是凹的，黄河韩城以下为内线' },
  'qian_liang-01': { method: `${NE}：河西走廊。${HEXI_CORRIDOR}`, errorNote: '东界陇山与南界河湟为政治判断' },
  'hou_liang-01': { method: `${NE}：河西走廊。${HEXI_CORRIDOR}`, errorNote: '承前凉故地，边界取近似' },
  'bei_liang-01': { method: `${NE}：河西走廊中段。${HEXI_CORRIDOR}`, errorNote: '前后两段的界线按 410 年取姑臧、421 年灭西凉分期' },
  'bei_liang-02': { method: `${NE}：河西走廊全段。${HEXI_CORRIDOR}`, errorNote: '并西凉后的西界取玉门阳关一带' },
  'xi_liang-01': { method: `${NE}：河西走廊西段。${HEXI_CORRIDOR}`, errorNote: '东界与北凉的分界为政治判断' },
  'nan_liang-01': { method: '湟水流域：依据乐都（102.40,36.48）等真实坐标人工定位', errorNote: '未使用地理参照；北界取祁连南麓的大致走向' },
  'xi_qin-01': { method: '陇西：依据苑川（104.10,35.85）、枹罕（103.21,35.60）、金城等真实坐标人工定位', errorNote: '北界与南凉共线，为政治判断' },
  'hou_yan-01': { method: `${NE}：太行山脉南北缘中线（西界）+ 黄河下游河道（南界）`, sourceScale: '1:10m', errorNote: '黄河用现代河道；唐以前黄河走河北入海，与当时分界有出入。燕山与辽西段为人工绘制' },
  'nan_yan-01': { method: `${NE}：黄河下游河道（北界）+ 海岸线（东界）`, sourceScale: '1:10m', errorNote: '黄河用现代河道；南界沂蒙—泰山段为人工绘制' },
};

const compilationOf = (id: string): Compilation =>
  COMPILATION_MORE[id] ?? compilationOfBase(id);

const compilationOfBase = (id: string): Compilation =>
  COMPILATION[id] ?? {
    method: HAND,
    errorNote: '本段未使用真实地理参照，轮廓为示意，不可用于精度要求高于「大致方位」的用途',
  };

// ─────────────────────────────────────────────────────────────────────────────
// 归一化：把紧凑的手写条目展开成带证据、区间、审查、编制的完整记录
// ─────────────────────────────────────────────────────────────────────────────

/** 手写形态：只写必要字段，治理字段在归一化时补齐或从来源推导 */
export interface RawSegment {
  id: string;
  polityId: string;
  from: Year;
  to: Year;
  control: Segment['control'];
  borderPrecision: 1 | 2 | 3;
  confidence: Segment['confidence'];
  sourceId: string;
  note?: string;
  geometry: [number, number][];
  /** 可选：史料对起止有分歧时显式给出区间 */
  validity?: Validity;
  /** 可选：逐条填得出的出处定位 */
  evidence?: Evidence[];
}

export interface RawEvent {
  id: string;
  title: string;
  y: Year;
  m?: number;
  at: [number, number];
  place: string;
  polityIds: string[];
  persons: string[];
  importance: AtlasEvent['importance'];
  type: AtlasEvent['type'];
  summary: string;
  interpretation?: string;
  /** 只引用一个来源时可以省写，由 evidence 推导 */
  sourceId?: string;
  evidence?: Evidence[];
}

export interface RawPolity extends Omit<Polity, 'evidence'> {
  evidence?: Evidence[];
}

export interface RawPlace extends Omit<Place, 'spatialPrecision' | 'evidence'> {
  /** 旧字段：1 粗略 / 2 中等 */
  rank: 1 | 2;
  precision?: SpatialPrecision;
  evidence?: Evidence[];
}

const precisionOf = (p: 1 | 2 | 3): SpatialPrecision =>
  p === 1 ? 'approximate' : 'specified';

/** 由来源登记表取该来源的定位说明，作为兜底 locator */
const evidenceFrom = (sourceId: string, note?: string, explicit?: Evidence[]): Evidence[] =>
  explicit && explicit.length ? explicit : [{ sourceId, note }];

export const normalizeSegment = (r: RawSegment): Segment => {
  const validity = r.validity ?? yearValidity(r.from, r.to);
  const { from, to } = expandValidity(validity);
  return {
    id: r.id,
    polityId: r.polityId,
    from,
    to,
    validity,
    temporalSupport: 'interval',
    control: r.control,
    spatialPrecision: precisionOf(r.borderPrecision),
    confidence: r.confidence,
    compilation: compilationOf(r.id),
    review: REVIEW_PENDING,
    evidence: evidenceFrom(r.sourceId, r.note, r.evidence),
    note: r.note,
    geometry: r.geometry,
  };
};

export const normalizeEvent = (r: RawEvent): AtlasEvent => ({
  id: r.id,
  title: r.title,
  y: r.y,
  m: r.m,
  at: r.at,
  place: r.place,
  polityIds: r.polityIds,
  persons: r.persons,
  importance: r.importance,
  type: r.type,
  summary: r.summary,
  interpretation: r.interpretation,
  evidence: evidenceFrom(r.sourceId ?? r.evidence?.[0]?.sourceId ?? '', undefined, r.evidence),
  review: REVIEW_PENDING,
  sourceId: r.sourceId ?? r.evidence?.[0]?.sourceId ?? '',
});

export const normalizePlace = (r: RawPlace): Place => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  at: r.at,
  from: r.from,
  to: r.to,
  rank: r.rank,
  spatialPrecision: r.precision ?? 'approximate',
  note: r.note,
  evidence: evidenceFrom(r.sourceId, r.note, r.evidence),
  sourceId: r.sourceId,
});

export const normalizePolity = (r: RawPolity): Polity => ({
  ...r,
  validity: r.validity ?? yearValidity(r.from, r.to),
  evidence: r.evidence,
});

// ─────────────────────────────────────────────────────────────────────────────
// 覆盖声明
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 缺口清单。**这是本文件最重要的部分。**
 *
 * 空白表示尚缺资料，不表示当时没有政权或事件。逐条写清缺什么、缺到什么程度，
 * 比一句「本图仅供参考」有用得多。
 */
export const COVERAGE: CoverageEntry[] = [
  {
    id: 'pre-220', startYear: 200, endYear: 220, topic: 'territory', status: 'missing',
    reason: '视野起点 200 年早于魏建立，此段只有零星点位，无政权面。',
  },
  {
    id: 'sixteen-kingdoms-handdrawn', startYear: 304, endYear: 439, topic: 'territory', status: 'pending',
    reason: '十六国 13 个政权已全部改用真实地理参照（黄河中段河道、太行山脉中线、河西走廊）。剩余问题是个别政治分界仍为直线段：陇山、河湟、燕山、沂蒙没有对应的地貌参照。',
  },
  {
    id: 'hexi-corridor', startYear: 320, endYear: 439, topic: 'territory', status: 'pending',
    reason: '河西走廊两缘按真实州县坐标定位，宽度约 1°。走廊北侧的北山—龙首山在 Natural Earth 里没有独立地貌单元，北缘为人工绘制。',
  },
  {
    id: 'overlapping-territories', startYear: 200, endYear: 960, topic: 'territory', status: 'pending',
    reason: '每个状态区间只有一张静态多边形，而边界变动频繁的年份里双方往往在同一片土地上拉锯，于是同时并立的直辖疆域会出现几何交叠。当下 51 对，实时数量见 npm run report 与校验器的 overlap 提示。集中在十六国的陇西与关东、以及隋唐与东突厥、回鹘、南诏、渤海、吐蕃之间 —— 这些政权本轮都还没有改用真实山川参照。',
  },
  {
    id: 'yellow-river-anachronism', startYear: 200, endYear: 960, topic: 'territory', status: 'pending',
    reason: '后燕、南燕的南北界用了黄河下游河道，但那是 1855 年铜瓦厢改道后的现代河道；唐以前黄河走河北入海，与当时分界有出入。',
  },
  {
    id: 'steppe-khanates', startYear: 552, endYear: 840, topic: 'territory', status: 'pending',
    reason: '东突厥、回鹘的漠北范围是手绘；蒙古高原地貌单元未纳入参照。',
  },
  {
    id: 'nanzhao-yunnan', startYear: 738, endYear: 902, topic: 'territory', status: 'pending',
    reason: '南诏为手绘；云贵高原参照未纳入。',
  },
  {
    id: 'gaogouli-korea', startYear: -37, endYear: 668, topic: 'territory', status: 'pending',
    reason: '高句丽横跨辽东与朝鲜半岛，两段皆为手绘；朝鲜半岛山地参照未纳入。',
  },
  {
    id: 'tuyuhun', startYear: 285, endYear: 663, topic: 'territory', status: 'pending',
    reason: '吐谷浑仅取青藏高原东北缘的大致范围，未做真实边界切分。',
  },
  {
    id: 'inland-boundaries', startYear: -37, endYear: 960, topic: 'territory', status: 'pending',
    reason: '黄河中段、长江、淮河、汉水、海岸线、秦岭、阴山、昆仑已用真实河道与山脉；其余内陆分界仍是直线段。',
  },
  {
    id: 'locators', startYear: -37, endYear: 960, topic: 'provenance', status: 'pending',
    reason: '每条记录都有 sourceId，但绝大多数没有填到卷次／页码级定位（evidence.locator）。',
  },
  {
    id: 'no-human-review', startYear: -37, endYear: 960, topic: 'provenance', status: 'missing',
    reason: '全部记录的 review.status 均为 pending —— 未经历史专业审定。软件测试与机械校验不等于史料复核。',
  },
  {
    id: 'event-detail', startYear: -37, endYear: 960, topic: 'event', status: 'pending',
    reason: '事件有摘要与出处，但没有详情正文；原因判断与史实尚未分列到 interpretation 字段。',
  },
  {
    id: 'places-sparse', startYear: -37, endYear: 960, topic: 'place', status: 'pending',
    reason: '67 处地点集中在交通要冲与军政重镇，州县与聚落远未覆盖。',
  },
  {
    id: 'licensing', startYear: -37, endYear: 960, topic: 'provenance', status: 'verified',
    reason: '仓库内不含受限制的第三方历史 GIS 数据；CHGIS v6 与《中国历史地图集》仅作为绘制参考，未复制其数据。',
  },
];

export const coverageAt = (year: Year): CoverageEntry[] =>
  COVERAGE.filter((c) => c.startYear <= year && year <= c.endYear);
