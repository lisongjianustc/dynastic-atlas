import type { Polity } from './types';

/**
 * 外部数据源配准结果。
 *
 * ## 为什么要做这件事
 *
 * 在此之前，全部 58 段疆域的空间精度都只是 `approximate` ——
 * 一个**没有任何外部参照**的自我声明。这一轮把它变成一个**可复核的量**：
 * 拿一套独立的、许可允许使用的数据集，量出两边的 IoU 与重心偏移。
 *
 * ## 参照是什么，不是什么
 *
 * 参照是 **AtlasPI**（<https://atlaspi.it>，Apache-2.0，1,038 个历史政权 + 4,800+ 引用文献）。
 * 它有中国历代主要政权的 GeoJSON 轮廓。**本项目不复制、不再分发它的几何** ——
 * 只在构建期取来做对比，发布的是**统计量与结论**。
 *
 * ## 这个数字能说明什么
 *
 * 它是**线索，不是判决**。AtlasPI 每个政权**只有一个轮廓**，常取该政权最大疆域；
 * 本项目按状态区间切分。两者本来就不该逐点吻合，所以：
 *   IoU ≥ 0.6 → 两套独立数据在量级与方位上**互相印证**
 *   0.4 ≤ IoU < 0.6 → 大致相符，差异在可解释范围内
 *   IoU < 0.4 → **待查**：至少一方错了
 *
 * ## 它仍然不能说明什么
 *
 * IoU 高**不等于**边界画对了 —— 两套数据可能犯同一个错。
 * 而且本项目只与 **16 个**政权比得上：AtlasPI 没有三国，也几乎没有十六国的碎片政权
 * （汉赵、成汉、前凉、后燕、南燕、西秦、后凉、南凉、北凉、西凉、夏、北燕全缺）。
 * 剩下 23 个政权**仍然没有任何外部参照**。
 */

export interface Registration {
  /** 参照数据源 id */
  reference: string;
  /** 在本项目疆域最大的那一年比的。AtlasPI 给的是最大疆域，取小年份比会量出假差异 */
  year: number;
  /** 交并比，0–1 */
  iou: number;
  /** 面积比（本项目 / 参照） */
  areaRatio: number;
  /** 重心偏移，度 */
  centroidOffset: number;
  verdict: 'corroborated' | 'close' | 'divergent';
  /** 差异大时的待查说明 */
  lead?: string;
}

export const RE_REGISTERED_AT = '2026-10-01';
export const REGISTRATION_SOURCE = 'src-atlaspi';

/** 与 AtlasPI 的对比结果。只列比得上的 —— 没比的政权一律不出现在这里 */
export const REGISTRATION: Record<string, Registration> = {
  liang: { reference: REGISTRATION_SOURCE, year: 502, iou: 0.726, areaRatio: 0.77, centroidOffset: 0.91, verdict: 'corroborated' },
  wei_n: { reference: REGISTRATION_SOURCE, year: 439, iou: 0.646, areaRatio: 1.07, centroidOffset: 1.38, verdict: 'corroborated' },
  qi_n: { reference: REGISTRATION_SOURCE, year: 550, iou: 0.618, areaRatio: 1.58, centroidOffset: 1.10, verdict: 'corroborated' },
  sui: { reference: REGISTRATION_SOURCE, year: 589, iou: 0.724, areaRatio: 0.86, centroidOffset: 0.75, verdict: 'corroborated' },
  tang: { reference: REGISTRATION_SOURCE, year: 618, iou: 0.775, areaRatio: 1.14, centroidOffset: 1.21, verdict: 'corroborated' },
  huihu: { reference: REGISTRATION_SOURCE, year: 744, iou: 0.61, areaRatio: 0.76, centroidOffset: 4.16, verdict: 'corroborated' },
  tujue_e: { reference: REGISTRATION_SOURCE, year: 552, iou: 0.657, areaRatio: 0.9, centroidOffset: 2.39, verdict: 'corroborated' },
  zhou_n: { reference: REGISTRATION_SOURCE, year: 557, iou: 0.459, areaRatio: 1.47, centroidOffset: 3.18, verdict: 'close' },
  houzhao: { reference: REGISTRATION_SOURCE, year: 319, iou: 0.501, areaRatio: 0.55, centroidOffset: 2.21, verdict: 'close', lead: '本项目面积只有参照的一半：后赵 319 年为初起，参照取的是最大疆域，属取样不同而非错误' },
  tuyuhun: { reference: REGISTRATION_SOURCE, year: 285, iou: 0.426, areaRatio: 0.43, centroidOffset: 0.57, verdict: 'close', lead: '参照的吐谷浑轮廓偏大（含柴达木以西），本项目东界收在青海湖以西' },
  tubo: { reference: REGISTRATION_SOURCE, year: 786, iou: 0.578, areaRatio: 1.25, centroidOffset: 2.46, verdict: 'close' },
  nanzhao: { reference: REGISTRATION_SOURCE, year: 750, iou: 0.449, areaRatio: 0.48, centroidOffset: 1.42, verdict: 'close', lead: '参照的南诏范围更大，可能含羁縻部族；本项目只画直辖' },
  chen: { reference: REGISTRATION_SOURCE, year: 557, iou: 0.138, areaRatio: 1.47, centroidOffset: 7.94, verdict: 'divergent', lead: '重心偏移近 8°，参照的陳朝轮廓南界停在 28°N 左右，**缺交州**；陈在 589 年前长期领有交州，本项目应当是对的' },
  qianqin: { reference: REGISTRATION_SOURCE, year: 376, iou: 0.118, areaRatio: 0.51, centroidOffset: 8.57, verdict: 'divergent', lead: '参照的前秦 bbox 南达 18°N（交州一带），前秦从未控制到那里，**参照可能过宽**；但本项目前秦 376 年的北界也需另核' },
  gaogouli: { reference: REGISTRATION_SOURCE, year: 450, iou: 0.24, areaRatio: 0.24, centroidOffset: 0.55, verdict: 'divergent', lead: '参照的高句丽范围约为本项目的 4 倍（南至 35°N、含朝鲜半岛北半）。**本项目很可能画小了** —— 5 世纪高句丽南界应在汉江一带，待重画' },
  bohai: { reference: REGISTRATION_SOURCE, year: 800, iou: 0.271, areaRatio: 0.39, centroidOffset: 2.96, verdict: 'divergent', lead: '参照的渤海范围约为本项目的 2.5 倍（北至 48°N、东至 135°E）。**本项目很可能画小了** —— 渤海盛期北界抵黑水靺鞨，待重画' },
};

export const registrationFor = (polityId: string): Registration | undefined => REGISTRATION[polityId];

/** 把配准结果挂到政权上，供 UI 显示 */
export const attachRegistration = (p: Polity): Polity => {
  const r = REGISTRATION[p.id];
  return r ? { ...p, registration: r, evidence: p.evidence } : p;
};

export const REGISTRATION_STATS = {
  total: Object.keys(REGISTRATION).length,
  corroborated: Object.values(REGISTRATION).filter((r) => r.verdict === 'corroborated').length,
  close: Object.values(REGISTRATION).filter((r) => r.verdict === 'close').length,
  divergent: Object.values(REGISTRATION).filter((r) => r.verdict === 'divergent').length,
};
