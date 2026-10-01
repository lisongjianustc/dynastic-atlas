import {
  CHANGE_YEARS, EVENT_BUCKETS, EVENT_YEARS, INTERVALS, RANGE,
  TRANSITIONS, activeSegmentsAt, clampYear, eventsAtYear, intervalIndexAt, nextEventYear,
  prevEventYear, segmentsOfPolity, stateAt,
} from '../../src/data/state';
import { POLITIES, SEGMENTS } from '../../src/data/atlas';
import { inRing } from '../fixtures/geo';

/**
 * 状态机。
 *
 * 这是整个应用的正确性地基：**游标连续，状态离散**（DESIGN.md §1）。
 * 它成立的前提是区间表严丝合缝地铺满视野 —— 有一个缝，滑动时就会出现
 * 「哪一年都不属于」的空白，而界面上不会报错，只会静默地少画一块。
 */

describe('状态区间铺满视野', () => {
  it('从视野起点开始，到视野终点结束', () => {
    expect(INTERVALS[0].from).toBe(RANGE.from);
    expect(INTERVALS[INTERVALS.length - 1].to).toBe(RANGE.to);
  });

  it('相邻区间首尾相接，没有缝也没有重叠', () => {
    const gaps: string[] = [];
    for (let i = 1; i < INTERVALS.length; i++) {
      if (INTERVALS[i].from !== INTERVALS[i - 1].to) {
        gaps.push(`${INTERVALS[i - 1].from}-${INTERVALS[i - 1].to} → ${INTERVALS[i].from}-${INTERVALS[i].to}`);
      }
    }
    expect(gaps, `区间不连续：\n${gaps.join('\n')}`).toEqual([]);
  });

  it('每个区间都是非空的', () => {
    const bad = INTERVALS.filter((iv) => iv.to <= iv.from);
    expect(bad).toEqual([]);
  });

  it('区间边界恰好是所有疆域段起止年份', () => {
    const marks = new Set<number>([RANGE.from, RANGE.to]);
    for (const s of SEGMENTS) {
      if (s.from > RANGE.from && s.from < RANGE.to) marks.add(s.from);
      if (s.to > RANGE.from && s.to < RANGE.to) marks.add(s.to);
    }
    expect(new Set(INTERVALS.map((iv) => iv.from))).toEqual(new Set([...marks].filter((m) => m < RANGE.to)));
  });
});

describe('intervalIndexAt 二分查找', () => {
  const linear = (year: number) => {
    let found = 0;
    for (let i = 0; i < INTERVALS.length; i++) if (INTERVALS[i].from <= year) found = i;
    return found;
  };

  it('与线性扫描在每一个年份上一致', () => {
    const bad: string[] = [];
    for (let y = RANGE.from; y < RANGE.to; y++) {
      if (intervalIndexAt(y) !== linear(y)) bad.push(`${y}: 二分=${intervalIndexAt(y)} 线性=${linear(y)}`);
    }
    expect(bad, bad.slice(0, 5).join('\n')).toEqual([]);
  });

  it('区间左闭右开：起点归本区间，终点归下一区间', () => {
    const iv = INTERVALS[10];
    expect(INTERVALS[intervalIndexAt(iv.from)].from).toBe(iv.from);
    expect(INTERVALS[intervalIndexAt(iv.to)].from).toBe(iv.to);
  });

  it('超出视野的年份会被夹住，不越界', () => {
    expect(intervalIndexAt(-9999)).toBe(0);
    expect(intervalIndexAt(9999)).toBe(INTERVALS.length - 1);
  });
});

describe('activeSegmentsAt 与暴力筛选一致', () => {
  it('每个年份上都对得上', () => {
    const bad: string[] = [];
    for (let y = RANGE.from; y < RANGE.to; y++) {
      const fast = activeSegmentsAt(y).map((s) => s.id).sort();
      const slow = SEGMENTS.filter((s) => s.from <= y && s.to > y).map((s) => s.id).sort();
      if (fast.join() !== slow.join()) bad.push(`${y}: 快=${fast.join()} 慢=${slow.join()}`);
    }
    expect(bad, bad.slice(0, 3).join('\n')).toEqual([]);
  });

  it('返回的每一段在该年确实有效', () => {
    for (const y of [200, 383, 410, 540, 750, 880, 959]) {
      for (const s of activeSegmentsAt(y)) {
        expect(s.from, `${s.id} 在 ${y} 年不该有效`).toBeLessThanOrEqual(y);
        expect(s.to).toBeGreaterThan(y);
      }
    }
  });

  it('同一政权在同一时刻可以有多段（直辖 + 军事控制）', () => {
    const at750 = activeSegmentsAt(750).filter((s) => s.polityId === 'tang');
    expect(at750.length).toBeGreaterThan(1);
    expect(new Set(at750.map((s) => s.control)).size).toBeGreaterThan(1);
  });
});

describe('clampYear', () => {
  it('夹在视野之内，且右端是开区间', () => {
    expect(clampYear(-999)).toBe(RANGE.from);
    expect(clampYear(9999)).toBe(RANGE.to - 1);
    expect(clampYear(618)).toBe(618);
  });

  it('取整', () => {
    expect(clampYear(618.4)).toBe(618);
    expect(clampYear(618.6)).toBe(619);
  });
});

describe('TRANSITIONS 描述的是真实差异', () => {
  const polityIdsOf = (ids: string[]) =>
    [...new Set(ids.map((id) => SEGMENTS.find((s) => s.id === id)!.polityId))].sort();

  it('增删政权与相邻区间的实际差异一致', () => {
    const bad: string[] = [];
    for (let i = 1; i < TRANSITIONS.length; i++) {
      const before = polityIdsOf(INTERVALS[i - 1].segmentIds);
      const after = polityIdsOf(INTERVALS[i].segmentIds);
      const added = after.filter((x) => !before.includes(x)).sort();
      const removed = before.filter((x) => !after.includes(x)).sort();
      const t = TRANSITIONS[i];
      if (added.join() !== [...t.addedPolityIds].sort().join() || removed.join() !== [...t.removedPolityIds].sort().join()) {
        bad.push(`${t.year}: 实增[${added}] 记增[${t.addedPolityIds}] 实减[${removed}] 记减[${t.removedPolityIds}]`);
      }
    }
    expect(bad, bad.slice(0, 3).join('\n')).toEqual([]);
  });

  it('每个区间都有对应的一条转换说明', () => {
    expect(TRANSITIONS).toHaveLength(INTERVALS.length);
  });

  it('每条都有非空的中文标签', () => {
    for (const t of TRANSITIONS) {
      expect(t.label.length, `${t.year} 的标签为空`).toBeGreaterThan(2);
      expect(t.label).toContain('年');
    }
  });

  it('CHANGE_YEARS 是真正发生政权增删的年份', () => {
    expect(CHANGE_YEARS.every((y) => TRANSITIONS.find((t) => t.year === y))).toBe(true);
    expect(CHANGE_YEARS.length).toBeGreaterThan(0);
    expect(CHANGE_YEARS.length).toBeLessThan(INTERVALS.length);
  });
});

describe('事件年份导航', () => {
  it('EVENT_YEARS 去重且升序', () => {
    expect([...EVENT_YEARS].sort((a, b) => a - b)).toEqual(EVENT_YEARS);
    expect(new Set(EVENT_YEARS).size).toBe(EVENT_YEARS.length);
  });

  it('前后的年份查得到', () => {
    const y = EVENT_YEARS[Math.floor(EVENT_YEARS.length / 2)];
    expect(prevEventYear(y)).toBeLessThan(y);
    expect(nextEventYear(y)).toBeGreaterThan(y);
  });

  it('最早之前没有更早的纪事，最晚之后没有更晚的', () => {
    expect(prevEventYear(EVENT_YEARS[0])).toBeNull();
    expect(nextEventYear(EVENT_YEARS[EVENT_YEARS.length - 1])).toBeNull();
  });

  it('查到的年份确实有事件', () => {
    const y = EVENT_YEARS[10];
    expect(eventsAtYear(y).length).toBeGreaterThan(0);
    expect(eventsAtYear(y).every((e) => e.y === y)).toBe(true);
  });

  it('事件密度分桶覆盖整个视野', () => {
    expect(EVENT_BUCKETS.length).toBeGreaterThan(0);
    const total = EVENT_BUCKETS.reduce((a, b) => a + b.count, 0);
    expect(total).toBeGreaterThan(0);
  });
});

describe('stateAt 是唯一真相来源', () => {
  it('与分别调用 activeSegmentsAt / eventsAtYear 一致', () => {
    for (const y of [200, 310, 410, 540, 750, 880]) {
      const st = stateAt(y);
      expect(st.year).toBe(y);
      expect(st.segments.map((s) => s.id)).toEqual(activeSegmentsAt(y).map((s) => s.id));
      expect(st.events.map((e) => e.id)).toEqual(eventsAtYear(y).map((e) => e.id));
    }
  });

  it('segmentsOfPolity 返回的都是该政权的段，且时间上不遗漏', () => {
    for (const p of POLITIES) {
      const segs = segmentsOfPolity(p.id);
      expect(segs.every((s) => s.polityId === p.id)).toBe(true);
      expect(segs.length).toBe(SEGMENTS.filter((s) => s.polityId === p.id).length);
    }
  });
});

describe('几何与时间的一致性', () => {
  it('每个政权在其实存期内至少有一年被画出来', () => {
    const missing: string[] = [];
    for (const p of POLITIES) {
      const segs = segmentsOfPolity(p.id);
      if (!segs.length) {
        missing.push(`${p.name}(${p.id}) 没有任何疆域段`);
        continue;
      }
      const covered = new Set<number>();
      for (const s of segs) for (let y = s.from; y < s.to; y++) covered.add(y);
      const overlap = [...covered].filter((y) => y >= p.from && y < p.to);
      if (!overlap.length) missing.push(`${p.name}(${p.id}) 的疆域段与实存期 ${p.from}-${p.to} 不相交`);
    }
    expect(missing, missing.join('\n')).toEqual([]);
  });

  it('每个疆域段的几何都落在底图视野内', () => {
    for (const s of SEGMENTS) {
      for (const [lon, lat] of s.geometry) {
        expect(lon, `${s.id} 经度越界`).toBeGreaterThan(50);
        expect(lon, `${s.id} 经度越界`).toBeLessThan(160);
        expect(lat, `${s.id} 纬度越界`).toBeGreaterThan(0);
        expect(lat, `${s.id} 纬度越界`).toBeLessThan(60);
      }
    }
  });

  it('取一个点就能说出它属于谁 —— 抽样验证几何真的被用上了', () => {
    // 洛阳在 230 年属魏
    const luoyang: [number, number] = [112.45, 34.62];
    const hits = activeSegmentsAt(230).filter((s) => inRing(luoyang, s.geometry));
    expect(hits.map((s) => s.polityId)).toContain('wei');
  });
});
