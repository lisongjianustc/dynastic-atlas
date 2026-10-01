import type { Place } from './types';
import type { RawPlace } from './governance';
import { normalizePlace } from './governance';

/**
 * 主要地点：州治、关隘、军镇。
 *
 * 坐标取自 CHGIS 的治所点数据体系（复核到 0.01° 级），
 * from/to 是该地在历史叙述中值得被看到的年代区间，不是建城/废弃年份。
 *
 * rank 1 是「任何时候都该看见」的要冲；rank 2 是小比例尺下先让位的次要地点。
 */
const RAW_PLACES: RawPlace[] = [
  // ── 都城与州治 ──
  { id: 'luoyang', name: '洛阳', kind: 'seat', at: [112.45, 34.62], from: 220, to: 960, rank: 1, sourceId: 'src-chgis', note: '汉魏、西晋、北魏、隋唐东都' },
  { id: 'changan', name: '长安', kind: 'seat', at: [108.94, 34.27], from: 220, to: 960, rank: 1, sourceId: 'src-chgis', note: '西魏、北周、隋、唐都城' },
  { id: 'jiankang', name: '建康', kind: 'seat', at: [118.80, 32.06], from: 220, to: 589, rank: 1, sourceId: 'src-chgis', note: '六朝都城' },
  { id: 'chengdu', name: '成都', kind: 'seat', at: [104.07, 30.67], from: 220, to: 960, rank: 1, sourceId: 'src-chgis' },
  { id: 'ye', name: '邺', kind: 'seat', at: [114.20, 36.33], from: 220, to: 580, rank: 1, sourceId: 'src-chgis', note: '曹魏、后赵、前燕、东魏、北齐都城' },
  { id: 'xuchang', name: '许昌', kind: 'seat', at: [113.85, 34.03], from: 220, to: 265, rank: 2, sourceId: 'src-chgis' },
  { id: 'xiangyang', name: '襄阳', kind: 'seat', at: [112.14, 32.02], from: 220, to: 960, rank: 1, sourceId: 'src-chgis', note: '南北对峙的锁钥' },
  { id: 'shouchun', name: '寿春', kind: 'seat', at: [116.78, 32.58], from: 220, to: 589, rank: 1, sourceId: 'src-chgis' },
  { id: 'hefei', name: '合肥', kind: 'seat', at: [117.23, 31.82], from: 220, to: 589, rank: 2, sourceId: 'src-chgis' },
  { id: 'jiangling', name: '江陵', kind: 'seat', at: [112.19, 30.35], from: 220, to: 960, rank: 1, sourceId: 'src-chgis' },
  { id: 'guangzhou', name: '番禺', kind: 'seat', at: [113.26, 23.13], from: 220, to: 960, rank: 2, sourceId: 'src-chgis', note: '南海贸易门户' },
  { id: 'longbian', name: '龙编', kind: 'seat', at: [105.85, 21.03], from: 220, to: 960, rank: 2, sourceId: 'src-chgis', note: '交州治所' },
  { id: 'xiangping', name: '襄平', kind: 'seat', at: [123.17, 41.27], from: 220, to: 668, rank: 2, sourceId: 'src-chgis', note: '辽东治所' },
  { id: 'ji', name: '蓟', kind: 'seat', at: [116.40, 39.90], from: 220, to: 960, rank: 1, sourceId: 'src-chgis', note: '幽州治所，中原的东北门户' },
  { id: 'jinyang', name: '晋阳', kind: 'seat', at: [112.55, 37.87], from: 220, to: 960, rank: 1, sourceId: 'src-chgis' },
  { id: 'pingcheng', name: '平城', kind: 'seat', at: [113.30, 40.10], from: 220, to: 534, rank: 1, sourceId: 'src-chgis', note: '北魏旧都' },
  { id: 'guzang', name: '姑臧', kind: 'seat', at: [102.63, 37.93], from: 220, to: 763, rank: 2, sourceId: 'src-chgis', note: '凉州治所' },
  { id: 'dunhuang', name: '敦煌', kind: 'seat', at: [94.66, 40.14], from: 220, to: 850, rank: 1, sourceId: 'src-chgis', note: '河西西端的咽喉' },
  { id: 'jincheng', name: '金城', kind: 'seat', at: [103.79, 36.06], from: 220, to: 763, rank: 2, sourceId: 'src-chgis', note: '兰州，陇右与河西的接点' },
  { id: 'hanzhong', name: '汉中', kind: 'seat', at: [107.03, 33.07], from: 220, to: 960, rank: 1, sourceId: 'src-chgis' },
  { id: 'jiangzhou', name: '江州', kind: 'seat', at: [106.55, 29.56], from: 220, to: 960, rank: 2, sourceId: 'src-chgis', note: '重庆' },
  { id: 'kuaiji', name: '会稽', kind: 'seat', at: [120.58, 30.00], from: 220, to: 589, rank: 2, sourceId: 'src-chgis' },
  { id: 'changsha', name: '长沙', kind: 'seat', at: [112.94, 28.23], from: 220, to: 960, rank: 2, sourceId: 'src-chgis' },
  { id: 'yuzhang', name: '豫章', kind: 'seat', at: [115.89, 28.68], from: 220, to: 960, rank: 2, sourceId: 'src-chgis', note: '南昌' },
  { id: 'yangzhou', name: '扬州', kind: 'seat', at: [119.42, 32.39], from: 220, to: 960, rank: 1, sourceId: 'src-chgis', note: '运河与长江的交汇' },
  { id: 'pengcheng', name: '彭城', kind: 'seat', at: [117.28, 34.26], from: 220, to: 960, rank: 2, sourceId: 'src-chgis', note: '徐州' },
  { id: 'yunzhong', name: '云中', kind: 'seat', at: [111.65, 40.28], from: 220, to: 534, rank: 2, sourceId: 'src-chgis' },
  { id: 'shengle', name: '盛乐', kind: 'seat', at: [111.75, 40.42], from: 258, to: 494, rank: 2, sourceId: 'src-chgis', note: '拓跋鲜卑旧都' },
  { id: 'tongwan', name: '统万城', kind: 'seat', at: [108.85, 37.60], from: 407, to: 431, rank: 1, sourceId: 'src-chgis', note: '赫连夏都城' },
  { id: 'pyongyang', name: '平壤', kind: 'seat', at: [125.75, 39.03], from: 220, to: 668, rank: 1, sourceId: 'src-chgis', note: '高句丽都城' },
  { id: 'luoxie', name: '逻些', kind: 'seat', at: [91.13, 29.65], from: 629, to: 877, rank: 1, sourceId: 'src-chgis', note: '吐蕃都城' },
  { id: 'taihe', name: '太和城', kind: 'seat', at: [100.20, 25.60], from: 738, to: 902, rank: 2, sourceId: 'src-chgis', note: '南诏都城' },
  { id: 'xiangguo', name: '襄国', kind: 'seat', at: [114.50, 36.85], from: 319, to: 351, rank: 2, sourceId: 'src-chgis', note: '后赵都城' },
  { id: 'fuqi', name: '伏俟城', kind: 'seat', at: [100.10, 36.90], from: 285, to: 663, rank: 2, sourceId: 'src-tan-4', note: '吐谷浑王城' },
  { id: 'yudujinshan', name: '于都斤山', kind: 'seat', at: [102.50, 47.50], from: 552, to: 630, rank: 2, sourceId: 'src-tan-5', note: '东突厥牙帐' },
  { id: 'ordubaliq', name: '斡耳朵八里', kind: 'seat', at: [102.80, 47.60], from: 744, to: 840, rank: 2, sourceId: 'src-tan-5', note: '回鹘牙帐' },
  { id: 'longquan', name: '上京龙泉府', kind: 'seat', at: [129.20, 44.10], from: 698, to: 926, rank: 2, sourceId: 'src-chgis', note: '渤海都城' },

  // ── 关隘 ──
  { id: 'tongguan', name: '潼关', kind: 'pass', at: [110.25, 34.55], from: 220, to: 960, rank: 1, sourceId: 'src-chgis', note: '关中的东大门' },
  { id: 'hangu', name: '函谷关', kind: 'pass', at: [110.90, 34.62], from: 220, to: 534, rank: 2, sourceId: 'src-chgis' },
  { id: 'wuguan', name: '武关', kind: 'pass', at: [110.55, 33.62], from: 220, to: 960, rank: 2, sourceId: 'src-chgis', note: '关中通往南阳、襄阳' },
  { id: 'sansiguan', name: '大散关', kind: 'pass', at: [106.85, 34.30], from: 220, to: 960, rank: 2, sourceId: 'src-chgis', note: '关中通往汉中' },
  { id: 'xiaoguan', name: '萧关', kind: 'pass', at: [106.10, 36.20], from: 220, to: 960, rank: 2, sourceId: 'src-chgis', note: '关中通往陇西' },
  { id: 'jianmen', name: '剑门关', kind: 'pass', at: [105.58, 32.28], from: 220, to: 960, rank: 1, sourceId: 'src-chgis', note: '入蜀的北口' },
  { id: 'hulao', name: '虎牢关', kind: 'pass', at: [113.20, 34.85], from: 220, to: 589, rank: 2, sourceId: 'src-chgis', note: '洛阳的东面屏障' },
  { id: 'yumenguan', name: '玉门关', kind: 'pass', at: [93.87, 40.36], from: 220, to: 800, rank: 2, sourceId: 'src-chgis', note: '西域门户' },
  { id: 'yangguan', name: '阳关', kind: 'pass', at: [94.10, 39.90], from: 220, to: 800, rank: 2, sourceId: 'src-chgis', note: '丝路南道' },
  { id: 'yanmen', name: '雁门关', kind: 'pass', at: [112.90, 39.20], from: 220, to: 960, rank: 1, sourceId: 'src-chgis', note: '太原以北的屏障' },
  { id: 'juyong', name: '居庸关', kind: 'pass', at: [116.10, 40.29], from: 220, to: 960, rank: 2, sourceId: 'src-chgis', note: '太行八陉之军都陉' },
  { id: 'puban', name: '蒲坂', kind: 'pass', at: [110.32, 34.83], from: 220, to: 589, rank: 2, sourceId: 'src-chgis', note: '黄河渡口，关中对山西' },
  { id: 'caishi', name: '采石矶', kind: 'pass', at: [118.50, 31.72], from: 220, to: 589, rank: 2, sourceId: 'src-chgis', note: '渡江要津' },
  { id: 'ruxu', name: '濡须口', kind: 'pass', at: [117.80, 31.60], from: 220, to: 280, rank: 2, sourceId: 'src-chgis', note: '魏吴相持的水口' },
  { id: 'qutang', name: '瞿塘关', kind: 'pass', at: [109.55, 31.03], from: 220, to: 960, rank: 2, sourceId: 'src-chgis', note: '三峡西口' },
  { id: 'meiguan', name: '梅关', kind: 'pass', at: [114.30, 25.30], from: 220, to: 960, rank: 2, sourceId: 'src-chgis', note: '岭南与江西之间' },

  // ── 军镇与边州 ──
  { id: 'anbei', name: '安北都护府', kind: 'garrison', at: [102.80, 47.60], from: 646, to: 682, rank: 2, sourceId: 'src-tan-5', note: '羁縻漠北' },
  { id: 'beiting', name: '北庭都护府', kind: 'garrison', at: [89.15, 44.02], from: 640, to: 790, rank: 1, sourceId: 'src-tan-5', note: '天山北路的支点' },
  { id: 'kucha', name: '龟兹', kind: 'garrison', at: [82.96, 41.72], from: 640, to: 790, rank: 1, sourceId: 'src-tan-5', note: '安西都护府治所' },
  { id: 'kashgar', name: '疏勒', kind: 'garrison', at: [75.99, 39.47], from: 640, to: 790, rank: 2, sourceId: 'src-tan-5', note: '安西四镇之一' },
  { id: 'hotan', name: '于阗', kind: 'garrison', at: [79.93, 37.10], from: 640, to: 790, rank: 2, sourceId: 'src-tan-5', note: '安西四镇之一' },
  { id: 'suyab', name: '碎叶', kind: 'garrison', at: [75.20, 42.80], from: 640, to: 790, rank: 2, sourceId: 'src-tan-5', note: '安西四镇之一，最西的军镇' },
  { id: 'huaisu', name: '怀朔镇', kind: 'garrison', at: [110.10, 41.20], from: 386, to: 534, rank: 2, sourceId: 'src-tan-4', note: '北魏六镇之一' },
  { id: 'wuchuan', name: '武川镇', kind: 'garrison', at: [111.20, 41.10], from: 386, to: 534, rank: 2, sourceId: 'src-tan-4', note: '北魏六镇之一' },
  { id: 'woye', name: '沃野镇', kind: 'garrison', at: [107.50, 40.80], from: 386, to: 534, rank: 2, sourceId: 'src-tan-4', note: '北魏六镇之一，六镇之乱始发地' },
];

/** 十六国时期新增的政权中枢 */
RAW_PLACES.push(
  { id: 'pingyang', name: '平阳', kind: 'seat', at: [111.51, 36.09], from: 304, to: 329, rank: 2, sourceId: 'src-tan-4', note: '汉赵都城' },
  { id: 'zhongshan', name: '中山', kind: 'seat', at: [114.87, 38.52], from: 384, to: 409, rank: 2, sourceId: 'src-tan-4', note: '后燕都城' },
  { id: 'longcheng', name: '龙城', kind: 'seat', at: [120.85, 41.10], from: 337, to: 436, rank: 2, sourceId: 'src-tan-4', note: '前燕、北燕都城' },
  { id: 'ledu', name: '乐都', kind: 'seat', at: [102.40, 36.48], from: 397, to: 414, rank: 2, sourceId: 'src-tan-4', note: '南凉都城' },
  { id: 'guanggu', name: '广固', kind: 'seat', at: [118.48, 36.70], from: 398, to: 410, rank: 2, sourceId: 'src-tan-4', note: '南燕都城' },
);

export const PLACES: Place[] = RAW_PLACES.map(normalizePlace);
