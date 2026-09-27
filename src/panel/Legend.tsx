import { CONTROL_STYLES } from '../map/controlStyles';
import { PLACES } from '../data/places';
import { SEGMENTS } from '../data/atlas';
import { useApp, effectiveVisibleControls } from '../state/store';
import type { ValidationIssue } from '../data/validate';

export const DATASET_VERSION = 'v0.1.0-p0 · 2025-09-27';

export default function Legend({ issues }: { issues: ValidationIssue[] }) {
  const hiddenControls = useApp((s) => s.hiddenControls);
  const showOnlyCore = useApp((s) => s.showOnlyCore);
  const toggleControl = useApp((s) => s.toggleControl);
  const setShowOnlyCore = useApp((s) => s.setShowOnlyCore);
  const showRivers = useApp((s) => s.showRivers);
  const toggleRivers = useApp((s) => s.toggleRivers);
  const showLabels = useApp((s) => s.showLabels);
  const toggleLabels = useApp((s) => s.toggleLabels);
  const showPlaces = useApp((s) => s.showPlaces);
  const togglePlaces = useApp((s) => s.togglePlaces);

  const visible = effectiveVisibleControls({ hiddenControls, showOnlyCore });
  const errors = issues.filter((i) => i.level === 'error');

  return (
    <aside className="legend">
      <div className="legend-head">
        <h2>控制强度</h2>
        <p className="muted">
          古代没有现代意义的国界线。同一块地，是编户齐民还是仅一纸册封，差别远大于一条线的位置。
        </p>
      </div>

      <ul className="legend-list">
        {CONTROL_STYLES.map((c) => {
          const on = visible.includes(c.level);
          const count = SEGMENTS.filter((s) => s.control === c.level).length;
          return (
            <li key={c.level}>
              <button className={`legend-row${on ? '' : ' off'}`} onClick={() => toggleControl(c.level)}>
                <span className={`swatch sw-${c.level}`} aria-hidden />
                <span className="legend-text">
                  <span className="legend-label">
                    {c.label}
                    <span className="legend-count">{count}</span>
                  </span>
                  <span className="legend-desc">{c.desc}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="legend-actions">
        <button className={`chip${showOnlyCore ? ' on' : ''}`} onClick={() => setShowOnlyCore(!showOnlyCore)}>
          只看实际控制
        </button>
        <button className={`chip${showRivers ? ' on' : ''}`} onClick={toggleRivers}>
          水系
        </button>
        <button className={`chip${showPlaces ? ' on' : ''}`} onClick={togglePlaces}>
          城关
        </button>
        <button className={`chip${showLabels ? ' on' : ''}`} onClick={toggleLabels}>
          政权名
        </button>
      </div>

      <div className="legend-note">
        <strong>本图边界为示意。</strong>
        所有面均按粗略精度绘制（<code>borderPrecision = 1</code>），边缘做了柔化处理，
        以区别于有明确条约或政区依据的边界。P0 阶段的目标是验证交互与视觉语言，不是可引用的学术成果。
      </div>

      <dl className="legend-meta">
        <div>
          <dt>数据版本</dt>
          <dd>{DATASET_VERSION}</dd>
        </div>
        <div>
          <dt>疆域段</dt>
          <dd>{SEGMENTS.length} 段</dd>
        </div>
        <div>
          <dt>地点</dt>
          <dd>{PLACES.length} 处</dd>
        </div>
        <div>
          <dt>校验</dt>
          <dd>{errors.length === 0 ? '全部通过' : `${errors.length} 项错误`}</dd>
        </div>
      </dl>

      {errors.length > 0 && (
        <div className="legend-errors">
          <strong>数据校验未通过</strong>
          <ul>
            {errors.slice(0, 6).map((e, i) => (
              <li key={i}>
                <code>{e.where}</code> {e.what}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="legend-license">
        参考：谭其骧《中国历史地图集》（人工重绘，未复制其数据）；CHGIS v6 治所点位。底图为 Natural Earth 自然地理要素，<strong>不含现代国界</strong>。
      </p>
    </aside>
  );
}
