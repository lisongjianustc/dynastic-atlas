import {
  certainValidity, coverageAt, expandValidity, normalizePlace, normalizeSegment,
  rangeValidity, yearLabel, yearValidity,
} from '../../src/data/governance';
import { RANGE } from '../../src/data/state';
import { COVERAGE } from '../../src/data/governance';

/**
 * 治理层：时间区间、覆盖声明、归一化。
 *
 * 核心约定 —— **validity 是权威值，整数 from/to 由它机械展开**。
 * 地图查询要整数，史料给的是区间；让区间做权威、整数做派生，才不会两处打架。
 */

describe('yearLabel', () => {
  it('公元后', () => expect(yearLabel(618)).toBe('618年'));
  it('公元前', () => expect(yearLabel(-221)).toBe('前221年'));
  it('零年按公元处理', () => expect(yearLabel(0)).toBe('0年'));
});

describe('yearValidity / expandValidity', () => {
  it('精确到年时两端范围退化为一个点', () => {
    const v = yearValidity(220, 266);
    expect(v.start).toEqual({ earliest: 220, latest: 220 });
    expect(v.endExclusive).toEqual({ earliest: 266, latest: 266 });
    expect(v.precision).toBe('year');
    expect(v.label).toBe('220年—266年');
  });

  it('展开取**可能范围的并集** —— 宁可多画一格也不漏掉', () => {
    expect(expandValidity(rangeValidity([220, 221], [265, 267], '曹魏'))).toEqual({ from: 220, to: 267 });
  });

  it('确定成立的区间更窄，UI 用它标出不确定的边缘', () => {
    expect(certainValidity(rangeValidity([220, 221], [265, 267], '曹魏'))).toEqual({ from: 221, to: 265 });
  });

  it('史料分歧：曹魏亡于 265 还是 266', () => {
    const v = rangeValidity([220, 220], [265, 267], '220—265/266年（纪年口径待细化）');
    expect(expandValidity(v)).toEqual({ from: 220, to: 267 });
    expect(certainValidity(v)).toEqual({ from: 220, to: 265 });
    expect(v.precision).toBe('range');
  });
});

describe('normalizeSegment', () => {
  const raw = {
    id: 'x-01',
    polityId: 'p',
    from: 220,
    to: 266,
    control: 'core' as const,
    borderPrecision: 1 as const,
    confidence: 'medium' as const,
    sourceId: 's',
    geometry: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ] as [number, number][],
  };

  it('整数区间由 validity 展开，而不是照抄手写的 from/to', () => {
    const s = normalizeSegment({ ...raw, validity: rangeValidity([210, 220], [266, 280], '测试') });
    expect(s.from).toBe(210);
    expect(s.to).toBe(280);
  });

  it('来源自动转成至少一条 evidence —— 无出处不入库', () => {
    expect(normalizeSegment(raw).evidence).toEqual([{ sourceId: 's', note: undefined }]);
  });

  it('每条记录默认都是未核验', () => {
    expect(normalizeSegment(raw).review.status).toBe('pending');
  });

  it('默认是按区间成立，不是快照', () => {
    expect(normalizeSegment(raw).temporalSupport).toBe('interval');
  });

  it('旧的三档边界精度映射到可自解释的三档', () => {
    expect(normalizeSegment({ ...raw, borderPrecision: 1 }).spatialPrecision).toBe('approximate');
    expect(normalizeSegment({ ...raw, borderPrecision: 2 }).spatialPrecision).toBe('specified');
    expect(normalizeSegment({ ...raw, borderPrecision: 3 }).spatialPrecision).toBe('specified');
  });

  it('没登记的编制方法落到「人工绘制示意」并给出误差说明', () => {
    const s = normalizeSegment({ ...raw, id: '没登记过的-id' });
    expect(s.compilation.method).toBe('人工绘制示意');
    expect(s.compilation.errorNote).toBeTruthy();
  });

  it('登记过的编制方法会被采用', () => {
    expect(normalizeSegment({ ...raw, id: 'tubo-01' }).compilation.method).toContain('Natural Earth');
  });
});

describe('normalizePlace', () => {
  const raw = {
    id: 'pl', name: '某地', kind: 'seat' as const, at: [110, 35] as [number, number],
    from: 200, to: 300, rank: 1 as const, sourceId: 's',
  };

  it('没给精度时保守地标为近似', () => {
    expect(normalizePlace(raw).spatialPrecision).toBe('approximate');
  });

  it('给了精度就用给的', () => {
    expect(normalizePlace({ ...raw, precision: 'specified' }).spatialPrecision).toBe('specified');
  });
});

describe('覆盖声明', () => {
  it('缺口清单非空 —— 这个项目还没有完成', () => {
    expect(COVERAGE.length).toBeGreaterThan(0);
  });

  it('存在未被历史专业审定的声明', () => {
    const c = COVERAGE.find((x) => x.id === 'no-human-review');
    expect(c?.status).toBe('missing');
  });

  it('许可红线声明为已核验', () => {
    expect(COVERAGE.find((x) => x.id === 'licensing')?.status).toBe('verified');
  });

  it('每条缺口都写清了原因，不是空话', () => {
    for (const c of COVERAGE) {
      expect(c.reason.length, `${c.id} 的 reason 太短`).toBeGreaterThan(12);
    }
  });

  it('按年份查询只返回覆盖该年的条目', () => {
    for (const c of coverageAt(410)) {
      expect(c.startYear).toBeLessThanOrEqual(410);
      expect(c.endYear).toBeGreaterThanOrEqual(410);
    }
  });

  it('跨越全视野的出处类缺口在任何年份都出现', () => {
    for (const y of [RANGE.from, 500, RANGE.to]) {
      expect(coverageAt(y).some((c) => c.topic === 'provenance')).toBe(true);
    }
  });

  it('缺口涉及的年份落在视野之内', () => {
    for (const c of COVERAGE) {
      expect(c.startYear, `${c.id} 起点越界`).toBeGreaterThanOrEqual(-1000);
      expect(c.endYear, `${c.id} 终点越界`).toBeLessThanOrEqual(2100);
    }
  });
});
