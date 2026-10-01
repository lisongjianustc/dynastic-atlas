import { EVENTS, POLITIES, SEGMENTS } from '../../src/data/atlas';
import { PLACES } from '../../src/data/places';
import { SOURCES } from '../../src/data/sources';
import { RANGE, activeSegmentsAt, eventsAtYear } from '../../src/data/state';
import { inRing } from '../fixtures/geo';

/**
 * 数据集层面的不变式。
 *
 * 这些和 validate.ts 的分工：validate 管「记录自身是否自洽」，
 * 这里管「记录之间、记录与整体是否自洽」，以及一些只能跨表才能查的东西
 * （比如地点是否真的落在某个政权的面里）。
 */

describe('标识与引用完整性', () => {
  it('政权 id 唯一', () => {
    const ids = POLITIES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('疆域段 id 唯一', () => {
    const ids = SEGMENTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('事件 id 唯一', () => {
    const ids = EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('地点 id 唯一', () => {
    const ids = PLACES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('来源 id 唯一', () => {
    const ids = SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('每条记录引用的来源都已登记', () => {
    const known = new Set(SOURCES.map((s) => s.id));
    const bad = [
      ...SEGMENTS.flatMap((s) => s.evidence.map((e) => [`segment ${s.id}`, e.sourceId])),
      ...EVENTS.flatMap((e) => e.evidence.map((v) => [`event ${e.id}`, v.sourceId])),
      ...PLACES.flatMap((p) => p.evidence.map((v) => [`place ${p.id}`, v.sourceId])),
    ].filter(([, id]) => !known.has(id!));
    expect(bad, bad.map((x) => x.join(' → ')).join('\n')).toEqual([]);
  });

  it('事件引用的政权都存在', () => {
    const known = new Set(POLITIES.map((p) => p.id));
    const bad = EVENTS.flatMap((e) => e.polityIds.filter((id) => !known.has(id)).map((id) => `${e.id} → ${id}`));
    expect(bad).toEqual([]);
  });
});

describe('时空范围', () => {
  it('所有疆域段都与视野有交集', () => {
    const outside = SEGMENTS.filter((s) => s.to <= RANGE.from || s.from >= RANGE.to).map((s) => s.id);
    expect(outside).toEqual([]);
  });

  it('所有事件都落在视野内', () => {
    const outside = EVENTS.filter((e) => e.y < RANGE.from || e.y >= RANGE.to).map((e) => `${e.id}(${e.y})`);
    expect(outside).toEqual([]);
  });

  it('事件坐标落在底图范围内', () => {
    const bad = EVENTS.filter((e) => e.at[0] < 50 || e.at[0] > 160 || e.at[1] < 0 || e.at[1] > 60).map((e) => e.id);
    expect(bad).toEqual([]);
  });

  it('地点年代区间非空', () => {
    expect(PLACES.filter((p) => p.to <= p.from)).toEqual([]);
  });
});

describe('配色：同时并立的政权不撞色', () => {
  it('时间上有交集的政权颜色互不相同', () => {
    const clashes: string[] = [];
    for (let i = 0; i < POLITIES.length; i++) {
      for (let j = i + 1; j < POLITIES.length; j++) {
        const a = POLITIES[i];
        const b = POLITIES[j];
        if (a.color !== b.color) continue;
        if (a.from < b.to && b.from < a.to) clashes.push(`${a.name} × ${b.name} (${a.color})`);
      }
    }
    expect(clashes, clashes.join('\n')).toEqual([]);
  });
});

describe('地点落位：每个地点都必须真的落在某个政权面里', () => {
  it('每个地点在它的年代区间内至少有一年隶属于某个政权', () => {
    const orphans: string[] = [];
    for (const pl of PLACES) {
      let found = false;
      for (let y = pl.from; y < pl.to && !found; y++) {
        for (const s of activeSegmentsAt(y)) {
          if (inRing(pl.at, s.geometry)) {
            found = true;
            break;
          }
        }
      }
      if (!found) orphans.push(`${pl.name}(${pl.id}) ${pl.from}-${pl.to} @ ${pl.at}`);
    }
    expect(orphans, `这些地点不落在任何政权面内：\n${orphans.join('\n')}`).toEqual([]);
  });
});

describe('事件与政权的关系', () => {
  it('标了政权的事件，年份与该政权的存续对得上（容许 ±1 年的纪年转换差）', () => {
    // 王朝纪年换算成公元年本身就有一年的游移，边界事件必然踩在缝上：
    //   「司马炎代魏」记在 265 年，而西晋的起算年通常写作 266；
    //   「魏灭蜀」记在 263 年，而那正是蜀汉的末年（区间右端是开区间）。
    // 所以放宽一年。这条断言真正要卡的是「引用了差几十上百年的政权」这类错。
    const bad: string[] = [];
    for (const e of EVENTS) {
      for (const pid of e.polityIds) {
        const p = POLITIES.find((x) => x.id === pid)!;
        const near = (from: number, to: number) => e.y >= from - 1 && e.y <= to + 1;
        const inExistence = near(p.from, p.to - 1);
        const inSegments = SEGMENTS.some((s) => s.polityId === pid && near(s.from, s.to - 1));
        if (!inExistence && !inSegments) bad.push(`${e.title}(${e.y}) → ${p.name}(${p.from}-${p.to})`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('每个事件都有摘要与出处', () => {
    for (const e of EVENTS) {
      expect(e.summary.length, `${e.id} 摘要太短`).toBeGreaterThan(10);
      expect(e.evidence.length, `${e.id} 没有出处`).toBeGreaterThan(0);
    }
  });

  it('重要度与类型都在允许范围内', () => {
    for (const e of EVENTS) {
      expect(e.importance).toBeGreaterThanOrEqual(1);
      expect(e.importance).toBeLessThanOrEqual(5);
      expect(e.type.length).toBeGreaterThan(0);
    }
  });

  it('每个有事件的年份，eventsAtYear 都返回它', () => {
    for (const e of EVENTS) {
      expect(eventsAtYear(e.y).map((x) => x.id), `${e.id} 在 ${e.y} 年取不到`).toContain(e.id);
    }
  });
});

describe('来源的许可分级', () => {
  it('受限来源必须写明凭什么可以引用', () => {
    const missing = SOURCES.filter((s) => s.redistribution === 'denied' && !s.permissionEvidence).map((s) => s.id);
    expect(missing).toEqual([]);
  });

  it('标为 allowed 的来源必须是真公有领域，不能顺手标', () => {
    const allowed = SOURCES.filter((s) => s.redistribution === 'allowed');
    expect(allowed.length).toBeGreaterThan(0);
    for (const s of allowed) {
      expect(s.license, `${s.id} 标了 allowed 但许可说明可疑`).toMatch(/公有领域|Public Domain/);
    }
  });
});

describe('分段存续：中断期必须与地图一致', () => {
  it('西秦 400–409 年不在地图上，泳道也不该画连续条带', () => {
    const xiQin = POLITIES.find((p) => p.id === 'xi_qin')!;
    expect(xiQin.activePeriods).toEqual([[385, 400], [409, 431]]);
    // 中断的九年里不应有西秦的任何疆域段
    for (const y of [401, 403, 405, 407]) {
      expect(
        activeSegmentsAt(y).filter((s) => s.polityId === 'xi_qin'),
        `${y} 年不该有西秦`,
      ).toEqual([]);
    }
    // 两侧都应该有
    expect(activeSegmentsAt(395).some((s) => s.polityId === 'xi_qin')).toBe(true);
    expect(activeSegmentsAt(415).some((s) => s.polityId === 'xi_qin')).toBe(true);
  });

  it('给了 activePeriods 的政权，其疆域段必须落在这些区间内', () => {
    for (const p of POLITIES) {
      if (!p.activePeriods) continue;
      for (const s of SEGMENTS.filter((x) => x.polityId === p.id)) {
        const inside = p.activePeriods.some(([f, t]) => s.from >= f && s.to <= t);
        expect(inside, `${s.id} [${s.from},${s.to}) 落在 ${p.name} 的分段存续之外`).toBe(true);
      }
    }
  });
});

describe('时间轴泳道', () => {
  it('西秦出两段条带，中断期没有条 —— 与地图上的空白一致', async () => {
    const { packLanes } = await import('../../src/timeline/Timeline');
    const bars = packLanes().flat().filter((b) => b.id === 'xi_qin');
    expect(bars.map((b) => [b.from, b.to])).toEqual([[385, 400], [409, 431]]);
  });

  it('不分段存续的政权仍只出一条', async () => {
    const { packLanes } = await import('../../src/timeline/Timeline');
    const tang = packLanes().flat().filter((b) => b.id === 'tang');
    expect(tang).toHaveLength(1);
  });

  it('每一条条带的起止都落在视野内且非空', async () => {
    const { packLanes } = await import('../../src/timeline/Timeline');
    for (const b of packLanes().flat()) {
      expect(b.to).toBeGreaterThan(b.from);
      expect(b.from).toBeGreaterThanOrEqual(200);
      expect(b.to).toBeLessThanOrEqual(960);
    }
  });
});
