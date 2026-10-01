import type { Confidence, ControlLevel, EventType, SpatialPrecision } from '../data/types';

/**
 * 控制强度六级 —— 本项目的核心视觉语言（DESIGN.md §4）。
 * 目标：地图上任何一块面，用户都能立刻看出「这是哪一种控制」。
 */
export interface ControlStyle {
  level: ControlLevel;
  label: string;
  desc: string;
  fillOpacity: number;
  lineOpacity: number;
  dash: number[] | null;
  width: number;
}

export const CONTROL_STYLES: ControlStyle[] = [
  { level: 'core', label: '直辖', desc: '郡县而治，编户齐民', fillOpacity: 0.55, lineOpacity: 1, dash: null, width: 1.5 },
  { level: 'military', label: '军事控制', desc: '都护府、军镇，驻兵而不编户', fillOpacity: 0.36, lineOpacity: 0.9, dash: [5, 2.5], width: 1.5 },
  { level: 'indirect', label: '羁縻', desc: '当地首领世袭，中央不派官', fillOpacity: 0.22, lineOpacity: 0.8, dash: [1.5, 2.2], width: 2 },
  { level: 'tributary', label: '朝贡', desc: '独立政权，名义上称臣入贡', fillOpacity: 0, lineOpacity: 0.85, dash: [8, 4], width: 2.2 },
  { level: 'nominal', label: '名义册封', desc: '仅一纸册封，无实际支配', fillOpacity: 0.07, lineOpacity: 0.6, dash: [1, 4.5], width: 1.5 },
  { level: 'raided', label: '一度深入', desc: '兵锋所至，旋即退返', fillOpacity: 0, lineOpacity: 0.7, dash: [2, 6], width: 2 },
];

export const CONTROL_BY_LEVEL = new Map(CONTROL_STYLES.map((c) => [c.level, c]));
export const CONTROL_LABEL = new Map(CONTROL_STYLES.map((c) => [c.level, c.label]));

export const SPATIAL_LABEL: Record<SpatialPrecision, string> = {
  specified: '边界有明确依据',
  approximate: '边界为示意',
  disputed: '边界有争议',
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: '可信度高',
  medium: '可信度中',
  low: '可信度低',
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  战争: '#e05c4b',
  和议: '#5fb0a8',
  迁都: '#c9a227',
  变法: '#8f7fd4',
  灾害: '#a8712f',
  人物: '#d9a441',
  科技: '#4f9ad4',
  宗教: '#b07aa1',
  建制: '#8fb56b',
};

export const EVENT_IMPORTANCE_RADIUS: Record<number, number> = { 1: 3, 2: 4, 3: 5.5, 4: 7, 5: 9 };
