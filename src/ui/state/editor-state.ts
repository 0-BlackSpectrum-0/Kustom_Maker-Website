import { signal } from '@preact/signals';
import type { Doc, Node, Prop } from '../../core/model/types.ts';
import type { CanvasTarget } from '../../core/layout/types.ts';
import type { SimState } from '../../core/formula/types.ts';
import type { ValidationReport } from '../../core/validate/types.ts';
import { defaultSimState } from '../../core/formula/sim/sim-state.ts';
import { validateDoc } from '../../core/validate/validator.ts';

export function createDefaultDoc(): Doc {
  const bg: Node = {
    id: 'bg',
    type: 'ShapeModule',
    title: 'Background',
    props: {
      shape_type: { value: 'RECT' },
      shape_width: { value: 380 },
      shape_height: { value: 500 },
      shape_corners: { value: 32 },
      paint_color: { value: '#FF121214' },
    },
    extras: {},
  };

  const clockText: Node = {
    id: 'clock',
    type: 'TextModule',
    title: 'Clock Hours',
    props: {
      text_expression: { value: '$df(hh)$' },
      text_size: { value: 72 },
      paint_color: { value: '#FFFFFFFF' },
      position_anchor: { value: 'CENTER' },
      position_offset_y: { value: -40 },
    },
    extras: {},
  };

  const minText: Node = {
    id: 'clock_min',
    type: 'TextModule',
    title: 'Clock Minutes',
    props: {
      text_expression: { value: '$df(mm)$' },
      text_size: { value: 72 },
      paint_color: { value: '#FFA1A1AA' },
      position_anchor: { value: 'CENTER' },
      position_offset_y: { value: 40 },
    },
    extras: {},
  };

  const redDot: Node = {
    id: 'dot',
    type: 'ShapeModule',
    title: 'Accent Dot',
    props: {
      shape_type: { value: 'CIRCLE' },
      shape_width: { value: 12 },
      shape_height: { value: 12 },
      paint_color: { value: '#FFD71921' },
      position_anchor: { value: 'CENTER' },
      position_offset_x: { value: 65 },
      position_offset_y: { value: -55 },
    },
    extras: {},
  };

  return {
    kind: 'kwgt',
    info: {
      title: 'Nothing Clock',
      author: 'KustomWeb',
      description: 'Default Nothing-style clock widget',
      version: 13,
      release: 377435216,
      width: 415,
      height: 542,
      locked: false,
    },
    root: {
      id: 'root',
      type: 'RootLayerModule',
      title: 'Root',
      props: {
        background_color: { value: '#00000000' },
      },
      children: [bg, clockText, minText, redDot],
      extras: {},
    },
    globals: {},
    assets: new Map(),
    thumbs: {},
    extras: {},
  };
}

const initialDoc = createDefaultDoc();
export const currentDoc = signal<Doc | null>(initialDoc);
export const selectedNodeId = signal<string | null>('root');
export const canvasTarget = signal<CanvasTarget>({
  kind: 'widget',
  w: 415,
  h: 542,
  screens: 1,
  offset: 0.5,
});
export const simState = signal<SimState>(defaultSimState());
export const zoom = signal<number>(1.0);
export const pan = signal<{ x: number; y: number }>({ x: 0, y: 0 });
export const activeTab = signal<'layers' | 'globals' | 'assets'>('layers');
export const activeDrawerTab = signal<'formula' | 'problems' | 'compare'>('formula');
export const drawerOpen = signal<boolean>(false);
export const activeTool = signal<'select' | 'hand' | 'shape' | 'text' | 'icon' | 'image'>('select');
export const validationReport = signal<ValidationReport | null>(validateDoc(initialDoc));
export const showGridOverlay = signal<boolean>(false);
export const showDeviceFrame = signal<boolean>(false);
export const currentProfileId = signal<string>('preset');
export const targetOrientation = signal<'portrait' | 'landscape'>('portrait');
export const multiSizeModalOpen = signal<boolean>(false);
export const exportModalOpen = signal<boolean>(false);

export function setTargetSize(w: number, h: number, profileId: string = 'custom') {
  currentProfileId.value = profileId;
  const isLandscape = targetOrientation.value === 'landscape';
  canvasTarget.value = {
    ...canvasTarget.value,
    w: isLandscape ? Math.max(w, h) : Math.min(w, h),
    h: isLandscape ? Math.min(w, h) : Math.max(w, h),
  };
}

export function toggleOrientation() {
  const next = targetOrientation.value === 'portrait' ? 'landscape' : 'portrait';
  targetOrientation.value = next;
  canvasTarget.value = {
    ...canvasTarget.value,
    w: canvasTarget.value.h,
    h: canvasTarget.value.w,
  };
}

// History
const undoStack = signal<Doc[]>([]);
const redoStack = signal<Doc[]>([]);

export function pushHistory(doc: Doc) {
  undoStack.value = [...undoStack.value, JSON.parse(JSON.stringify(doc))];
  redoStack.value = [];
}

export function undo() {
  if (undoStack.value.length === 0 || !currentDoc.value) return;
  const prev = undoStack.value[undoStack.value.length - 1];
  redoStack.value = [...redoStack.value, JSON.parse(JSON.stringify(currentDoc.value))];
  undoStack.value = undoStack.value.slice(0, -1);
  currentDoc.value = prev;
  validateCurrent();
}

export function redo() {
  if (redoStack.value.length === 0 || !currentDoc.value) return;
  const next = redoStack.value[redoStack.value.length - 1];
  undoStack.value = [...undoStack.value, JSON.parse(JSON.stringify(currentDoc.value))];
  redoStack.value = redoStack.value.slice(0, -1);
  currentDoc.value = next;
  validateCurrent();
}

export function validateCurrent() {
  if (!currentDoc.value) {
    validationReport.value = null;
    return;
  }
  validationReport.value = validateDoc(currentDoc.value);
}

export function setDoc(doc: Doc) {
  currentDoc.value = doc;
  undoStack.value = [];
  redoStack.value = [];
  selectedNodeId.value = doc.root.id;
  currentProfileId.value = 'preset';
  targetOrientation.value = 'portrait';

  canvasTarget.value = {
    kind: doc.kind === 'kwgt' ? 'widget' : 'phone',
    w: doc.info.width ?? (doc.kind === 'kwgt' ? 415 : 540),
    h: doc.info.height ?? (doc.kind === 'kwgt' ? 542 : 1200),
    screens: doc.info.xscreens ? (doc.info.xscreens ?? 0) + 1 : 1,
    offset: 0.5,
  };

  validateCurrent();
}

export function findNodeById(root: Node, id: string): Node | null {
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function updateNodeProp(nodeId: string, key: string, patch: Partial<Prop>) {
  if (!currentDoc.value) return;
  pushHistory(currentDoc.value);

  const docCopy = JSON.parse(JSON.stringify(currentDoc.value)) as Doc;
  const target = findNodeById(docCopy.root, nodeId);
  if (!target) return;

  target.props[key] = {
    ...(target.props[key] || {}),
    ...patch,
  };

  currentDoc.value = docCopy;
  validateCurrent();
}

export function addNode(parent: Node, newNode: Node) {
  if (!currentDoc.value) return;
  pushHistory(currentDoc.value);

  const docCopy = JSON.parse(JSON.stringify(currentDoc.value)) as Doc;
  const p = findNodeById(docCopy.root, parent.id);
  if (!p) return;

  if (!p.children) p.children = [];
  p.children.push(newNode);

  currentDoc.value = docCopy;
  selectedNodeId.value = newNode.id;
  validateCurrent();
}

export function deleteNode(nodeId: string) {
  if (!currentDoc.value || nodeId === currentDoc.value.root.id) return;
  pushHistory(currentDoc.value);

  const docCopy = JSON.parse(JSON.stringify(currentDoc.value)) as Doc;

  const removeRecursive = (parent: Node): boolean => {
    if (!parent.children) return false;
    const idx = parent.children.findIndex((c) => c.id === nodeId);
    if (idx >= 0) {
      parent.children.splice(idx, 1);
      return true;
    }
    for (const child of parent.children) {
      if (removeRecursive(child)) return true;
    }
    return false;
  };

  removeRecursive(docCopy.root);
  currentDoc.value = docCopy;
  selectedNodeId.value = docCopy.root.id;
  validateCurrent();
}
