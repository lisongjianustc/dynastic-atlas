import { useEffect, useMemo, useRef, useState } from 'react';
import MapView from './map/MapView';
import Timeline from './timeline/Timeline';
import Legend from './panel/Legend';
import CoveragePanel from './panel/CoveragePanel';
import SidePanel from './panel/SidePanel';
import { RANGE, TRANSITIONS, intervalIndexAt, yearLabel } from './data/state';
import { POLITIES } from './data/atlas';
import { validateAtlas } from './data/validate';
import { useApp } from './state/store';

export default function App() {
  const year = useApp((s) => s.year);
  const playing = useApp((s) => s.playing);
  const speed = useApp((s) => s.speed);
  const setYear = useApp((s) => s.setYear);
  const setPlaying = useApp((s) => s.setPlaying);
  const setSpeed = useApp((s) => s.setSpeed);
  const selectedEventId = useApp((s) => s.selectedEventId);
  const selectedPolityId = useApp((s) => s.selectedPolityId);

  const [legendOpen, setLegendOpen] = useState(true);
  const panelView = useApp((s) => s.panelView);
  const setPanelView = useApp((s) => s.setPanelView);
  const [banner, setBanner] = useState<string | null>(null);
  const bannerTimer = useRef<number | undefined>(undefined);

  const issues = useMemo(() => validateAtlas(), []);
  const intervalIdx = intervalIndexAt(year);

  // 数据校验结果进控制台 —— 让纪律可见
  useEffect(() => {
    if (issues.length) console.warn('[atlas] 数据校验', issues);
  }, [issues]);

  // ── 播放 ──
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      const st = useApp.getState();
      let next = st.year + dt * st.speed;
      if (next >= RANGE.to - 1) next = RANGE.from;
      st.setYear(next, { keepSelection: true });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // ── 跨过疆域变更点时，顶部浮出一句话 ──
  useEffect(() => {
    const label = TRANSITIONS[intervalIdx]?.label;
    if (!label) return;
    setBanner(label);
    window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), 3200);
    return () => window.clearTimeout(bannerTimer.current);
  }, [intervalIdx]);

  // ── 键盘：←/→ ±1，Shift ±10，Alt ±100，空格播放 ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useApp.getState();
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.key) {
        case 'ArrowLeft':
          st.step(e.altKey ? -100 : e.shiftKey ? -10 : -1);
          e.preventDefault();
          break;
        case 'ArrowRight':
          st.step(e.altKey ? 100 : e.shiftKey ? 10 : 1);
          e.preventDefault();
          break;
        case ' ':
          st.setPlaying(!st.playing);
          e.preventDefault();
          break;
        case 'Escape':
          st.selectEvent(null);
          st.selectPolity(null);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── URL 深链：初值在 store 初始化时就读了（见 state/store.ts），这里只负责写回 ──
  useEffect(() => {
    const q = new URLSearchParams();
    q.set('y', String(year));
    if (selectedEventId) q.set('evt', selectedEventId);
    if (selectedPolityId) q.set('p', selectedPolityId);
    if (panelView === 'coverage') q.set('pv', 'coverage');
    window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}`);
  }, [year, selectedEventId, selectedPolityId, panelView]);

  // 地图聚焦请求（面板里的「在地图上聚焦」）
  useEffect(() => {
    const onFocus = (e: Event) => {
      const detail = (e as CustomEvent<{ at: [number, number]; zoom?: number }>).detail;
      if (detail?.at) window.dispatchEvent(new CustomEvent('atlas:focus-internal', { detail }));
    };
    window.addEventListener('atlas:focus', onFocus);
    return () => window.removeEventListener('atlas:focus', onFocus);
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">历代疆域</span>
          <span className="brand-sub">Dynastic Atlas · P0</span>
        </div>

        <div className="clock">
          <span className="clock-year">{yearLabel(year)}</span>
          <span className="clock-sub">
            {POLITIES.filter((p) => p.from <= year && p.to > year).length} 个政权并存
          </span>
        </div>

        <div className="transport">
          <button className="tbtn" onClick={() => setYear(year - 10)} title="退 10 年（Shift+←）">
            ⏪
          </button>
          <button className="tbtn" onClick={() => setYear(year - 1)} title="退 1 年（←）">
            ◀
          </button>
          <button className={`tbtn play${playing ? ' on' : ''}`} onClick={() => setPlaying(!playing)} title="播放 / 暂停（空格）">
            {playing ? '⏸' : '▶'}
          </button>
          <button className="tbtn" onClick={() => setYear(year + 1)} title="进 1 年（→）">
            ▶
          </button>
          <button className="tbtn" onClick={() => setYear(year + 10)} title="进 10 年（Shift+→）">
            ⏩
          </button>
          <select
            className="speed"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            title="播放速度"
          >
            {[1, 2, 4, 8, 20].map((v) => (
              <option key={v} value={v}>
                {v} 年/秒
              </option>
            ))}
          </select>
        </div>

        <button className="tbtn ghost" onClick={() => setPanelView('legend')}>
          图例
        </button>
        <button
          className={`tbtn ghost${panelView === 'coverage' ? ' on' : ''}`}
          onClick={() => setPanelView('coverage')}
          title="资料覆盖：这个项目还缺什么"
        >
          资料覆盖
        </button>
        <button className="tbtn ghost" onClick={() => setLegendOpen(!legendOpen)}>
          {legendOpen ? '收起' : '展开'}
        </button>
      </header>

      <main className="stage">
        <MapView />
        {legendOpen && (panelView === 'coverage' ? <CoveragePanel /> : <Legend issues={issues} />)}
        <SidePanel />
        <div className={`banner${banner ? ' show' : ''}`}>{banner}</div>
        <div className="hint">
          拖拽时间轴或按 ← → 逐年查看 · Shift 十年 · Alt 百年 · 空格播放 · 点亮点看事件
        </div>
      </main>

      <Timeline />
    </div>
  );
}
