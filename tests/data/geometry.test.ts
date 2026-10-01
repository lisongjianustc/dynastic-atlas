import { arc, rev, ring } from '../../src/data/geo';

/**
 * 几何原语。这些是手感最好、也最容易悄悄出错的东西 ——
 * 一个反向的边界链能让整个环自交，而图上只表现为一根针状毛刺。
 */

const P = (x: number, y: number): [number, number] => [x, y];

describe('ring()', () => {
  it('自动闭合外环', () => {
    const r = ring([P(0, 0), P(1, 0), P(1, 1)]);
    expect(r[0]).toEqual(r[r.length - 1]);
    expect(r).toHaveLength(4);
  });

  it('已经闭合就不重复加点', () => {
    const r = ring([P(0, 0), P(1, 0), P(1, 1), P(0, 0)]);
    expect(r).toHaveLength(4);
  });

  it('去掉相邻重复点 —— 真实边界链首尾相接时必然产生', () => {
    const r = ring([P(0, 0), P(1, 0)], [P(1, 0), P(1, 1)], [P(1, 1), P(0, 0)]);
    expect(r).toEqual([P(0, 0), P(1, 0), P(1, 1), P(0, 0)]);
  });

  it('接受 number[][] 形式的字面量（区域几何是这种）', () => {
    const r = ring([[10, 20], [11, 20], [11, 21]]);
    expect(r).toHaveLength(4);
    expect(r[0]).toEqual([10, 20]);
  });

  it('不修改传入的数组', () => {
    const src = [P(0, 0), P(1, 0), P(1, 1)];
    const copy = JSON.parse(JSON.stringify(src));
    ring(src);
    expect(src).toEqual(copy);
  });
});

describe('rev()', () => {
  it('反转并保持首尾不重复加点', () => {
    expect(rev([P(0, 0), P(1, 0), P(2, 0)])).toEqual([P(2, 0), P(1, 0), P(0, 0)]);
  });
});

describe('arc() 按锚点截取真实区域的一段', () => {
  const chain: [number, number][] = [P(0, 0), P(1, 0), P(2, 0), P(3, 0), P(4, 0)];

  it('锚点顺序与链一致时正向截取', () => {
    expect(arc(chain, P(1, 0), P(3, 0))).toEqual([P(1, 0), P(2, 0), P(3, 0)]);
  });

  it('锚点顺序与链相反时自动反向 —— 这是拼环时最容易搞错的地方', () => {
    expect(arc(chain, P(3, 0), P(1, 0))).toEqual([P(3, 0), P(2, 0), P(1, 0)]);
  });

  it('锚点不落在顶点上时取最近的顶点', () => {
    expect(arc(chain, P(0.9, 0.1), P(3.2, 0))).toEqual([P(1, 0), P(2, 0), P(3, 0)]);
  });

  it('两个锚点相同则只返回一个点', () => {
    expect(arc(chain, P(2, 0), P(2, 0))).toEqual([P(2, 0)]);
  });

  it('整条链', () => {
    expect(arc(chain, P(0, 0), P(4, 0))).toHaveLength(5);
  });
});

describe('真实数据：外环必须是闭合的简单多边形', () => {
  it('每个 RINGS 条目首尾相同', async () => {
    const { RINGS } = await import('../../src/data/geo');
    const bad: string[] = [];
    for (const [name, r] of Object.entries(RINGS)) {
      const first = r[0];
      const last = r[r.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) bad.push(name);
    }
    expect(bad, `未闭合：${bad.join(', ')}`).toEqual([]);
  });

  it('每个 RINGS 条目都有足够的顶点（三点以上才成面）', async () => {
    const { RINGS } = await import('../../src/data/geo');
    const thin = Object.entries(RINGS)
      .filter(([, r]) => r.length < 4)
      .map(([n]) => n);
    expect(thin).toEqual([]);
  });
});
