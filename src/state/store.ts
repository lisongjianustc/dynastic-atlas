import { create } from 'zustand';
import type { ControlLevel, Year } from '../data/types';
import { RANGE, clampYear } from '../data/state';

export const ALL_CONTROLS: ControlLevel[] = ['core', 'military', 'indirect', 'tributary', 'nominal', 'raided'];

interface AppState {
  year: Year;
  playing: boolean;
  /** 播放速度：年/秒 */
  speed: number;
  selectedEventId: string | null;
  selectedPolityId: string | null;
  hiddenControls: ControlLevel[];
  showLabels: boolean;
  showRivers: boolean;
  showPlaces: boolean;
  /** 左侧面板：图例 / 资料覆盖 */
  panelView: 'legend' | 'coverage';
  showOnlyCore: boolean;

  setYear: (y: number, opts?: { keepSelection?: boolean }) => void;
  step: (delta: number) => void;
  setPlaying: (v: boolean) => void;
  setSpeed: (v: number) => void;
  selectEvent: (id: string | null) => void;
  selectPolity: (id: string | null) => void;
  toggleControl: (c: ControlLevel) => void;
  setShowOnlyCore: (v: boolean) => void;
  toggleLabels: () => void;
  toggleRivers: () => void;
  togglePlaces: () => void;
  setPanelView: (v: 'legend' | 'coverage') => void;
  reset: () => void;
}

/**
 * 初始状态直接从 URL 读，不放在 effect 里。
 * 曾经的写法是「挂载后从 URL 恢复」+「状态变化写回 URL」两个 effect ——
 * 在 StrictMode 的双调用下，写回那一次先把 URL 改成了默认年，
 * 恢复那一次于是读到默认年，深链直接失效。初始化读一次就没有这个赛跑。
 */
function fromUrl(key: string, fallback: string | null): string | null {
  if (typeof window === 'undefined') return fallback;
  return new URLSearchParams(window.location.search).get(key) ?? fallback;
}

const initialYear = (() => {
  const raw = fromUrl('y', null);
  const y = Number(raw);
  return raw !== null && Number.isFinite(y) ? clampYear(y) : 220;
})();

export const useApp = create<AppState>((set, get) => ({
  year: initialYear,
  playing: false,
  speed: 4,
  selectedEventId: fromUrl('evt', null),
  selectedPolityId: fromUrl('p', null),
  hiddenControls: [],
  showLabels: true,
  showRivers: true,
  showPlaces: true,
  panelView: fromUrl('pv', null) === 'coverage' ? 'coverage' : 'legend',
  showOnlyCore: false,

  setYear: (y, opts) =>
    set((s) => ({
      year: clampYear(y),
      selectedEventId: opts?.keepSelection ? s.selectedEventId : null,
    })),
  step: (delta) => get().setYear(get().year + delta, { keepSelection: true }),
  setPlaying: (v) => set({ playing: v }),
  setSpeed: (v) => set({ speed: v }),
  selectEvent: (id) => set({ selectedEventId: id }),
  selectPolity: (id) => set((s) => ({ selectedPolityId: s.selectedPolityId === id ? null : id })),
  toggleControl: (c) =>
    set((s) => ({
      hiddenControls: s.hiddenControls.includes(c)
        ? s.hiddenControls.filter((x) => x !== c)
        : [...s.hiddenControls, c],
    })),
  setShowOnlyCore: (v) => set({ showOnlyCore: v }),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleRivers: () => set((s) => ({ showRivers: !s.showRivers })),
  togglePlaces: () => set((s) => ({ showPlaces: !s.showPlaces })),
  setPanelView: (v) => set((s) => ({ panelView: s.panelView === v ? 'legend' : v })),
  reset: () => set({ year: initialYear, playing: false, selectedEventId: null, selectedPolityId: null, hiddenControls: [] }),
}));

/** 实际生效的可见控制层级（「只看实际控制」优先级高于逐项开关） */
export function effectiveVisibleControls(s: Pick<AppState, 'hiddenControls' | 'showOnlyCore'>): ControlLevel[] {
  if (s.showOnlyCore) return ['core'];
  return ALL_CONTROLS.filter((c) => !s.hiddenControls.includes(c));
}

export const YEAR_RANGE = RANGE;
