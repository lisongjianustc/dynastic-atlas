import type { Source } from './types';

/**
 * 来源登记表。
 *
 * `redistribution` 是硬门：标 denied 的来源，其数据**一律不得随站点发布**，
 * 只能作为绘制参考。`permissionEvidence` 必须写清凭什么可以引用它 ——
 * 这条不是形式主义，是将来别人复用这个仓库时唯一能站得住的依据。
 *
 * 两个来源体系已合并：
 *   本项目原有的正史与图集（谭其骧、CHGIS、正史文献）
 *   HistoryMapV2 的机构网页与遗产条目（MET、UNESCO、IDP 等）
 */
export const SOURCES: Source[] = [
  // ── 图集与历史 GIS ──
  {
    id: 'src-tan-3',
    work: '谭其骧《中国历史地图集》',
    creator: '谭其骧主编',
    edition: '中国地图出版社 1982',
    locus: '第三册 三国·西晋',
    redistribution: 'denied',
    license: '有著作权，仍在校准期内',
    permissionEvidence: '仅作为人工重绘的依据；未数字化、未复制其边界数据，仓库内不含本图集的任何原始数据。',
  },
  {
    id: 'src-tan-4',
    work: '谭其骧《中国历史地图集》',
    creator: '谭其骧主编',
    edition: '中国地图出版社 1982',
    locus: '第四册 东晋十六国·南北朝',
    redistribution: 'denied',
    license: '有著作权，仍在校准期内',
    permissionEvidence: '同第三册：仅作绘图参考，未复制数据。',
  },
  {
    id: 'src-tan-5',
    work: '谭其骧《中国历史地图集》',
    creator: '谭其骧主编',
    edition: '中国地图出版社 1982',
    locus: '第五册 隋·唐·五代十国',
    redistribution: 'denied',
    license: '有著作权，仍在校准期内',
    permissionEvidence: '同第三册：仅作绘图参考，未复制数据。',
  },
  {
    id: 'src-chgis',
    work: 'CHGIS 中国历史地理信息系统 v6',
    creator: '哈佛大学 · 复旦大学',
    locus: '治所点位与代表年份政区面',
    url: 'https://gis.harvard.edu/china-historical-gis',
    redistribution: 'denied',
    license: '学术非商业，限制再分发',
    permissionEvidence: '仅参考其治所点位体系与年份口径；仓库内未分发任何 CHGIS 原始数据。',
  },
  {
    id: 'src-ne',
    work: 'Natural Earth',
    creator: 'Natural Earth',
    url: 'https://www.naturalearthdata.com/',
    redistribution: 'allowed',
    license: '公有领域（Public Domain）',
    permissionEvidence: '公有领域，可自由再分发。本项目所用为其 110m/10m 自然地理要素（海岸线、河流、湖泊、山脉区域）。',
  },

  // ── 正史与文献（公有领域） ──
  { id: 'src-sgz', work: '陈寿《三国志》', redistribution: 'allowed', license: '公有领域' },
  { id: 'src-jinshu', work: '房玄龄等《晋书》', redistribution: 'allowed', license: '公有领域' },
  { id: 'src-zztsj', work: '司马光《资治通鉴》', redistribution: 'allowed', license: '公有领域' },
  { id: 'src-suishu', work: '魏徵等《隋书》', redistribution: 'allowed', license: '公有领域' },
  { id: 'src-jts', work: '刘昫等《旧唐书》', redistribution: 'allowed', license: '公有领域' },
  { id: 'src-xts', work: '欧阳修等《新唐书》', redistribution: 'allowed', license: '公有领域' },
  { id: 'src-zztj-jiaozhu', work: '《中国历史大事年表》', edition: '上海辞书出版社', redistribution: 'denied', license: '有著作权', permissionEvidence: '仅用于事件年表比对，未复制条目正文。' },

  // ── 机构年代资料与遗产条目（并入自 HistoryMapV2） ──
  {
    id: 'moe-chronology',
    work: '中国历代纪年表',
    creator: '教育部《重编国语辞典修订本》',
    edition: '网页版本，2026-10-01 核对',
    url: 'https://dict.revised.moe.edu.tw/appendix.jsp?ID=1&la=1&powerMode=0',
    accessedAt: '2026-10-01',
    redistribution: 'unknown',
    license: '原网页保留权利；仅采用事实并独立编写摘要',
    permissionEvidence: '只发布独立事实条目及链接；未复制原文、原图或受限数据集。',
  },
  {
    id: 'ihns-era',
    work: '中国历代年号索引表',
    creator: '中国科学院自然科学史研究所网站',
    edition: '网页版本，2026-10-01 核对',
    url: 'https://agri-history.ihns.ac.cn/history/historic%20table.htm',
    accessedAt: '2026-10-01',
    redistribution: 'unknown',
    license: '原网页保留权利；仅采用事实并独立编写摘要',
    permissionEvidence: '只采用年号与纪年事实，未复制表格排版或正文。',
  },
  {
    id: 'met-early',
    work: 'China, 1–500 A.D.',
    creator: 'The Metropolitan Museum of Art',
    edition: 'Heilbrunn Timeline of Art History，2026-10-01 核对',
    url: 'https://www.metmuseum.org/toah/ht/05/eac.html',
    accessedAt: '2026-10-01',
    redistribution: 'unknown',
    license: '原网页保留权利；仅采用事实并独立编写摘要',
    permissionEvidence: '只采用年代与事件事实并独立撰写摘要，未使用其图像。',
  },
  {
    id: 'met-late',
    work: 'China, 500–1000 A.D.',
    creator: 'The Metropolitan Museum of Art',
    edition: 'Heilbrunn Timeline of Art History，2026-10-01 核对',
    url: 'https://www.metmuseum.org/toah/ht/06/eac.html',
    accessedAt: '2026-10-01',
    redistribution: 'unknown',
    license: '原网页保留权利；仅采用事实并独立编写摘要',
    permissionEvidence: '同上。',
  },
  {
    id: 'met-korea',
    work: 'Korea, 500–1000 A.D.',
    creator: 'The Metropolitan Museum of Art',
    edition: 'Heilbrunn Timeline of Art History，2026-10-01 核对',
    url: 'https://www.metmuseum.org/toah/ht/06/eak.html',
    accessedAt: '2026-10-01',
    redistribution: 'unknown',
    license: '原网页保留权利；仅采用事实并独立编写摘要',
    permissionEvidence: '同上。',
  },
  {
    id: 'ezhou-wu',
    work: '孙权与古武昌',
    creator: '鄂州市人民政府网站',
    edition: '网页版本，2026-10-01 核对',
    url: 'https://www.ezhou.gov.cn/zjez/ezrw/ezrj/201501/t20150114_44732.html',
    accessedAt: '2026-10-01',
    redistribution: 'unknown',
    license: '原网页保留权利；仅采用事实并独立编写摘要',
    permissionEvidence: '只采用事件与地点事实，未复制图文。',
  },
  {
    id: 'shouxian-fei',
    work: '寿县淝水之战古战场',
    creator: '寿县人民政府网站',
    edition: '网页版本，2026-10-01 核对',
    url: 'https://www.shouxian.gov.cn/lyzn/y/7847321.html',
    accessedAt: '2026-10-01',
    redistribution: 'unknown',
    license: '原网页保留权利；仅采用事实并独立编写摘要',
    permissionEvidence: '只采用战场方位事实，未复制图文。',
  },
  {
    id: 'unesco-yungang',
    work: 'Yungang Grottoes',
    creator: 'UNESCO World Heritage Centre',
    edition: '网页版本，2026-10-01 核对',
    url: 'https://whc.unesco.org/en/list/1039/',
    accessedAt: '2026-10-01',
    redistribution: 'unknown',
    license: '简介标注 CC BY-SA IGO 3.0；本项目仅摘取年代与位置事实',
    permissionEvidence: '只摘取年代与位置事实，未转载简介文本。',
  },
  {
    id: 'unesco-longmen',
    work: 'Longmen Grottoes',
    creator: 'UNESCO World Heritage Centre',
    edition: '网页版本，2026-10-01 核对',
    url: 'https://whc.unesco.org/en/list/1003/',
    accessedAt: '2026-10-01',
    redistribution: 'unknown',
    license: '简介标注 CC BY-SA IGO 3.0；本项目仅摘取位置事实',
    permissionEvidence: '只摘取位置事实，未转载简介文本。',
  },
  {
    id: 'idp-diamond',
    work: 'The Diamond Sutra',
    creator: 'International Dunhuang Programme, British Library',
    edition: '网页版本，2026-10-01 核对',
    url: 'https://idp.bl.uk/blog/the-diamond-sutra/',
    accessedAt: '2026-10-01',
    redistribution: 'unknown',
    license: '原网页保留权利；仅采用事实并独立编写摘要',
    permissionEvidence: '只采用刊记年代事实，未使用其图像。',
  },
];

export const sourceById = new Map(SOURCES.map((s) => [s.id, s]));
