// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_CONTROLS, effectiveVisibleControls, YEAR_RANGE } from '../../src/state/store';
import { RANGE } from '../../src/data/state';

/**
 * 应用状态。
 *
 * 深链是这里最要紧的一条：**URL 在模块初始化时读一次**，不是在 effect 里。
 * 早先在 StrictMode 下「恢复 URL」和「写回 URL」两个 effect 会互相打架，
 * 结果 ?y=220 永远被写成 220，用户改不动年份。
 */

async function loadStore(search = '') {
  window.history.replaceState(null, '', `/${search}`);
  vi.resetModules();
  return import('../../src/state/store');
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('深链：从 URL 恢复初始状态', () => {
  it('没有参数时落在默认年份 220 —— 三国开端', async () => {
    const { useApp } = await loadStore();
    expect(useApp.getState().year).toBe(220);
  });

  it('?y= 恢复年份', async () => {
    const { useApp } = await loadStore('?y=410');
    expect(useApp.getState().year).toBe(410);
  });

  it('?y= 超出视野会被夹住', async () => {
    const { useApp } = await loadStore('?y=9999');
    expect(useApp.getState().year).toBe(RANGE.to - 1);
  });

  it('?y= 非法值回落到默认', async () => {
    const { useApp } = await loadStore('?y=abc');
    expect(useApp.getState().year).toBe(220);
  });

  it('?evt= 与 ?p= 恢复选中项', async () => {
    const { useApp } = await loadStore('?y=410&evt=E020&p=hou_qin');
    const s = useApp.getState();
    expect(s.selectedEventId).toBe('E020');
    expect(s.selectedPolityId).toBe('hou_qin');
  });

  it('?pv=coverage 打开资料覆盖面板', async () => {
    const { useApp } = await loadStore('?pv=coverage');
    expect(useApp.getState().panelView).toBe('coverage');
  });

  it('?pv= 非法值回落到图例', async () => {
    const { useApp } = await loadStore('?pv=nonsense');
    expect(useApp.getState().panelView).toBe('legend');
  });
});

describe('年份操作', () => {
  it('setYear 会夹住并取整', async () => {
    const { useApp } = await loadStore();
    useApp.getState().setYear(-500);
    expect(useApp.getState().year).toBe(RANGE.from);
    useApp.getState().setYear(618.7);
    expect(useApp.getState().year).toBe(619);
  });

  it('改年份默认清掉选中事件 —— 免得 panel 显示一个不在当年的纪事', async () => {
    const { useApp } = await loadStore('?y=618&evt=E037');
    useApp.getState().setYear(410);
    expect(useApp.getState().selectedEventId).toBeNull();
  });

  it('步进时保留选中（拖游标不该把面板甩掉）', async () => {
    const { useApp } = await loadStore('?y=618&evt=E037');
    useApp.getState().step(1);
    expect(useApp.getState().year).toBe(619);
    expect(useApp.getState().selectedEventId).toBe('E037');
  });

  it('YEAR_RANGE 与数据层的视野一致', async () => {
    await loadStore();
    expect(YEAR_RANGE).toEqual(RANGE);
  });
});

describe('控制层级开关', () => {
  it('默认六级全开', async () => {
    const { useApp } = await loadStore();
    expect(effectiveVisibleControls(useApp.getState())).toEqual(ALL_CONTROLS);
  });

  it('逐个开关是切换语义', async () => {
    const { useApp } = await loadStore();
    useApp.getState().toggleControl('tributary');
    expect(effectiveVisibleControls(useApp.getState())).not.toContain('tributary');
    useApp.getState().toggleControl('tributary');
    expect(effectiveVisibleControls(useApp.getState())).toContain('tributary');
  });

  it('「只看实际控制」优先级高于逐项开关', async () => {
    const { useApp } = await loadStore();
    useApp.getState().toggleControl('core');
    useApp.getState().setShowOnlyCore(true);
    expect(effectiveVisibleControls(useApp.getState())).toEqual(['core']);
  });
});

describe('选中与面板', () => {
  it('点同一个政权会取消选中', async () => {
    const { useApp } = await loadStore();
    useApp.getState().selectPolity('tang');
    expect(useApp.getState().selectedPolityId).toBe('tang');
    useApp.getState().selectPolity('tang');
    expect(useApp.getState().selectedPolityId).toBeNull();
  });

  it('面板切换是切换语义', async () => {
    const { useApp } = await loadStore();
    useApp.getState().setPanelView('coverage');
    expect(useApp.getState().panelView).toBe('coverage');
    useApp.getState().setPanelView('coverage');
    expect(useApp.getState().panelView).toBe('legend');
  });

  it('reset 回到初始年份并清空选择', async () => {
    const { useApp } = await loadStore('?y=410&evt=E020');
    useApp.getState().selectPolity('tang');
    useApp.getState().reset();
    const s = useApp.getState();
    expect(s.year).toBe(410);
    expect(s.selectedEventId).toBeNull();
    expect(s.selectedPolityId).toBeNull();
    expect(s.hiddenControls).toEqual([]);
  });
});
