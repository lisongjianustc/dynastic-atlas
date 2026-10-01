import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EVENTS, POLITIES } from '../data/atlas';
import { EVENT_TYPE_COLORS } from '../map/controlStyles';
import {
  CHANGE_YEARS, EVENT_BUCKETS, INTERVALS, RANGE, TRANSITIONS,
  eventsAtYear, intervalIndexAt, nextEventYear, prevEventYear, yearLabel,
} from '../data/state';
import { useApp } from '../state/store';

const SPAN = RANGE.to - RANGE.from;
const pct = (y: number) => ((y - RANGE.from) / SPAN) * 100;

/**
 * 泳道打包：把互不重叠的政权压进同一行（甘特图式区间着色）。
 *
 * 分段存续的政权（如西秦 400–409 为后秦所灭、409 复国）出**两段条带**。
 * 画成一条连续条带会与地图自相矛盾：地图上那九年是空白，泳道却声称它还在。
 */
export function packLanes() {
  const bars = POLITIES.flatMap((p) =>
    (p.activePeriods ?? [[p.from, p.to]]).map(([f, t]) => ({ id: p.id, from: f, to: t })),
  ).sort((a, b) => a.from - b.from || a.to - b.to);

  const lanes: { id: string; from: number; to: number }[][] = [];
  for (const b of bars) {
    const from = Math.max(b.from, RANGE.from);
    const to = Math.min(b.to, RANGE.to);
    if (to <= from) continue;
    let placed = false;
    for (const lane of lanes) {
      if (lane[lane.length - 1].to <= from) {
        lane.push({ id: b.id, from, to });
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([{ id: b.id, from, to }]);
  }
  return lanes;
}

export default function Timeline() {
  const year = useApp((s) => s.year);
  const setYear = useApp((s) => s.setYear);
  const setPlaying = useApp((s) => s.setPlaying);
  const selectEvent = useApp((s) => s.selectEvent);
  const selectedEventId = useApp((s) => s.selectedEventId);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState<{ year: number; x: number } | null>(null);

  const lanes = useMemo(packLanes, []);
  const maxCount = useMemo(() => Math.max(1, ...EVENT_BUCKETS.map((b) => b.count)), []);
  const transitionYears = useMemo(() => new Set(TRANSITIONS.map((t) => t.year)), []);
  const yearEvents = eventsAtYear(year);
  const prevEvt = prevEventYear(year);
  const nextEvt = nextEventYear(year);
  const intervalIdx = intervalIndexAt(year);
  const currentInterval = INTERVALS[intervalIdx];
  const currentTransition = TRANSITIONS[intervalIdx];

  const yearFromClientX = useCallback((clientX: number) => {
    const el = wrapRef.current;
    if (!el) return year;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    let y = Math.round(RANGE.from + ratio * SPAN);
    // 轻微吸附：靠近疆域变更年时贴上去
    for (const cy of CHANGE_YEARS) {
      if (Math.abs(cy - y) <= Math.max(1, Math.round(SPAN * 0.0016))) {
        y = cy;
        break;
      }
    }
    return y;
  }, [year]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    setPlaying(false);
    setYear(yearFromClientX(e.clientX));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = wrapRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setHover({ year: yearFromClientX(e.clientX), x: e.clientX - rect.left });
    }
    if (dragging) setYear(yearFromClientX(e.clientX));
  };

  const onPointerUp = () => setDragging(false);

  // 拖拽时全局兜底，避免指针滑出组件后卡住
  useEffect(() => {
    if (!dragging) return;
    const up = () => setDragging(false);
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [dragging]);

  const jumpEvent = (dir: -1 | 1) => {
    const target = dir === 1 ? nextEventYear(year) : prevEventYear(year);
    if (target !== null) setYear(target);
  };

  const jumpChange = (dir: -1 | 1) => {
    const candidates = dir === 1 ? CHANGE_YEARS.filter((y) => y > year) : CHANGE_YEARS.filter((y) => y < year).reverse();
    if (candidates.length) setYear(candidates[0]);
  };

  return (
    <div className="timeline">
      <div className="tl-toolbar">
        <button className="tl-btn" onClick={() => jumpEvent(-1)} title="上一个有纪事的年份">
          ⏮ 纪事
        </button>
        <button className="tl-btn" onClick={() => jumpChange(-1)} title="上一个疆域变更年（Alt+←）">
          ⏮ 变更
        </button>
        <div className="tl-readout">
          <span className="tl-year" data-testid="tl-year">{yearLabel(year)}</span>
          <span className="tl-interval">
            区间 {yearLabel(currentInterval.from)}–{yearLabel(currentInterval.to)} · 共 {currentTransition.events ? currentTransition.events.length : 0} 事
          </span>
        </div>
        <button className="tl-btn" onClick={() => jumpChange(1)} title="下一个疆域变更年（Alt+→）">
          变更 ⏭
        </button>
        <button className="tl-btn" onClick={() => jumpEvent(1)} title="下一个有纪事的年份">
          纪事 ⏭
        </button>
      </div>

      <div className="tl-events">
        {yearEvents.length > 0 ? (
          <>
            <span className="tl-events-label">本年纪事</span>
            {yearEvents.map((e) => (
              <button
                key={e.id}
                data-testid="event-chip"
                className={`ev-chip${selectedEventId === e.id ? ' on' : ''}`}
                style={{ ['--c' as never]: EVENT_TYPE_COLORS[e.type] }}
                onClick={() => selectEvent(e.id)}
                title={e.summary}
              >
                {e.title}
              </button>
            ))}
          </>
        ) : (
          <span className="tl-events-empty" data-testid="tl-no-events">
            {yearLabel(year)} 无纪事
            {prevEvt !== null && (
              <button className="link-btn" onClick={() => setYear(prevEvt)}>
                ← {yearLabel(prevEvt)}
              </button>
            )}
            {nextEvt !== null && (
              <button className="link-btn" onClick={() => setYear(nextEvt)}>
                {yearLabel(nextEvt)} →
              </button>
            )}
          </span>
        )}
      </div>

      <div
        className="tl-body"
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHover(null)}
      >
        {/* ① 事件密度 */}
        <div className="tl-density" title="每 5 年的事件数 —— 越高说明这段历史越密">
          {EVENT_BUCKETS.map((b) => (
            <div
              key={b.from}
              className="tl-bar"
              style={{
                left: `${pct(b.from)}%`,
                width: `${(5 / SPAN) * 100}%`,
                height: `${Math.max(6, (b.count / maxCount) * 100)}%`,
              }}
            />
          ))}
          {EVENTS.map((e) => (
            <div
              key={e.id}
              className="tl-event-tick"
              style={{ left: `${pct(e.y)}%` }}
              onClick={(ev) => {
                ev.stopPropagation();
                selectEvent(e.id);
                setYear(e.y, { keepSelection: true });
              }}
              title={`${e.y} ${e.title}`}
            />
          ))}
        </div>

        {/* ② 状态区间：每一个刻度就是一次疆域变更 */}
        <div className="tl-intervals" title="每个刻度 = 一次疆域变更；区间内疆域完全不变">
          {TRANSITIONS.map((t, i) => (
            <div
              key={t.year}
              className={`tl-interval-cell${i === intervalIdx ? ' active' : ''}${transitionYears.has(t.year) ? ' change' : ''}`}
              style={{ left: `${pct(t.year)}%`, width: `${pct(TRANSITIONS[i + 1]?.year ?? RANGE.to) - pct(t.year)}%` }}
            />
          ))}
        </div>

        {/* ③ 政权泳道 */}
        <div className="tl-lanes">
          {lanes.map((lane, i) => (
            <div className="tl-lane" key={i}>
              {lane.map((bar) => {
                const polity = POLITIES.find((p) => p.id === bar.id)!;
                const active = year >= bar.from && year < bar.to;
                return (
                  <div
                    key={bar.id}
                    className={`tl-span${active ? ' active' : ''}`}
                    style={{
                      left: `${pct(bar.from)}%`,
                      width: `${pct(bar.to) - pct(bar.from)}%`,
                      background: polity.color,
                      opacity: active ? 1 : 0.42,
                    }}
                    title={`${polity.name}　${yearLabel(bar.from)}–${yearLabel(bar.to)}`}
                  >
                    <span>{polity.name}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* ④ 游标 */}
        <div className="tl-cursor" data-testid="tl-cursor" style={{ left: `${pct(year)}%` }}>
          <div className="tl-cursor-knob" />
          <div className="tl-cursor-line" />
        </div>

        {hover && (
          <div className="tl-hover" style={{ left: `${hover.x}px` }}>
            {yearLabel(hover.year)}
          </div>
        )}
      </div>
    </div>
  );
}
