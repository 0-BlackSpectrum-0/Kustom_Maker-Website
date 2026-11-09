// src/ui/targets/widget-sizes.ts

export interface WidgetSizePreset {
  id: string;
  name: string;
  cols: number;
  rows: number;
  width: number;
  height: number;
}

/**
 * Standard widget sizes calibrated against corpus samples and 70n-30 dp guidelines.
 * See plan.md Appendix B.
 */
export const WIDGET_SIZE_PRESETS: WidgetSizePreset[] = [
  { id: '1x1', name: '1x1 Small', cols: 1, rows: 1, width: 165, height: 226 },
  { id: '2x1', name: '2x1 Bar', cols: 2, rows: 1, width: 415, height: 226 },
  { id: '2x2', name: '2x2 Square (Default)', cols: 2, rows: 2, width: 415, height: 542 },
  { id: '3x3', name: '3x3 Medium', cols: 3, rows: 3, width: 667, height: 858 },
  { id: '4x1', name: '4x1 Header Bar', cols: 4, rows: 1, width: 916, height: 226 },
  { id: '4x2', name: '4x2 Wide (Standard)', cols: 4, rows: 2, width: 916, height: 542 },
  { id: '4x4', name: '4x4 Full Page', cols: 4, rows: 4, width: 916, height: 1169 },
  { id: '5x5', name: '5x5 Extra Large', cols: 5, rows: 5, width: 1145, height: 1461 },
];

export function getWidgetSizePreset(id: string): WidgetSizePreset | undefined {
  return WIDGET_SIZE_PRESETS.find((p) => p.id === id);
}
