import { validateAtlas } from '../../src/data/validate';
import { bowtie, bundle, place, polity, segment, source, square } from '../fixtures/atlas';

/**
 * 校验器的**元测试**：证明这道闸门真的会拦人。
 *
 * 一个从不报错的校验器等于没有校验器 —— 所以这里不测「真实数据通过」
 * （那条另有测试），而是逐条破坏一个不变式，断言对应的错误必须出现。
 */

const errorsOf = (b: Parameters<typeof validateAtlas>[0]) =>
  validateAtlas(b)
    .filter((i) => i.level === 'error')
    .map((i) => `${i.where} ${i.what}`);

describe('校验器：真实数据应当通过', () => {
  it('真实数据集 0 错误', () => {
    const errs = errorsOf(undefined as never);
    expect(errs, errs.join('\n')).toEqual([]);
  });

  it('夹具构成的合法最小集也应当通过', () => {
    expect(errorsOf(bundle())).toEqual([]);
  });
});

describe('校验器：没有出处，进不了库', () => {
  it('疆域段没有 evidence', () => {
    const errs = errorsOf(bundle({ segments: [segment({ evidence: [] })] }));
    expect(errs.some((e) => e.includes('没有任何出处'))).toBe(true);
  });

  it('事件没有 evidence', () => {
    const b = bundle();
    b.events[0].evidence = [];
    expect(errorsOf(b).some((e) => e.includes('没有任何出处'))).toBe(true);
  });

  it('地点没有 evidence', () => {
    const b = bundle();
    b.places[0].evidence = [];
    expect(errorsOf(b).some((e) => e.includes('没有任何出处'))).toBe(true);
  });

  it('evidence 指向未登记的来源', () => {
    const errs = errorsOf(bundle({ segments: [segment({ evidence: [{ sourceId: '不存在' }] })] }));
    expect(errs.some((e) => e.includes('未登记的来源'))).toBe(true);
  });
});

describe('校验器：许可红线', () => {
  it('redistribution=denied 却没写 permissionEvidence', () => {
    const errs = errorsOf(bundle({ sources: [source({ redistribution: 'denied' })] }));
    expect(errs.some((e) => e.includes('permissionEvidence'))).toBe(true);
  });

  it('denied 来源写清了依据就放行（但仍给提示）', () => {
    const b = bundle({
      sources: [source({ redistribution: 'denied', permissionEvidence: '仅作参考，未复制其数据' })],
    });
    expect(errorsOf(b)).toEqual([]);
    expect(validateAtlas(b).some((i) => i.level === 'warn' && i.where === 'licensing')).toBe(true);
  });
});

describe('校验器：几何', () => {
  it('外环未闭合', () => {
    const open = squareRingOpen();
    expect(errorsOf(bundle({ segments: [segment({ geometry: open })] })).some((e) => e.includes('未闭合'))).toBe(true);
  });

  it('外环自交 —— 边界链接反了的典型症状', () => {
    const errs = errorsOf(bundle({ segments: [segment({ geometry: bowtie() })] }));
    expect(errs.some((e) => e.includes('自交'))).toBe(true);
  });

  it('坐标越界', () => {
    const bad = [
      [200, 35],
      [210, 35],
      [210, 45],
      [200, 45],
      [200, 35],
    ] as [number, number][];
    expect(errorsOf(bundle({ segments: [segment({ geometry: bad })] })).some((e) => e.includes('坐标越界'))).toBe(true);
  });

  it('点数不足', () => {
    const tiny = [
      [110, 35],
      [111, 35],
      [110, 35],
    ] as [number, number][];
    expect(errorsOf(bundle({ segments: [segment({ geometry: tiny })] })).some((e) => e.includes('点数不足'))).toBe(true);
  });
});

describe('校验器：时间', () => {
  it('整数区间与 validity 不一致 —— 权威值是 validity，不一致必须是错误', () => {
    const s = segment();
    const errs = errorsOf(bundle({ segments: [{ ...s, from: s.from - 10 }] }));
    expect(errs.some((e) => e.includes('与 validity 不一致'))).toBe(true);
  });

  it('snapshot 却没有 snapshotYear', () => {
    const errs = errorsOf(bundle({ segments: [segment({ temporalSupport: 'snapshot' })] }));
    expect(errs.some((e) => e.includes('snapshotYear'))).toBe(true);
  });

  it('interval 却带了 snapshotYear', () => {
    const errs = errorsOf(bundle({ segments: [segment({ snapshotYear: 250 })] }));
    expect(errs.some((e) => e.includes('interval'))).toBe(true);
  });

  it('validity 连确定成立的区间都为空', () => {
    const s = segment();
    const broken = {
      ...s,
      validity: {
        start: { earliest: 200, latest: 300 },
        endExclusive: { earliest: 250, latest: 280 },
        precision: 'range' as const,
        label: '测试',
      },
    };
    expect(errorsOf(bundle({ segments: [broken] })).length).toBeGreaterThan(0);
  });
});

describe('校验器：编制留痕与审查', () => {
  it('没有记录编制方法', () => {
    const s = segment();
    const errs = errorsOf(bundle({ segments: [{ ...s, compilation: { method: '' } }] }));
    expect(errs.some((e) => e.includes('编制方法'))).toBe(true);
  });

  it('标为 specified 但编制方法写的是人工绘制示意 —— 过度声称', () => {
    const s = segment();
    const issues = validateAtlas(
      bundle({ segments: [{ ...s, spatialPrecision: 'specified', compilation: { method: '人工绘制示意' } }] }),
    );
    expect(issues.some((i) => i.level === 'warn' && i.what.includes('人工绘制示意'))).toBe(true);
  });

  it('verified 却没写核验者', () => {
    const s = segment();
    const errs = errorsOf(
      bundle({ segments: [{ ...s, review: { ...s.review, status: 'verified', reviewer: '' } }] }),
    );
    expect(errs.some((e) => e.includes('reviewer'))).toBe(true);
  });

  it('agent 给出的 verified 只能算 agent 核验，必须提示', () => {
    const s = segment();
    const issues = validateAtlas(
      bundle({
        segments: [{ ...s, review: { status: 'verified', reviewerKind: 'agent', reviewer: 'x', checkedAt: '2026-10-01' } }],
      }),
    );
    expect(issues.some((i) => i.level === 'warn' && i.what.includes('不等于专家审定'))).toBe(true);
  });
});

describe('校验器：时空重叠', () => {
  it('同政权同层级、时间与空间双双重叠', () => {
    const a = segment({ id: 'a', from: 200, to: 260 });
    const b = segment({ id: 'b', from: 240, to: 300 });
    const errs = errorsOf(bundle({ segments: [a, b] }));
    expect(errs.some((e) => e.includes('双双重叠'))).toBe(true);
  });

  it('同政权同层级、时间重叠但空间相隔万里 —— 合法（如安西与安东都护府）', () => {
    const a = segment({ id: 'a', from: 200, to: 260, geometry: square(80, 40, 3) });
    const b = segment({ id: 'b', from: 240, to: 300, geometry: square(125, 40, 3) });
    expect(errorsOf(bundle({ segments: [a, b] }))).toEqual([]);
  });

  it('不同控制层级时间重叠 —— 合法（直辖与军事控制本就并存）', () => {
    const a = segment({ id: 'a', from: 200, to: 300, control: 'core' });
    const b = segment({ id: 'b', from: 200, to: 300, control: 'military' });
    expect(errorsOf(bundle({ segments: [a, b] }))).toEqual([]);
  });
});

describe('校验器：引用完整性', () => {
  it('疆域段指向不存在的政权', () => {
    expect(errorsOf(bundle({ segments: [segment({ polityId: '不存在' })] })).some((e) => e.includes('polityId'))).toBe(true);
  });

  it('事件指向不存在的政权', () => {
    const b = bundle();
    b.events[0].polityIds = ['不存在'];
    expect(errorsOf(b).some((e) => e.includes('polityId'))).toBe(true);
  });

  it('地点坐标偏出视野', () => {
    const errs = errorsOf(bundle({ places: [place({ at: [10, 10] })] }));
    expect(errs.some((e) => e.includes('偏离视野'))).toBe(true);
  });

  it('政权存续区间倒置', () => {
    expect(errorsOf(bundle({ polities: [polity({ from: 300, to: 200 })] })).length).toBeGreaterThan(0);
  });
});

function squareRingOpen(): [number, number][] {
  return [
    [105, 30],
    [115, 30],
    [115, 40],
    [105, 40],
  ] as [number, number][];
}
