import { activeSegmentsAt, yearLabel } from '../../src/data/state';

/**
 * 点落断言 —— 把史地常识写成测试。
 *
 * 这是本项目最有价值的一组测试：肉眼看图看不出「汉中属魏还是属蜀」，
 * 但一条射线法断言可以。历史上它抓出过九处真实的画歪：
 *   - 东晋在 330 年不该有巴蜀（那是成汉的）
 *   - 后燕的南界把都城邺关在外面 0.04°
 *   - 北魏前期漏了 396 年就取得的并州
 *   - 魏走汉水、吴走长江，江汉平原夹出空缝，江陵两边都不认
 */

type Pt = [number, number];

interface PointCase {
  at: Pt;
  year: number;
  city: string;
  expect: string[];
  reject?: string[];
  why: string;
}

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

/** 某点在某年落在哪些 (政权:控制层级) 里 */
function locate(pt: Pt, year: number): string[] {
  return activeSegmentsAt(year)
    .filter((s) => inRing(pt, s.geometry as Pt[]))
    .map((s) => `${s.polityId}:${s.control}`);
}

const hit = (hits: string[], want: string) => hits.some((h) => h === want || h.startsWith(`${want}:`));

const CASES: PointCase[] = [
  { at: [112.45, 34.62], year: 230, city: '洛阳', expect: ['wei:core'], why: '曹魏都洛阳' },
  { at: [108.94, 34.27], year: 230, city: '长安', expect: ['wei:core'], why: '曹魏据关中' },
  { at: [104.07, 30.67], year: 230, city: '成都', expect: ['shu:core'], why: '蜀汉都成都' },
  { at: [118.8, 32.06], year: 230, city: '建业', expect: ['wu:core'], why: '孙吴都建业' },
  { at: [113.26, 23.13], year: 230, city: '番禺', expect: ['wu:core'], why: '吴领交州' },
  { at: [105.85, 21.03], year: 230, city: '龙编', expect: ['wu:core'], why: '吴领交趾' },
  { at: [104.07, 30.67], year: 230, city: '成都', expect: [], reject: ['wei', 'wu'], why: '蜀地不属魏吴' },

  // 内陆边界改为贴合真实山川之后新增的断言 —— 这些点最容易被「一条直线」画错
  { at: [107.03, 33.07], year: 230, city: '汉中', expect: ['shu:core'], reject: ['wei'], why: '219 年后汉中属蜀，魏蜀以秦岭为界' },
  { at: [103.79, 36.06], year: 230, city: '金城', expect: ['wei:core'], why: '曹魏领陇西、金城' },
  { at: [116.78, 32.58], year: 230, city: '寿春', expect: ['wei:core'], reject: ['wu'], why: '曹魏据淮南，吴之北界是长江' },
  { at: [117.23, 31.82], year: 230, city: '合肥', expect: ['wei:core'], reject: ['wu'], why: '合肥在长江以北，属魏' },
  { at: [112.19, 30.35], year: 230, city: '江陵', expect: ['wu:core'], reject: ['wei'], why: '江陵在长江北岸，但 219 年后属吴 —— 早先魏走汉水、吴走长江，这里夹出过一道空缝' },
  { at: [112.14, 32.02], year: 230, city: '襄阳', expect: ['wei:core'], reject: ['wu'], why: '襄阳属魏，与江陵隔荆山相望' },

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
  { at: [112.55, 37.87], year: 410, city: '晋阳', expect: ['wei_n:core'], why: '396 年北魏取并州，太原属魏' },
  { at: [111.51, 36.09], year: 410, city: '平阳', expect: ['wei_n:core'], why: '晋南亦入北魏' },
  { at: [100.23, 25.6], year: 750, city: '太和城', expect: [], reject: ['tang'], why: '南诏 750 年后已脱离唐' },
  { at: [125.75, 39.03], year: 750, city: '平壤', expect: [], reject: ['tang'], why: '安东都护府 676 年内徙，唐已不直辖平壤' },

  { at: [120.85, 41.1], year: 650, city: '营州', expect: ['tang:core'], why: '唐营州都督府' },
  { at: [125.75, 39.03], year: 670, city: '平壤', expect: ['tang:military'], why: '668–676 安东都护府治平壤' },
  { at: [94.66, 40.14], year: 800, city: '敦煌', expect: [], reject: ['tang'], why: '763 年后河西没于吐蕃' },
  { at: [94.66, 40.14], year: 800, city: '敦煌', expect: ['tubo:core'], why: '吐蕃据河西' },
  // ── 十六国这 9 个政权改用真实地理参照之后新增的断言 ──
  // 骨架：黄河中段（山西—陕西界）、太行中线、河西走廊（祁连北麓—北山）
  { at: [111.51, 36.09], year: 310, city: '平阳', expect: ['han_zhao:core'], why: '汉赵前期都平阳，据汾河谷地南段' },
  { at: [112.55, 37.87], year: 310, city: '晋阳', expect: [], reject: ['han_zhao'], why: '304–316 年晋阳在刘琨手中，不属汉赵' },
  { at: [112.55, 37.87], year: 320, city: '晋阳', expect: ['han_zhao:core'], why: '316 年汉赵取晋阳，并州全境入版图' },
  { at: [108.94, 34.27], year: 320, city: '长安', expect: ['han_zhao:core'], why: '汉赵后期据关中' },
  { at: [112.45, 34.62], year: 320, city: '洛阳', expect: ['han_zhao:core'], why: '汉赵 311 年取洛阳，325 年前尚在' },

  { at: [102.63, 37.93], year: 350, city: '姑臧', expect: ['qian_liang:core'], why: '前凉都姑臧，据河西走廊' },
  { at: [100.45, 38.93], year: 350, city: '张掖', expect: ['qian_liang:core'], why: '前凉据张掖' },
  { at: [94.66, 40.14], year: 350, city: '敦煌', expect: ['qian_liang:core'], why: '前凉据敦煌' },
  { at: [103.79, 36.06], year: 350, city: '金城', expect: ['qian_liang:core'], why: '前凉东界至陇西金城' },

  { at: [102.63, 37.93], year: 395, city: '姑臧', expect: ['hou_liang:core'], why: '后凉承前凉故地' },
  { at: [94.66, 40.14], year: 395, city: '敦煌', expect: ['hou_liang:core'], why: '后凉据敦煌' },

  { at: [98.51, 39.74], year: 410, city: '酒泉', expect: ['xi_liang:core'], why: '西凉据酒泉' },
  { at: [100.45, 38.93], year: 410, city: '张掖', expect: ['bei_liang:core'], reject: ['xi_liang'], why: '410 年张掖属北凉，西凉止于酒泉以西' },
  { at: [102.63, 37.93], year: 410, city: '姑臧', expect: ['bei_liang:core'], why: '沮渠蒙逊 410 年取姑臧' },
  { at: [102.63, 37.93], year: 430, city: '姑臧', expect: ['bei_liang:core'], why: '北凉后期据河西全段' },

  { at: [102.40, 36.48], year: 410, city: '乐都', expect: ['nan_liang:core'], why: '南凉都乐都，据湟水流域' },
  { at: [102.63, 37.93], year: 410, city: '姑臧', expect: [], reject: ['nan_liang'], why: '南凉不越祁连山到走廊' },
  { at: [104.10, 35.85], year: 410, city: '苑川', expect: ['xi_qin:core'], why: '西秦据陇西苑川' },
  { at: [103.21, 35.60], year: 410, city: '枹罕', expect: ['xi_qin:core'], why: '西秦据枹罕' },

  { at: [114.87, 38.52], year: 400, city: '中山', expect: ['hou_yan:core'], why: '后燕都中山' },
  { at: [114.20, 36.33], year: 400, city: '邺', expect: ['hou_yan:core'], reject: ['nan_yan'], why: '邺在太行以东、黄河以北，属后燕' },
  { at: [120.85, 41.10], year: 400, city: '龙城', expect: ['hou_yan:core'], why: '后燕据辽西龙城，407 年前' },
  { at: [118.48, 36.70], year: 405, city: '广固', expect: ['nan_yan:core'], why: '南燕都广固，据山东' },
  { at: [117.13, 36.19], year: 405, city: '泰山', expect: ['nan_yan:core'], why: '泰山在南燕境内' },
  { at: [114.87, 38.52], year: 405, city: '中山', expect: [], reject: ['nan_yan'], why: '南燕不越黄河到河北' },

];

describe('点落断言', () => {
  it('用例数量与史地覆盖面对得上', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(50);
  });

  it.each(CASES)('$year年 $city —— $why', (c) => {
    const hits = locate(c.at, c.year);
    for (const e of c.expect) {
      expect(hit(hits, e), `${yearLabel(c.year)} ${c.city} 应命中 ${e}，实际落在 [${hits.join(', ') || '无'}]`).toBe(true);
    }
    for (const r of c.reject ?? []) {
      expect(hit(hits, r), `${yearLabel(c.year)} ${c.city} 不应命中 ${r}，实际落在 [${hits.join(', ') || '无'}]`).toBe(false);
    }
  });
});
