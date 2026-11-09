import type { Node, Prop } from '../model/types.ts';
import type { AnchorMode } from '../spec/generated.ts';

export interface CanvasTarget {
  kind: 'widget' | 'phone';
  w: number;
  h: number;
  screens?: number;
  offset?: number;
}

export type AnchorType = AnchorMode;

export interface Box {
  w: number;
  h: number;
  pad: [number, number, number, number]; // left, top, right, bottom
  x?: number;
  y?: number;
}

export interface Transform {
  x: number;
  y: number;
  rot: number;
  scaleX: number;
  scaleY: number;
}

export interface LayoutNode {
  id: string;
  type: string;
  title: string;
  node: Node;
  box: Box;
  transform: Transform;
  resolvedProps: Record<string, unknown>;
  unit: number;
  childUnit: number;
  children: LayoutNode[];
  parent?: LayoutNode;
  visible: boolean;
  removed: boolean;
}
