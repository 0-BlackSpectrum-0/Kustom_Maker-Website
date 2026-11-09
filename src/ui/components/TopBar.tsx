import { h } from 'preact';
import {
  currentDoc,
  canvasTarget,
  simState,
  validationReport,
  exportModalOpen,
  undo,
  redo,
  setDoc,
  addNode,
} from '../state/editor-state.ts';
import { readPresetArchive } from '../../core/archive/reader.ts';
import { writePresetArchive } from '../../core/archive/writer.ts';
import type { Doc, Node } from '../../core/model/types.ts';

export function TopBar() {
  const doc = currentDoc.value;
  const target = canvasTarget.value;
  const sim = simState.value;
  const report = validationReport.value;

  const handleOpenFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.kwgt,.klwp,.komp';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const buf = await file.arrayBuffer();
      try {
        const openedDoc = await readPresetArchive(new Uint8Array(buf as ArrayBuffer));
        setDoc(openedDoc);
      } catch (err) {
        alert('Failed to open archive: ' + (err as Error).message);
      }
    };
    input.click();
  };

  const handleNewKWGT = () => {
    const newRoot: Node = {
      id: 'root_' + Math.random().toString(36).slice(2, 9),
      type: 'RootLayerModule',
      title: 'Root',
      props: {
        background_color: { value: '#00000000' },
      },
      children: [],
      extras: {},
    };

    const newDoc: Doc = {
      kind: 'kwgt',
      info: {
        title: 'New Widget',
        author: 'User',
        description: 'Created with KustomWeb',
        version: 13,
        release: 377435216,
        width: 415,
        height: 542,
        locked: false,
      },
      root: newRoot,
      globals: {},
      assets: new Map(),
      thumbs: {},
      extras: {},
    };

    setDoc(newDoc);
  };

  const handleExport = () => {
    if (!doc) return;
    exportModalOpen.value = true;
  };

  const toggleDarkMode = () => {
    simState.value = {
      ...sim,
      darkmode: sim.darkmode === 1 ? 0 : 1,
    };
  };

  const handleAddShape = () => {
    if (!doc) return;
    const shapeNode: Node = {
      id: 'shape_' + Math.random().toString(36).slice(2, 9),
      type: 'ShapeModule',
      title: 'Shape',
      props: {
        shape_type: { value: 'RECT' },
        shape_width: { value: 100 },
        shape_height: { value: 100 },
        shape_corners: { value: 12 },
        paint_color: { value: '#FFFFFFFF' },
      },
      extras: {},
    };
    addNode(doc.root, shapeNode);
  };

  const handleAddText = () => {
    if (!doc) return;
    const textNode: Node = {
      id: 'text_' + Math.random().toString(36).slice(2, 9),
      type: 'TextModule',
      title: 'Text',
      props: {
        text_expression: { value: '$df(hh:mm)$' },
        text_size: { value: 36 },
        paint_color: { value: '#FFFFFFFF' },
      },
      extras: {},
    };
    addNode(doc.root, textNode);
  };

  return (
    <header class="top-bar">
      <div class="top-bar-left">
        <div class="brand-badge">
          Kustom<span>Web</span>
        </div>
        <button class="btn btn-sm" onClick={handleNewKWGT}>New</button>
        <button class="btn btn-sm" onClick={handleOpenFile}>Open...</button>
        <button class="btn btn-sm" onClick={handleAddShape}>+ Shape</button>
        <button class="btn btn-sm" onClick={handleAddText}>+ Text</button>
        <button class="btn btn-sm" onClick={undo} title="Undo (Ctrl+Z)">↶</button>
        <button class="btn btn-sm" onClick={redo} title="Redo (Ctrl+Y)">↷</button>
      </div>

      <div class="top-bar-center">
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {doc?.info.title || 'Untitled'} ({target.w}×{target.h})
        </span>
      </div>

      <div class="top-bar-right">
        {report && (
          <div
            class={`status-chip ${
              report.valid ? 'chip-success' : 'chip-warning'
            }`}
          >
            {report.valid ? '✓ Valid' : `⚠ ${report.issues.length} issues`}
          </div>
        )}

        <button class="btn btn-sm" onClick={toggleDarkMode}>
          {sim.darkmode === 1 ? '🌙 Dark' : '☀️ Light'}
        </button>

        <button class="btn btn-primary btn-sm" onClick={handleExport} disabled={!doc}>
          Export
        </button>
      </div>
    </header>
  );
}
