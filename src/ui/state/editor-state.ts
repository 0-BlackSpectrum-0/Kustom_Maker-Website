import { signal, computed } from '@preact/signals';
import type { Doc, Node, Prop } from '../../core/model/types.ts';
import type { CanvasTarget } from '../../core/layout/types.ts';
import type { SimState } from '../../core/formula/types.ts';
import type { ValidationReport } from '../../core/validate/types.ts';
import type { ResourceManager } from '../../core/render/resources.ts';
import { defaultSimState } from '../../core/formula/sim/sim-state.ts';
import { validateDoc } from '../../core/validate/validator.ts';
import { setProp, addChild, removeNode, findNodeById } from '../../core/model/edit.ts';

export { findNodeById };
export const currentResourceManager = signal<ResourceManager | null>(null);

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

// History stack capped at 200 entries, storing immutable Doc references
const undoStack = signal<Doc[]>([]);
const redoStack = signal<Doc[]>([]);

export function commit(next: Doc, _label = 'Edit') {
  if (!currentDoc.value) return;
  undoStack.value = [...undoStack.value.slice(-199), currentDoc.value];
  redoStack.value = [];
  currentDoc.value = next;
  validateCurrent();
}

export function pushHistory(doc: Doc) {
  undoStack.value = [...undoStack.value.slice(-199), doc];
  redoStack.value = [];
}

export function undo() {
  if (undoStack.value.length === 0 || !currentDoc.value) return;
  const prev = undoStack.value[undoStack.value.length - 1];
  redoStack.value = [...redoStack.value, currentDoc.value];
  undoStack.value = undoStack.value.slice(0, -1);
  currentDoc.value = prev;
  validateCurrent();
}

export function redo() {
  if (redoStack.value.length === 0 || !currentDoc.value) return;
  const next = redoStack.value[redoStack.value.length - 1];
  undoStack.value = [...undoStack.value, currentDoc.value];
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

export function updateNodeProp(nodeId: string, key: string, patch: Partial<Prop>) {
  if (!currentDoc.value) return;
  const next = setProp(currentDoc.value, nodeId, key, patch);
  commit(next, `Update ${key}`);
}

export function addNode(parent: Node, newNode: Node) {
  if (!currentDoc.value) return;
  const next = addChild(currentDoc.value, parent.id, newNode);
  commit(next, `Add ${newNode.title}`);
  selectedNodeId.value = newNode.id;
}

export const addModuleModalOpen = signal<boolean>(false);
export const canUndo = computed(() => undoStack.value.length > 0);
export const canRedo = computed(() => redoStack.value.length > 0);

export function findParentNode(root: Node, targetId: string): Node | null {
  if (root.id === targetId) return null;
  if (!root.children) return null;
  for (const child of root.children) {
    if (child.id === targetId) return root;
    const found = findParentNode(child, targetId);
    if (found) return found;
  }
  return null;
}

export function getBreadcrumbTrail(root: Node, targetId: string): Node[] {
  const trail: Node[] = [];
  function search(node: Node): boolean {
    trail.push(node);
    if (node.id === targetId) return true;
    if (node.children) {
      for (const child of node.children) {
        if (search(child)) return true;
      }
    }
    trail.pop();
    return false;
  }
  search(root);
  return trail;
}

export function createOfficialNode(type: string): Node {
  const id = `${type}_${Date.now()}`;
  switch (type) {
    case 'ShapeModule':
      return {
        id,
        type: 'ShapeModule',
        title: 'Shape',
        props: {
          shape_type: { value: 'RECT' },
          shape_width: { value: 100 },
          shape_height: { value: 100 },
          paint_color: { value: '#FFFFFFFF' },
        },
        extras: {},
      };
    case 'TextModule':
      return {
        id,
        type: 'TextModule',
        title: 'Text',
        props: {
          text_expression: { value: 'Text' },
          text_size: { value: 40 },
          paint_color: { value: '#FFFFFFFF' },
        },
        extras: {},
      };
    case 'BitmapModule':
      return {
        id,
        type: 'BitmapModule',
        title: 'Image',
        props: {
          bitmap_width: { value: 100 },
          bitmap_height: { value: 100 },
        },
        extras: {},
      };
    case 'FontIconModule':
      return {
        id,
        type: 'FontIconModule',
        title: 'Icon',
        props: {
          icon_size: { value: 40 },
          paint_color: { value: '#FFFFFFFF' },
        },
        extras: {},
      };
    case 'ProgressModule':
      return {
        id,
        type: 'ProgressModule',
        title: 'Progress',
        props: {
          progress_style: { value: 'LINEAR' },
          progress_width: { value: 200 },
          progress_height: { value: 20 },
          progress_level: { value: 50 },
          paint_color: { value: '#FFFFFFFF' },
        },
        extras: {},
      };
    case 'CurvedTextModule':
      return {
        id,
        type: 'CurvedTextModule',
        title: 'Morphing Text',
        props: {
          curved_expression: { value: 'Curved Text' },
          curved_radius: { value: 100 },
          curved_size: { value: 40 },
          paint_color: { value: '#FFFFFFFF' },
        },
        extras: {},
      };
    case 'SeriesModule':
      return {
        id,
        type: 'SeriesModule',
        title: 'Series',
        props: {
          series_mode: { value: 'DAY_OF_WEEK' },
        },
        extras: {},
      };
    case 'OverlapLayerModule':
      return {
        id,
        type: 'OverlapLayerModule',
        title: 'Overlap Group',
        props: {},
        children: [],
        extras: {},
      };
    case 'StackLayerModule':
      return {
        id,
        type: 'StackLayerModule',
        title: 'Stack Group',
        props: {
          stack_mode: { value: 'VERTICAL_LEFT' },
        },
        children: [],
        extras: {},
      };
    case 'KomponentModule':
      return {
        id,
        type: 'KomponentModule',
        title: 'Komponent',
        props: {},
        children: [],
        globals: {},
        extras: {},
      };
    case 'AnimatedImageModule':
      return {
        id,
        type: 'AnimatedImageModule',
        title: 'Animated Image',
        props: {
          movie_width: { value: 100 },
          movie_height: { value: 100 },
        },
        extras: {},
      };
    default:
      return {
        id,
        type,
        title: type,
        props: {},
        extras: {},
      };
  }
}

export function addOfficialModule(type: string) {
  if (!currentDoc.value) return;
  const selId = selectedNodeId.value ?? currentDoc.value.root.id;
  const selNode = findNodeById(currentDoc.value.root, selId);
  const isContainer =
    selNode &&
    (selNode.type === 'RootLayerModule' ||
      selNode.type === 'OverlapLayerModule' ||
      selNode.type === 'StackLayerModule' ||
      selNode.type === 'KomponentModule');

  let targetParent: Node;
  if (isContainer && selNode) {
    targetParent = selNode;
  } else {
    targetParent = findParentNode(currentDoc.value.root, selId) ?? currentDoc.value.root;
  }

  const newNode = createOfficialNode(type);
  addNode(targetParent, newNode);
}

export function moveChild(parentId: string, childId: string, direction: 'up' | 'down') {
  if (!currentDoc.value) return;
  const parent = findNodeById(currentDoc.value.root, parentId);
  if (!parent || !parent.children) return;

  const idx = parent.children.findIndex((c) => c.id === childId);
  if (idx < 0) return;
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= parent.children.length) return;

  const nextChildren = [...parent.children];
  const [removed] = nextChildren.splice(idx, 1);
  nextChildren.splice(targetIdx, 0, removed);

  const updateTree = (n: Node): Node => {
    if (n.id === parentId) {
      return { ...n, children: nextChildren };
    }
    if (n.children) {
      return { ...n, children: n.children.map(updateTree) };
    }
    return n;
  };

  const nextDoc: Doc = {
    ...currentDoc.value,
    root: updateTree(currentDoc.value.root),
  };
  commit(nextDoc, `Move ${removed.title} ${direction}`);
}

export function deleteNode(nodeId: string) {
  if (!currentDoc.value || nodeId === currentDoc.value.root.id) return;
  const parent = findParentNode(currentDoc.value.root, nodeId);
  const next = removeNode(currentDoc.value, nodeId);
  commit(next, `Delete node`);
  selectedNodeId.value = parent ? parent.id : currentDoc.value.root.id;
}
