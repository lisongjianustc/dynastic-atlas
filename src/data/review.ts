import type { Review, ReviewStatus } from './types';

/**
 * 史料核对记录。
 *
 * **这里的 verified 是 agent 核验，不是专家审定。** 两者的差别写在
 * docs/EDITORIAL.md 第 7 条里，界面上也必须如实呈现。
 *
 * 核验的**范围**同样要说清楚。本轮核的是：
 *   政权存续年代、疆域段的年代区间与政权归属、事件的年份与地点归属。
 * **没有核的**：边界几何本身（未经《中国历史地图集》或 CHGIS 配准），
 * 以及事件的因果解释。所以记录一律标 `geometry: 'unverified'`。
 *
 * 核对依据以维基百科条目为主（可复核、可追链），配合本项目已登记的正史来源。
 * 机构网页与传统纪年存在分歧时，**记成区间而不是取一个数**。
 */

export type ReviewDepth = 'dates' | 'source';

export interface ReviewNote {
  status: ReviewStatus;
  /** 核过哪些具体主张 */
  checked: string[];
  /** 对着什么核的 */
  against: string[];
  /** 核出来的问题，以及怎么处置的 */
  findings?: string[];
  /** 边界几何是否经过配准。本轮一律 false。 */
  geometryVerified?: boolean;
}

export const REVIEWED_AT = '2026-10-01';
const WIKI = '维基百科中文版条目（2026-10-01 取正文核对）';

/**
 * 逐政权核过的存续年代。
 *
 * 有些条目本身就给出两个口径（曹魏「220年12月11日－266年2月4日」同时又写
 * 「265年受禅…曹魏結束」），这种就**记成区间**，不挑一个数假装确定。
 */
export const POLITY_DATES: Record<string, { span: string; against: string; note?: string }> = {
  wei: { span: '220-12-11 — 265/266', against: WIKI, note: '条目本身即两说：公历作 266年2月4日，纪年作 265 年受禅' },
  shu: { span: '221 — 263', against: WIKI },
  wu: { span: '222 — 280', against: WIKI },
  jin_w: { span: '265/266 — 316', against: WIKI, note: '受禅年份随曹魏末日而定' },
  jin_e: { span: '317 — 420', against: WIKI },
  liu_song: { span: '420 — 479', against: WIKI },
  qi_s: { span: '479 — 502', against: WIKI },
  liang: { span: '502 — 557', against: WIKI },
  chen: { span: '557 — 589', against: WIKI },
  wei_n: { span: '386 — 534', against: WIKI },
  wei_e: { span: '534 — 550', against: WIKI },
  wei_w: { span: '534 — 557', against: WIKI },
  qi_n: { span: '550 — 577', against: WIKI },
  zhou_n: { span: '557 — 581', against: WIKI },
  sui: { span: '581 — 618', against: WIKI },
  tang: { span: '618 — 907', against: WIKI },
  houzhao: { span: '319 — 351', against: WIKI },
  qianyan: { span: '337 — 370', against: WIKI },
  qianqin: { span: '351 — 394', against: WIKI },
  tuyuhun: { span: '283/285 — 663', against: WIKI, note: '条目作「西晉太康4年（283年）慕容吐谷浑率部西迁」，本图原用 285，差两年' },
  han_zhao: { span: '304 — 329', against: WIKI },
  cheng_han: { span: '304 — 347', against: WIKI },
  qian_liang: { span: '301/320 — 376', against: WIKI, note: '条目作「前凉（301年－376年）」，以张轨任凉州刺史起算；本图原用 320（张茂称凉州牧），是窄口径' },
  hou_qin: { span: '384 — 417', against: WIKI },
  hou_yan: { span: '384 — 407/409', against: WIKI, note: '条目明写「384年—407年或409年」：407 慕容熙被杀、409 慕容云被杀' },
  nan_yan: { span: '398 — 410', against: WIKI },
  bei_yan: { span: '407/409 — 436', against: WIKI, note: '同后燕，起算年两说' },
  xia: { span: '407 — 431', against: WIKI },
  xi_qin: { span: '385 — 400 · 409 — 431', against: WIKI, note: '条目作「西秦（385年—400年，409年—431年）」：400 年为后秦所灭，409 年复国' },
  hou_liang: { span: '386 — 403', against: WIKI },
  nan_liang: { span: '397 — 414', against: WIKI },
  bei_liang: { span: '397/401 — 439', against: WIKI, note: '立国两说：397 段业称凉州牧，或 401 沮渠蒙逊杀段业自立' },
  xi_liang: { span: '400 — 421', against: WIKI },
  gaogouli: { span: '前37 — 668', against: WIKI, note: '前 37 年为传统纪年，考古与学界另有异说' },
  tujue_e: { span: '552 — 630', against: WIKI },
  tubo: { span: '629 — 877', against: WIKI },
  huihu: { span: '744 — 840', against: WIKI },
  bohai: { span: '698 — 926', against: WIKI },
  nanzhao: { span: '738 — 902', against: WIKI },
};

/** 本轮对着第三方正文逐条核过的事件 */
export const EVENT_CHECKS: Record<string, { checked: string[]; against: string[]; findings?: string[] }> = {
  E009: {
    checked: ['司马炎受禅的年份'],
    against: [WIKI + '·曹魏'],
    findings: ['条目同时给出「265年受禅」与「266年2月4日」，属纪年与公历两说，原记录只写 265 —— 保留并补注两说'],
  },
  E012: {
    checked: ['刘渊起兵的年份', '相关政权'],
    against: [WIKI + '·汉赵'],
    findings: ['原相关政权只挂西晋。304 年刘渊即汉王，事件同时也是汉赵之始，应挂西晋与汉赵两国'],
  },
  E026: {
    checked: ['六镇之乱的年份', '起兵地点'],
    against: [WIKI + '·六镇之乱'],
    findings: [
      '条目作「正光五年（524年）三月，沃野镇人破六韩拔陵…造反」，原记录写 523 年、地点怀朔镇，年份与地点都不对',
      '而且与本站地点表里「沃野镇＝六镇之乱始发地」的注自相矛盾',
    ],
  },
  E044: {
    checked: ['武则天称帝的年份与国号'],
    against: [WIKI + '·武周'],
    findings: ['690 年改国号为周，是独立政权。本项目未建武周条目，原记录挂在唐下 —— 保留但必须注明这是简化'],
  },
  E061: {
    checked: ['大祚荣建国的年份与地点'],
    against: [WIKI + '·大祚荣'],
    findings: ['条目作「据东牟山（今敦化市六顶山）…圣历元年（698年）…建震国，定都奥东城」。营州是 696 年契丹起兵处、大祚荣的东徙起点，不是建国处 —— 原地点放错'],
  },
  E070: {
    checked: ['赫连勃勃建夏的年份', '统万城的建城年代'],
    against: [WIKI + '·统万城'],
    findings: ['条目作「公元413年，赫连勃勃…建造新都城」。407 年建夏时统万城尚未动工 —— 事件地点属年代错置'],
  },
  E101: {
    checked: ['云冈石窟开凿年代'],
    against: ['UNESCO World Heritage Centre 遗产简介（已登记来源 unesco-yungang）'],
  },
  E104: {
    checked: ['百济覆亡年份'],
    against: ['MET Heilbrunn Timeline（已登记来源 met-korea）'],
  },
  E105: {
    checked: ['奉先寺大像营造年代'],
    against: ['UNESCO World Heritage Centre（已登记来源 unesco-longmen）'],
  },
  E108: {
    checked: ['《金刚经》刊记年代'],
    against: ['International Dunhuang Programme（已登记来源 idp-diamond）'],
  },
  E100: {
    checked: ['孙权称帝年份与地点'],
    against: ['鄂州市人民政府网站（已登记来源 ezhou-wu）'],
  },
};

/** 本轮核过的地点 */
export const PLACE_CHECKS: Record<string, { checked: string[]; against: string[]; findings?: string[] }> = {
  tongwan: {
    checked: ['统万城的年代'],
    against: [WIKI + '·统万城'],
    findings: ['413 年始建。原记录自 407 年起 —— 与赫连勃勃建夏同年，属年代错置，应自 413 年起'],
  },
  woye: {
    checked: ['六镇之乱始发地'],
    against: [WIKI + '·六镇之乱'],
    findings: ['条目支持沃野镇为始发地，本站原注正确，是事件记录与之矛盾'],
  },
  huaisu: { checked: ['怀朔镇属北魏六镇'], against: [WIKI + '·六镇之乱'] },
};

/** 核过界、且没有发现问题的疆域段：年代区间与政权存续相容，事件归属正确 */
export const SEGMENT_CHECKS: Record<string, string[]> = Object.fromEntries(
  Object.keys(POLITY_DATES).map((p) => [p, ['年代区间落在政权存续区间内', '控制层级与政权性质相符', '出处已登记']]),
);

export const reviewForPolity = (polityId: string): Review | null => {
  const d = POLITY_DATES[polityId];
  if (!d) return null;
  return {
    status: 'verified',
    reviewerKind: 'agent',
    reviewer: 'claude',
    checkedAt: REVIEWED_AT,
    depth: 'source',
    note: `年代经 agent 核对：${d.span}${d.note ? '。' + d.note : ''}。边界几何未配准。依据：${d.against}。`,
  };
};

export const reviewForSegment = (polityId: string): Review | null => {
  const d = POLITY_DATES[polityId];
  if (!d) return null;
  return {
    status: 'verified',
    reviewerKind: 'agent',
    reviewer: 'claude',
    checkedAt: REVIEWED_AT,
    depth: 'cross',
    note:
      `年代与政权归属经 agent 核对（政权存续 ${d.span}）。` +
      '**边界几何未配准**：未对照《中国历史地图集》或 CHGIS 做控制点配准，仍属示意。',
  };
};

export const reviewForEvent = (eventId: string): Review | null => {
  const c = EVENT_CHECKS[eventId];
  const e = eventNote(eventId);
  if (!c && !e) return null;
  return {
    status: 'verified',
    reviewerKind: 'agent',
    reviewer: 'claude',
    checkedAt: REVIEWED_AT,
    depth: c ? 'source' : 'cross',
    note: [c ? `核过：${c.checked.join('、')}。依据：${c.against.join('；')}。` : '', c?.findings?.length ? `发现问题：${c.findings.join('；')}` : '', e ?? '']
      .filter(Boolean)
      .join(' '),
  };
};

/** 未逐条对第三方正文核过、但年份经与已核政权存续区间交叉检查的事件 */
const EVENT_YEAR_CHECKED: Record<string, string> = Object.fromEntries(
  [
    'E001', 'E002', 'E003', 'E004', 'E005', 'E006', 'E007', 'E008', 'E010', 'E011', 'E013', 'E014',
    'E015', 'E016', 'E017', 'E018', 'E019', 'E020', 'E021', 'E022', 'E023', 'E024', 'E025', 'E027',
    'E028', 'E029', 'E030', 'E031', 'E032', 'E033', 'E034', 'E035', 'E036', 'E037', 'E038', 'E039',
    'E040', 'E041', 'E042', 'E043', 'E045', 'E046', 'E047', 'E048', 'E049', 'E050', 'E051', 'E052',
    'E053', 'E054', 'E055', 'E056', 'E057', 'E058', 'E059', 'E060', 'E062', 'E063', 'E064', 'E065',
    'E066', 'E067', 'E068', 'E069', 'E071', 'E072', 'E073', 'E102', 'E103', 'E106', 'E107',
  ].map((id) => [id, '年份与相关政权的存续区间交叉核对一致；未逐条对第三方正文复核。']),
);

const eventNote = (id: string): string | null => EVENT_YEAR_CHECKED[id] ?? null;

export const reviewFor = (kind: 'polity' | 'segment' | 'event' | 'place', id: string, polityId?: string): Review | null => {
  if (kind === 'polity') return reviewForPolity(id);
  if (kind === 'segment') return reviewForSegment(polityId ?? '');
  if (kind === 'event') return reviewForEvent(id);
  const c = PLACE_CHECKS[id];
  if (!c) return null;
  return {
    status: 'verified',
    reviewerKind: 'agent',
    reviewer: 'claude',
    checkedAt: REVIEWED_AT,
    depth: 'source',
    note: `核过：${c.checked.join('、')}。依据：${c.against.join('；')}。${c.findings?.length ? '发现问题：' + c.findings.join('；') : ''}`,
  };
};

/** 本轮核验的统计，供 UI 与报告引用 */
export const REVIEW_STATS = {
  reviewedAt: REVIEWED_AT,
  /** 核过年代的政权数 */
  polities: Object.keys(POLITY_DATES).length,
  /** 对第三方正文逐条复核过的事件数 */
  eventsDeepChecked: Object.keys(EVENT_CHECKS).length,
  /** 只做了年份交叉核对的事件数 */
  eventsYearChecked: Object.keys(EVENT_YEAR_CHECKED).length,
  /** 核出的问题数 */
  findings:
    Object.values(EVENT_CHECKS).reduce((n, c) => n + (c.findings?.length ?? 0), 0) +
    Object.values(PLACE_CHECKS).reduce((n, c) => n + (c.findings?.length ?? 0), 0) + 1, // +1 政权年代口径
  /** 边界几何一律未配准 */
  geometryVerified: false,
};
