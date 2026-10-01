import { EVENTS, POLITIES, SEGMENTS } from '../data/atlas';
import { PLACES } from '../data/places';
import { COVERAGE, coverageAt } from '../data/governance';
import { SOURCES } from '../data/sources';
import { yearLabel } from '../data/state';
import { useApp } from '../state/store';

/**
 * 资料覆盖面板。
 *
 * 方法学来自 HistoryMapV2：**空白表示尚缺资料，不表示当时没有政权或事件。**
 * 与其在页脚写一句「本图仅供参考」，不如把缺口逐条摆出来 ——
 * 用户能据此判断哪些部分可以信、哪些不能。
 */

const STATUS_LABEL = { verified: '已核验', pending: '待完善', missing: '资料缺失' } as const;
const TOPIC_LABEL = { territory: '疆域', event: '事件', place: '地点', provenance: '出处' } as const;

export default function CoveragePanel() {
  const year = useApp((s) => s.year);
  const entries = coverageAt(year);

  const records = [...SEGMENTS, ...EVENTS, ...PLACES];
  const verified = records.filter((r) => r.review.status === 'verified');
  const deep = verified.filter((r) => r.review.depth === 'source').length;
  const human = verified.filter((r) => r.review.reviewerKind === 'human').length;
  const noLocator = records.filter((r) => r.evidence.every((e) => !e.locator)).length;
  const denied = SOURCES.filter((s) => s.redistribution === 'denied').length;

  const missing = entries.filter((e) => e.status === 'missing').length;

  return (
    <aside className="legend coverage-panel">
      <div className="legend-head">
        <h2>资料覆盖</h2>
        <p className="muted">
          <strong>空白表示尚缺资料，不表示当时没有政权或事件。</strong>
          底图为现代自然地理参考，不是历史政区。
        </p>
      </div>

      <dl className="cov-summary">
        <div>
          <dt>{yearLabel(year)} 涉及缺口</dt>
          <dd>
            {entries.length} 项{missing > 0 && <span className="cov-bad"> · 其中 {missing} 项完全缺失</span>}
          </dd>
        </div>
        <div>
          <dt>agent 已核验</dt>
          <dd>
            {verified.length} / {records.length}
            <span className="cov-warn"> · 逐条比对 {deep}</span>
          </dd>
        </div>
        <div>
          <dt>人工审定</dt>
          <dd>
            {human} 条<span className="cov-bad"> · 未经专家复核</span>
          </dd>
        </div>
        <div>
          <dt>页码级定位</dt>
          <dd>
            {records.length - noLocator} / {records.length} 条已填
          </dd>
        </div>
        <div>
          <dt>受限来源</dt>
          <dd>{denied} 个（仅引用，未分发数据）</dd>
        </div>
      </dl>

      <ul className="cov-list">
        {entries.map((c) => (
          <li key={c.id} data-coverage-id={c.id} className={`cov-item ${c.status}`}>
            <div className="cov-head">
              <span className={`cov-status ${c.status}`}>{STATUS_LABEL[c.status]}</span>
              <strong>{TOPIC_LABEL[c.topic]}</strong>
              <span className="muted">
                {yearLabel(c.startYear)}—{yearLabel(c.endYear)}
              </span>
            </div>
            <p>{c.reason}</p>
          </li>
        ))}
      </ul>

      <p className="legend-license">
        共 {COVERAGE.length} 项覆盖记录 · {POLITIES.length} 政权 / {SEGMENTS.length} 疆域段 / {EVENTS.length} 事件 /{' '}
        {PLACES.length} 地点 / {SOURCES.length} 来源。
        <br />
        <strong>人工审定 0 条。</strong>已核验的出自 agent（claude），范围仅限年代与政权归属 ——
        <strong>边界几何未做控制点配准，事件因果未复核</strong>。机械校验与单元测试不等于史料复核。
      </p>
    </aside>
  );
}
