import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MLMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { EVENTS, POLITIES, SEGMENTS } from '../data/atlas';
import { PLACES } from '../data/places';
import { polygonCentroid } from '../data/geom';
import { activeSegmentsAt } from '../data/state';
import { useApp, effectiveVisibleControls } from '../state/store';
import { CONTROL_STYLES, EVENT_IMPORTANCE_RADIUS, EVENT_TYPE_COLORS } from './controlStyles';

/** 底图资源用绝对 URL：内联 style 对象里 MapLibre 解析相对路径不可靠 */
const BASE = new URL(import.meta.env.BASE_URL, window.location.href).href;

/** 只放自然地理要素。绝不含现代国界线。 */
const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'dynastic-atlas',
  sources: {
    land: { type: 'geojson', data: `${BASE}basemap/land.geojson` },
    lakes: { type: 'geojson', data: `${BASE}basemap/lakes.geojson` },
    rivers: { type: 'geojson', data: `${BASE}basemap/rivers.geojson` },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#12171f' } },
    { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#1f2530', 'fill-opacity': 1 } },
    { id: 'land-edge', type: 'line', source: 'land', paint: { 'line-color': '#39424f', 'line-width': 0.6, 'line-opacity': 0.8 } },
    { id: 'lakes', type: 'fill', source: 'lakes', paint: { 'fill-color': '#16222e', 'fill-opacity': 1 } },
    {
      id: 'rivers',
      type: 'line',
      source: 'rivers',
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': '#26384a', 'line-width': 1.1, 'line-opacity': 0.9 },
    },
  ],
};

function toFeatures() {
  const territories = {
    type: 'FeatureCollection' as const,
    features: SEGMENTS.map((s) => {
      const polity = POLITIES.find((p) => p.id === s.polityId);
      return {
        type: 'Feature' as const,
        properties: {
          id: s.id,
          polityId: s.polityId,
          name: polity?.name ?? s.polityId,
          color: polity?.color ?? '#888',
          control: s.control,
          borderPrecision: s.borderPrecision,
          confidence: s.confidence,
          note: s.note ?? '',
          from: s.from,
          to: s.to,
        },
        geometry: { type: 'Polygon' as const, coordinates: [s.geometry] },
      };
    }),
  };

  const events = {
    type: 'FeatureCollection' as const,
    features: EVENTS.map((e) => ({
      type: 'Feature' as const,
      properties: {
        id: e.id,
        title: e.title,
        y: e.y,
        importance: e.importance,
        baseRadius: EVENT_IMPORTANCE_RADIUS[e.importance] ?? 5,
        color: EVENT_TYPE_COLORS[e.type] ?? '#d9a441',
      },
      geometry: { type: 'Point' as const, coordinates: e.at },
    })),
  };

  return { territories, events };
}

/** 年份进入绘制表达式 —— 用透明度过渡实现「离去面淡出、新来面淡入」 */
const activeFactor = (year: number) => [
  'case',
  ['all', ['<=', ['get', 'from'], year], ['>', ['get', 'to'], year]],
  1,
  0,
];

const ctlVisible = (visible: string[]) =>
  ['match', ['get', 'control'], ...CONTROL_STYLES.flatMap((c) => [c.level, visible.includes(c.level) ? 1 : 0]), 0];

const baseFill = [
  'match',
  ['get', 'control'],
  'core', 0.55,
  'military', 0.26,
  'indirect', 0.2,
  'tributary', 0,
  'nominal', 0.07,
  'raided', 0,
  0,
];

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const year = useApp((s) => s.year);
  const hiddenControls = useApp((s) => s.hiddenControls);
  const showOnlyCore = useApp((s) => s.showOnlyCore);
  const showLabels = useApp((s) => s.showLabels);
  const showRivers = useApp((s) => s.showRivers);
  const showPlaces = useApp((s) => s.showPlaces);
  const selectedEventId = useApp((s) => s.selectedEventId);
  const selectEvent = useApp((s) => s.selectEvent);
  const selectPolity = useApp((s) => s.selectPolity);
  const setYear = useApp((s) => s.setYear);

  const visible = effectiveVisibleControls({ hiddenControls, showOnlyCore });

  // ── 初始化 ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: [105, 34],
      zoom: 3.1,
      minZoom: 2.2,
      maxZoom: 9,
      maxBounds: [
        [55, 2],
        [152, 60],
      ],
      attributionControl: { compact: true },
      dragRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;
    // 调试句柄：地图类应用在控制台直接读内部状态，比截图猜快得多
    (window as unknown as { __atlasMap?: MLMap }).__atlasMap = map;

    map.on('error', (e) => {
      const msg = e.error?.message ?? String(e);
      setWarnings((w) => (w.includes(msg) ? w : [...w, msg].slice(-6)));
    });

    map.on('load', () => {
      try {
        addAtlasLayers(map);
        const { territories, events } = toFeatures();
        (map.getSource('territories') as maplibregl.GeoJSONSource).setData(territories);
        (map.getSource('events') as maplibregl.GeoJSONSource).setData(events);
        setReady(true);
        map.resize();
      } catch (err) {
        // 静默失败过一次，代价是一张全黑的地图。这里必须喊出来。
        console.error('[atlas] 图层装配失败', err);
        setFatal(err instanceof Error ? err.message : String(err));
        return;
      }

      map.on('click', 'event-dot', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        selectEvent(f.properties?.id as string);
        setYear(f.properties?.y as number, { keepSelection: true });
      });
      map.on('click', 'terr-fill', (e) => {
        const f = e.features?.[0];
        if (f) selectPolity(f.properties?.polityId as string);
      });
      for (const layer of ['event-dot', 'event-halo', 'terr-fill']) {
        map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''));
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 下面每个 effect 都必须等 ready —— 首次挂载时地图还没 load，
  // 只靠 loadedRef 会在 load 之前返回一次，然后再也不重跑，绘制表达式永远应用不上。

  // ── 年份 / 控制层级 → 绘制表达式 ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const act = activeFactor(year);
    const vis = ctlVisible(visible);

    map.setPaintProperty('terr-fill', 'fill-opacity', ['*', ['*', baseFill, vis], act]);
    map.setPaintProperty('terr-halo', 'line-opacity', ['*', 0.16, ['*', vis, act]]);
    for (const s of CONTROL_STYLES) {
      map.setPaintProperty(`terr-line-${s.level}`, 'line-opacity', [
        '*',
        s.lineOpacity,
        ['*', ['case', visible.includes(s.level), 1, 0], act],
      ]);
    }
    // 事件只画当年。时间轴走到哪，就只看那一刻发生了什么 —— 不是把所有事件摊在图上。
    map.setFilter('event-dot', ['==', ['get', 'y'], year]);
    map.setFilter('event-halo', ['==', ['get', 'y'], year]);
    map.setFilter('event-selected', [
      'all',
      ['==', ['get', 'y'], year],
      ['==', ['get', 'id'], selectedEventId ?? ''],
    ]);
  }, [year, visible, ready, selectedEventId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setLayoutProperty('rivers', 'visibility', showRivers ? 'visible' : 'none');
  }, [showRivers, ready]);

  // ── 面板里的「在地图上聚焦」 ──
  useEffect(() => {
    const onFocus = (e: Event) => {
      const detail = (e as CustomEvent<{ at: [number, number]; zoom?: number }>).detail;
      const map = mapRef.current;
      if (!map || !detail?.at) return;
      map.flyTo({ center: detail.at, zoom: detail.zoom ?? 6, duration: 900, essential: true });
    };
    window.addEventListener('atlas:focus-internal', onFocus);
    return () => window.removeEventListener('atlas:focus-internal', onFocus);
  }, []);

  // ── 政权标签 / 都城点位（HTML marker，直接支持中文，无需 glyph 服务）──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    for (const m of markersRef.current) m.remove();
    markersRef.current = [];
    if (!showLabels) return;

    const seen = new Set<string>();
    for (const seg of activeSegmentsAt(year)) {
      if (!visible.includes(seg.control)) continue;
      const polity = POLITIES.find((p) => p.id === seg.polityId);
      if (!polity || seen.has(polity.id)) continue;
      seen.add(polity.id);

      const el = document.createElement('button');
      el.className = 'map-label';
      el.textContent = polity.name;
      el.style.setProperty('--c', polity.color);
      el.title = `${polity.name}（${polity.from < 0 ? `前${-polity.from}` : polity.from}–${polity.to}）`;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        selectPolity(polity.id);
      });
      markersRef.current.push(
        new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(polygonCentroid(seg.geometry)).addTo(map),
      );

    }
  }, [year, visible, showLabels, selectPolity, ready]);

  // ── 城市、关隘、军镇 ──
  // 用 HTML marker 而不是 GL 图层：中文标签不需要 glyph 服务，图标也能按类型定制。
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const created: Marker[] = [];

    const render = () => {
      for (const m of created) m.remove();
      created.length = 0;
      if (!showPlaces) return;
      const zoom = map.getZoom();
      for (const pl of PLACES) {
        if (!(pl.from <= year && year < pl.to)) continue;
        if (pl.rank === 2 && zoom < 4.2) continue;
        const el = document.createElement('div');
        el.className = `map-place ${pl.kind}`;
        el.innerHTML = `<i></i><span>${pl.name}</span>`;
        el.title = pl.note ? `${pl.name} · ${pl.note}` : pl.name;
        created.push(new maplibregl.Marker({ element: el, anchor: 'left' }).setLngLat(pl.at).addTo(map));
      }
    };

    render();
    map.on('zoomend', render);
    return () => {
      map.off('zoomend', render);
      for (const m of created) m.remove();
    };
  }, [year, ready, showPlaces]);

  return (
    <>
      <div className="map-root" ref={containerRef} />
      {fatal && (
        <div className="map-error">
          <strong>地图图层装配失败</strong>
          <pre>{fatal}</pre>
        </div>
      )}
      {!fatal && warnings.length > 0 && (
        <div className="map-warn" title={warnings.join('\n')}>
          ⚠ 地图告警 {warnings.length}
        </div>
      )}
    </>
  );
}

function addAtlasLayers(map: MLMap) {
  map.addSource('territories', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addSource('events', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

  // 光晕层：P0 全部 borderPrecision=1，用柔化边缘明确「这是示意」
  map.addLayer({
    id: 'terr-halo',
    type: 'line',
    source: 'territories',
    filter: ['==', ['get', 'borderPrecision'], 1],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': 7, 'line-blur': 6, 'line-opacity': 0 },
  });

  map.addLayer({
    id: 'terr-fill',
    type: 'fill',
    source: 'territories',
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0, 'fill-antialias': true },
  });

  for (const style of CONTROL_STYLES) {
    map.addLayer({
      id: `terr-line-${style.level}`,
      type: 'line',
      source: 'territories',
      filter: ['==', ['get', 'control'], style.level],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['get', 'color'],
        ...(style.dash ? { 'line-dasharray': style.dash } : {}),
        'line-width': style.width,
        'line-opacity': 0,
      },
    });
  }

  map.addLayer({
    id: 'event-halo',
    type: 'circle',
    source: 'events',
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['*', ['get', 'baseRadius'], 2.6],
      'circle-opacity': 0.32,
      'circle-blur': 1,
    },
  });

  map.addLayer({
    id: 'event-dot',
    type: 'circle',
    source: 'events',
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['get', 'baseRadius'],
      'circle-stroke-color': '#0f1319',
      'circle-stroke-width': 1,
      'circle-opacity': 0.95,
    },
  });

  map.addLayer({
    id: 'event-selected',
    type: 'circle',
    source: 'events',
    filter: ['==', ['get', 'id'], ''],
    paint: {
      'circle-color': 'transparent',
      'circle-radius': ['+', ['*', ['get', 'baseRadius'], 2], 6],
      'circle-stroke-color': '#e8e3d9',
      'circle-stroke-width': 1.6,
      'circle-opacity': 0.95,
    },
  });

  // 过渡只能走 setPaintProperty。这几行是「连续查看」的关键：
  // 年份一变，离去面淡出、新来面淡入，而不是硬跳。
  const fade = { duration: 450, delay: 0 };
  map.setPaintProperty('terr-fill', 'fill-opacity-transition', fade);
  map.setPaintProperty('terr-halo', 'line-opacity-transition', fade);
  for (const style of CONTROL_STYLES) {
    map.setPaintProperty(`terr-line-${style.level}`, 'line-opacity-transition', fade);
  }
  map.setPaintProperty('event-dot', 'circle-opacity-transition', { duration: 400, delay: 0 });
  map.setPaintProperty('event-halo', 'circle-opacity-transition', { duration: 400, delay: 0 });
}
