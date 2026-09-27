import { EVENTS, POLITIES, SOURCES } from '../data/atlas';
import { segmentsOfPolity, yearLabel } from '../data/state';
import { CONFIDENCE_LABEL, CONTROL_LABEL, EVENT_TYPE_COLORS, CONTROL_BY_LEVEL } from '../map/controlStyles';
import { useApp } from '../state/store';

const sourceById = new Map(SOURCES.map((s) => [s.id, s]));

const politiesOfEvent = (ids: string[]) => ids.map((id) => POLITIES.find((p) => p.id === id)).filter(Boolean);

function FocusButton({ at, zoom }: { at: [number, number]; zoom?: number }) {
  return (
    <button
      className="link-btn"
      onClick={() => window.dispatchEvent(new CustomEvent('atlas:focus', { detail: { at, zoom } }))}
    >
      在地图上聚焦
    </button>
  );
}

export default function SidePanel() {
  const selectedEventId = useApp((s) => s.selectedEventId);
  const selectedPolityId = useApp((s) => s.selectedPolityId);
  const selectEvent = useApp((s) => s.selectEvent);
  const selectPolity = useApp((s) => s.selectPolity);
  const setYear = useApp((s) => s.setYear);
  const year = useApp((s) => s.year);

  const event = selectedEventId ? EVENTS.find((e) => e.id === selectedEventId) : null;
  const polity = !event && selectedPolityId ? POLITIES.find((p) => p.id === selectedPolityId) : null;

  if (!event && !polity) return null;

  const close = () => {
    selectEvent(null);
    selectPolity(null);
  };

  if (event) {
    const idx = EVENTS.findIndex((e) => e.id === event.id);
    const prev = EVENTS[idx - 1];
    const next = EVENTS[idx + 1];
    const src = sourceById.get(event.sourceId);

    return (
      <aside className="side-panel">
        <button className="close-btn" onClick={close} aria-label="关闭">
          ✕
        </button>

        <div className="sp-meta">
          <span className="sp-year">{yearLabel(event.y)}{event.m ? ` ${event.m}月` : ''}</span>
          <span className="sp-type" style={{ background: EVENT_TYPE_COLORS[event.type] }}>
            {event.type}
          </span>
          <span className="sp-importance" title={`重要度 ${event.importance}/5`}>
            {'●'.repeat(event.importance)}
            <span className="dim">{'●'.repeat(5 - event.importance)}</span>
          </span>
        </div>

        <h2 className="sp-title">{event.title}</h2>
        <p className="sp-place">📍 {event.place}</p>
        <p className="sp-summary">{event.summary}</p>

        {event.persons.length > 0 && (
          <div className="sp-block">
            <h3>相关人物</h3>
            <div className="chips">
              {event.persons.map((p) => (
                <span className="chip static" key={p}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {politiesOfEvent(event.polityIds).length > 0 && (
          <div className="sp-block">
            <h3>相关政权</h3>
            <div className="chips">
              {politiesOfEvent(event.polityIds).map((p) => (
                <button
                  key={p!.id}
                  className="chip polity"
                  style={{ borderColor: p!.color, color: p!.color }}
                  onClick={() => {
                    selectEvent(null);
                    selectPolity(p!.id);
                  }}
                >
                  {p!.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="sp-block">
          <h3>出处</h3>
          <p className="src">
            {src?.work}
            {src?.locus ? `·${src.locus}` : ''}
          </p>
        </div>

        <div className="sp-actions">
          <button className="primary" onClick={() => setYear(event.y, { keepSelection: true })}>
            跳到 {yearLabel(event.y)}
          </button>
          <FocusButton at={event.at} zoom={6} />
        </div>

        <div className="sp-nav">
          <button disabled={!prev} onClick={() => prev && (selectEvent(prev.id), setYear(prev.y, { keepSelection: true }))}>
            ← {prev ? prev.title : ''}
          </button>
          <button disabled={!next} onClick={() => next && (selectEvent(next.id), setYear(next.y, { keepSelection: true }))}>
            {next ? next.title : ''} →
          </button>
        </div>
      </aside>
    );
  }

  const segments = segmentsOfPolity(polity!.id);
  const activeHere = segments.filter((s) => s.from <= year && s.to > year);

  return (
    <aside className="side-panel">
      <button className="close-btn" onClick={close} aria-label="关闭">
        ✕
      </button>

      <div className="sp-meta">
        <span className="sp-year">
          {yearLabel(polity!.from)} – {yearLabel(polity!.to)}
        </span>
        <span className="sp-type" style={{ background: polity!.color, color: '#12151a' }}>
          {polity!.name}
        </span>
      </div>

      <h2 className="sp-title" style={{ color: polity!.color }}>
        {polity!.name}
      </h2>
      {polity!.aliases && <p className="sp-place">又称：{polity!.aliases.join('、')}</p>}
      {polity!.capital && (
        <p className="sp-place">
          📍 都城 {polity!.capital.name}
          <FocusButton at={polity!.capital.at} zoom={6} />
        </p>
      )}
      {polity!.note && <p className="sp-summary">{polity!.note}</p>}

      <div className="sp-block">
        <h3>疆域分期（当前年份所在的一段已高亮）</h3>
        <ul className="seg-list">
          {segments.map((s) => {
            const src = sourceById.get(s.sourceId);
            const isNow = activeHere.includes(s);
            const cs = CONTROL_BY_LEVEL.get(s.control)!;
            return (
              <li key={s.id} className={isNow ? 'now' : ''}>
                <div className="seg-head">
                  <span className={`swatch sw-${s.control}`} />
                  <strong>{CONTROL_LABEL.get(s.control)}</strong>
                  <span className="muted">
                    {yearLabel(s.from)}–{yearLabel(s.to)}
                  </span>
                </div>
                <div className="seg-meta">
                  边界精度 {s.borderPrecision}/3 · {CONFIDENCE_LABEL[s.confidence]}
                </div>
                {s.note && <div className="seg-note">{s.note}</div>}
                <div className="seg-src">
                  出处：{src?.work}
                  {src?.locus ? `·${src.locus}` : ''}
                </div>
                <div className="seg-legend">{cs?.desc}</div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
