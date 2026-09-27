/**
 * 点落测试：把确定无疑的史地事实（某城在某年属于某政权）当作断言。
 * 比肉眼看图可靠得多 —— 能精确抓出「面画歪了 / 边界串了」。
 *
 *   npx esbuild tools/points.ts --bundle --platform=node --format=esm --outfile=/tmp/atlas-points.mjs && node /tmp/atlas-points.mjs
 */
import { POLITIES, SEGMENTS } from '../src/data/atlas';
import { activeSegmentsAt, yearLabel } from '../src/data/state';

type Pt = [number, number];

function inRing(pt: Pt, ring: Pt[]): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** 某点在某年落在哪些 (政权, 控制层级) 里 */
function locate(pt: Pt, year: number) {
  return activeSegmentsAt(year)
    .filter((s) => inRing(pt, s.geometry as Pt[]))
    .map((s) => `${s.polityId}:${s.control}`);
}

interface Case {
  at: Pt;
  year: number;
  city: string;
  /** 应当命中：'polityId' 或 'polityId:control' */
  expect: string[];
  /** 应当不命中 */
  reject?: string[];
  why: string;
}

const CASES: Case[] = [
  { at: [112.45, 34.62], year: 230, city: '洛阳', expect: ['wei:core'], why: '曹魏都洛阳' },
  { at: [108.94, 34.27], year: 230, city: '长安', expect: ['wei:core'], why: '曹魏据关中' },
  { at: [104.07, 30.67], year: 230, city: '成都', expect: ['shu:core'], why: '蜀汉都成都' },
  { at: [118.8, 32.06], year: 230, city: '建业', expect: ['wu:core'], why: '孙吴都建业' },
  { at: [113.26, 23.13], year: 230, city: '番禺', expect: ['wu:core'], why: '吴领交州' },
  { at: [105.85, 21.03], year: 230, city: '龙编', expect: ['wu:core'], why: '吴领交趾' },
  { at: [104.07, 30.67], year: 230, city: '成都', expect: [], reject: ['wei', 'wu'], why: '蜀地不属魏吴' },

  { at: [125.75, 39.03], year: 500, city: '平壤', expect: ['gaogouli:core'], why: '高句丽都平壤' },
  { at: [113.3, 40.1], year: 500, city: '平城', expect: ['wei_n:core'], why: '北魏旧都平城' },
  { at: [112.45, 34.62], year: 500, city: '洛阳', expect: ['wei_n:core'], why: '北魏 493 年迁洛' },
  { at: [118.8, 32.06], year: 500, city: '建康', expect: ['qi_s:core'], why: '南齐都建康' },
  { at: [113.26, 23.13], year: 500, city: '番禺', expect: ['qi_s:core'], why: '南齐领广州' },

  { at: [114.2, 36.33], year: 540, city: '邺', expect: ['wei_e:core'], why: '东魏都邺' },
  { at: [108.94, 34.27], year: 540, city: '长安', expect: ['wei_w:core'], why: '西魏都长安' },
  { at: [118.8, 32.06], year: 540, city: '建康', expect: ['liang:core'], why: '梁都建康' },
  { at: [108.94, 34.27], year: 540, city: '长安', expect: [], reject: ['wei_e', 'liang'], why: '长安不属东魏或梁' },
  { at: [112.19, 30.35], year: 540, city: '江陵', expect: ['liang:core'], why: '梁据荆州' },

  { at: [108.94, 34.27], year: 750, city: '长安', expect: ['tang:core'], why: '唐都长安' },
  { at: [104.07, 30.67], year: 750, city: '成都', expect: ['tang:core'], why: '唐剑南道' },
  { at: [113.26, 23.13], year: 750, city: '广州', expect: ['tang:core'], why: '唐岭南道' },
  { at: [94.66, 40.14], year: 750, city: '敦煌', expect: ['tang:core'], why: '唐沙州，755 年前尚在' },
  { at: [87.6, 43.8], year: 750, city: '北庭', expect: ['tang:military'], why: '唐北庭都护府' },
  { at: [91.13, 29.65], year: 750, city: '逻些', expect: ['tubo:core'], why: '吐蕃都逻些' },
  { at: [100.23, 25.6], year: 750, city: '太和城', expect: ['nanzhao:core'], why: '南诏都太和城' },
  { at: [129.2, 44.1], year: 750, city: '上京龙泉府', expect: ['bohai:tributary'], why: '渤海受唐册封' },
  { at: [102.8, 47.6], year: 750, city: '回鹘牙帐', expect: ['huihu:core'], why: '回鹘据漠北' },
  { at: [91.13, 29.65], year: 750, city: '逻些', expect: [], reject: ['tang'], why: '吐蕃不属唐' },

  // ── 十六国：这一段政权更迭最密，最容易画错 ──
  { at: [111.51, 36.09], year: 310, city: '平阳', expect: ['han_zhao:core'], why: '汉赵都城在山西南部' },
  { at: [108.94, 34.27], year: 310, city: '长安', expect: [], reject: ['han_zhao'], why: '316 年之前汉赵尚未取得关中' },
  { at: [108.94, 34.27], year: 320, city: '长安', expect: ['han_zhao:core'], why: '316 年克长安后关中属前赵' },
  { at: [104.07, 30.67], year: 330, city: '成都', expect: ['cheng_han:core'], why: '成汉据蜀，不属东晋' },
  { at: [104.07, 30.67], year: 330, city: '成都', expect: [], reject: ['jin_e'], why: '东晋此时无蜀' },
  { at: [102.63, 37.93], year: 360, city: '姑臧', expect: ['qian_liang:core'], why: '前凉据河西' },
  { at: [102.63, 37.93], year: 410, city: '姑臧', expect: ['bei_liang:core'], reject: ['qian_liang'], why: '前凉 376 年已亡，410 年为北凉' },
  { at: [108.94, 34.27], year: 400, city: '长安', expect: ['hou_qin:core'], why: '后秦据关中' },
  { at: [114.20, 36.33], year: 400, city: '邺', expect: ['hou_yan:core'], why: '后燕据河北' },
  { at: [120.85, 41.10], year: 420, city: '龙城', expect: ['bei_yan:core'], why: '北燕据辽西' },
  { at: [108.85, 37.60], year: 415, city: '统万城', expect: ['xia:core'], why: '赫连夏都城' },
  { at: [94.66, 40.14], year: 410, city: '敦煌', expect: ['xi_liang:core'], why: '西凉据敦煌' },
  { at: [94.66, 40.14], year: 430, city: '敦煌', expect: ['bei_liang:core'], reject: ['xi_liang'], why: '西凉 421 年亡，敦煌归北凉' },
  { at: [100.45, 38.93], year: 410, city: '张掖', expect: ['bei_liang:core'], why: '北凉都城' },
  { at: [100.23, 25.6], year: 750, city: '太和城', expect: [], reject: ['tang'], why: '南诏 750 年后已脱离唐' },
  { at: [125.75, 39.03], year: 750, city: '平壤', expect: [], reject: ['tang'], why: '安东都护府 676 年内徙，唐已不直辖平壤' },

  { at: [120.85, 41.1], year: 650, city: '营州', expect: ['tang:core'], why: '唐营州都督府' },
  { at: [125.75, 39.03], year: 670, city: '平壤', expect: ['tang:military'], why: '668–676 安东都护府治平壤' },
  { at: [94.66, 40.14], year: 800, city: '敦煌', expect: [], reject: ['tang'], why: '763 年后河西没于吐蕃' },
  { at: [94.66, 40.14], year: 800, city: '敦煌', expect: ['tubo:core'], why: '吐蕃据河西' },
];

let pass = 0;
const fails: string[] = [];

for (const c of CASES) {
  const hits = locate(c.at, c.year);
  const okExpect = c.expect.every((e) => hits.some((h) => h === e || h.startsWith(`${e}:`)));
  const okReject = (c.reject ?? []).every((r) => !hits.some((h) => h === r || h.startsWith(`${r}:`)));
  if (okExpect && okReject) {
    pass++;
  } else {
    const want = c.expect.length ? `应命中 ${c.expect.join('/')}` : '';
    const not = c.reject?.length ? `不应命中 ${c.reject.join('/')}` : '';
    fails.push(
      `✗ ${yearLabel(c.year)} ${c.city} [${c.at}] —— 实际落在 [${hits.join(', ') || '无'}]；${want} ${not}（${c.why}）`,
    );
  }
}

console.log(`点落测试：${pass}/${CASES.length} 通过`);
if (fails.length) console.log(fails.join('\n'));

// 政权层面：每个政权在其存续期内是否有段覆盖
const missing = POLITIES.filter((p) => !SEGMENTS.some((s) => s.polityId === p.id));
if (missing.length) console.log(`\n有政权定义但无疆域段：${missing.map((p) => p.name).join('、')}`);
