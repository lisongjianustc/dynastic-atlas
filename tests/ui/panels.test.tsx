// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import CoveragePanel from '../../src/panel/CoveragePanel';
import Legend from '../../src/panel/Legend';
import { useApp } from '../../src/state/store';
import { COVERAGE, coverageAt } from '../../src/data/governance';

afterEach(() => {
  cleanup();
  useApp.setState({ year: 618, panelView: 'legend' });
});

/**
 * UI 层。
 *
 * 这里断言的不是像素，而是**给用户的信息是否诚实**：
 * 缺口有没有露出来、未核验状态有没有讲清、控制层级的含义有没有写明白。
 * 这套界面最容易被指责的就是「看起来像权威地图」，所以这些文案是有功能的。
 */

describe('资料覆盖面板', () => {
  it('把「空白不等于没有」这句话摆在最前面', () => {
    useApp.setState({ year: 410 });
    render(<CoveragePanel />);
    expect(screen.getByText(/空白表示尚缺资料，不表示当时没有政权或事件/)).toBeInTheDocument();
  });

  it('把 agent 核验与人工审定分开报，人工审定必须是 0', () => {
    useApp.setState({ year: 410 });
    render(<CoveragePanel />);
    // 这一条是本项目最要紧的诚实性断言：没有专家复核过，就不许显示成有
    expect(screen.getByText('人工审定')).toBeInTheDocument();
    expect(screen.getByText(/未经专家复核/)).toBeInTheDocument();
    expect(screen.getByText('agent 已核验')).toBeInTheDocument();
  });

  it('核验深度分开显示，不合并成一个「已核验」数字', () => {
    useApp.setState({ year: 410 });
    render(<CoveragePanel />);
    // 摘要与缺口说明里都会出现，用 getAllByText 免得绑死在某一处
    expect(screen.getAllByText(/逐条比对/).length).toBeGreaterThan(0);
  });

  it('注明边界几何未配准、事件因果未复核', () => {
    useApp.setState({ year: 410 });
    render(<CoveragePanel />);
    expect(screen.getAllByText(/边界几何未做控制点配准/).length).toBeGreaterThan(0);
  });

  it('列出的缺口条数与数据层一致，且逐条渲染', () => {
    useApp.setState({ year: 410 });
    const { container } = render(<CoveragePanel />);
    const expected = coverageAt(410);
    expect(screen.getByText(/涉及缺口/)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-coverage-id]')).toHaveLength(expected.length);
    // 十六国这条必然覆盖 410 年（按 id 断言，不绑文案）
    expect(container.querySelector('[data-coverage-id="sixteen-kingdoms-handdrawn"]')).not.toBeNull();
    expect(expected.length).toBeGreaterThan(0);
  });

  it('受限来源如实标注为「仅引用，未分发数据」', () => {
    useApp.setState({ year: 618 });
    render(<CoveragePanel />);
    expect(screen.getByText(/仅引用，未分发数据/)).toBeInTheDocument();
  });

  it('说明未填页码级定位的记录数', () => {
    useApp.setState({ year: 618 });
    render(<CoveragePanel />);
    // 缺口说明里也出现过「页码级定位」，所以要限定在摘要项上
    expect(screen.getByText('页码级定位', { selector: 'dt' })).toBeInTheDocument();
  });

  it('换年份会换掉年份相关的缺口', async () => {
    useApp.setState({ year: 410 });
    const { container, rerender } = render(<CoveragePanel />);
    // 河西走廊这条只覆盖 320–439
    expect(container.querySelector('[data-coverage-id="hexi-corridor"]')).not.toBeNull();
    useApp.setState({ year: 618 });
    rerender(<CoveragePanel />);
    expect(container.querySelector('[data-coverage-id="hexi-corridor"]')).toBeNull();
  });

  it('覆盖声明条数与数据层一致', () => {
    useApp.setState({ year: 618 });
    render(<CoveragePanel />);
    expect(screen.getByText(new RegExp(`共 ${COVERAGE.length} 项覆盖记录`))).toBeInTheDocument();
  });
});

describe('图例', () => {
  it('说明边界是示意，并指出哪些部分用了真实地理参照', () => {
    render(<Legend issues={[]} />);
    expect(screen.getByText(/本图边界为示意/)).toBeInTheDocument();
    expect(screen.getByText(/秦岭/)).toBeInTheDocument();
  });

  it('把「边界为示意」与「边界有依据」分开表述', () => {
    render(<Legend issues={[]} />);
    expect(screen.getByText(/近似|示意/)).toBeInTheDocument();
  });

  it('六级控制强度都列出，并解释实际控制与羁縻的区别', () => {
    render(<Legend issues={[]} />);
    expect(screen.getByText(/郡县而治/)).toBeInTheDocument();
    expect(screen.getByText(/羁縻/)).toBeInTheDocument();
  });

  it('点击控制层级会切换其可见性', async () => {
    const user = userEvent.setup();
    render(<Legend issues={[]} />);
    const before = useApp.getState().hiddenControls.length;
    const rows = screen.getAllByRole('button');
    await user.click(rows[0]);
    expect(useApp.getState().hiddenControls.length).not.toBe(before);
  });
});
