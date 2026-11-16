// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { h, render } from 'preact';
import { App } from '../../src/ui/App.tsx';
import {
  currentDoc,
  createDefaultDoc,
  selectedNodeId,
  targetOrientation,
  showGridOverlay,
  showDeviceFrame,
  addModuleModalOpen,
  exportModalOpen,
  activeTab,
  createOfficialNode,
  commit,
  undo,
  redo,
  simState,
} from '../../src/ui/state/editor-state.ts';
import { addChild, removeNode, setProp } from '../../src/core/model/edit.ts';
import { readPresetArchive } from '../../src/core/archive/reader.ts';
import type { Node } from '../../src/core/model/types.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Provide Path2D and canvas mock in jsdom
if (typeof (globalThis as any).Path2D === 'undefined') {
  (globalThis as any).Path2D = class {
    rect() {}
    arc() {}
    ellipse() {}
    closePath() {}
  };
} else if (!(globalThis as any).Path2D.prototype.ellipse) {
  (globalThis as any).Path2D.prototype.ellipse = () => {};
}

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn().mockReturnValue({ data: new Uint8Array(4) }),
    putImageData: vi.fn(),
    createImageData: vi.fn().mockReturnValue({ data: new Uint8Array(4) }),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2 }),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    createPattern: vi.fn().mockReturnValue({}),
  }) as any;
}

function collectAllNodeTypes(root: Node): { id: string; type: string }[] {
  const result: { id: string; type: string }[] = [{ id: root.id, type: root.type }];
  if (root.children) {
    for (const child of root.children) {
      result.push(...collectAllNodeTypes(child));
    }
  }
  return result;
}

describe('R0 Smoke Test: UI Mount, Re-render, and Crash Detection', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    currentDoc.value = createDefaultDoc();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('mounts <App /> and executes user interaction workflow without crashing or rendering [object Object]', async () => {
    // 1. Mount default document
    render(h(App, null), container);
    expect(container.innerHTML).toBeTruthy();

    // 2. Add module (Shape)
    const shape = createOfficialNode('ShapeModule');
    const docWithShape = addChild(currentDoc.value!, currentDoc.value!.root.id, shape);
    commit(docWithShape, 'Add Shape');
    render(h(App, null), container);
    expect(document.body.textContent).not.toContain('[object Object]');

    // 3. Delete added module
    const docWithoutShape = removeNode(currentDoc.value!, shape.id);
    commit(docWithoutShape, 'Remove Shape');
    render(h(App, null), container);
    expect(document.body.textContent).not.toContain('[object Object]');

    // 4. Undo and Redo
    undo();
    render(h(App, null), container);
    expect(document.body.textContent).not.toContain('[object Object]');

    redo();
    render(h(App, null), container);
    expect(document.body.textContent).not.toContain('[object Object]');

    // 5. Set orientation
    targetOrientation.value = targetOrientation.value === 'portrait' ? 'landscape' : 'portrait';
    render(h(App, null), container);
    expect(document.body.textContent).not.toContain('[object Object]');

    // 6. Toggle grid and device frame
    showGridOverlay.value = !showGridOverlay.value;
    showDeviceFrame.value = !showDeviceFrame.value;
    render(h(App, null), container);
    expect(document.body.textContent).not.toContain('[object Object]');

    // 7. Open and close modals
    addModuleModalOpen.value = true;
    render(h(App, null), container);
    addModuleModalOpen.value = false;
    render(h(App, null), container);

    exportModalOpen.value = true;
    render(h(App, null), container);
    exportModalOpen.value = false;
    render(h(App, null), container);

    // 8. Change a global variable
    currentDoc.value = {
      ...currentDoc.value!,
      globals: {
        ...currentDoc.value!.globals,
        test_color: { type: 'COLOR', value: '#FF00FF00', label: 'Test Color' },
      },
    };
    render(h(App, null), container);
    expect(document.body.textContent).not.toContain('[object Object]');

    // 9. Open Assets tab
    activeTab.value = 'assets';
    render(h(App, null), container);
    expect(document.body.textContent).not.toContain('[object Object]');
  });

  it('mounts real corpus KWGT and KLWP presets and selects every module type', async () => {
    render(h(App, null), container);

    const kwgtPath = path.join(process.cwd(), 'samples', '_src', 'kwgt-widgets', 'widgets', 'Clean_Time_Date_Info.kwgt');
    if (fs.existsSync(kwgtPath)) {
      const bytes = fs.readFileSync(kwgtPath);
      const doc = await readPresetArchive(new Uint8Array(bytes));
      currentDoc.value = doc;
      render(h(App, null), container);
      expect(document.body.textContent).not.toContain('[object Object]');

      // Select each module in KWGT preset
      const nodes = collectAllNodeTypes(doc.root);
      for (const n of nodes) {
        selectedNodeId.value = n.id;
        render(h(App, null), container);
        expect(document.body.textContent).not.toContain('[object Object]');
      }
    }

    const klwpPath = path.join(process.cwd(), 'samples', '_src', 'darkwave', '05_19_25_DarkWave_Release.klwp');
    if (fs.existsSync(klwpPath)) {
      const bytes = fs.readFileSync(klwpPath);
      const doc = await readPresetArchive(new Uint8Array(bytes));
      currentDoc.value = doc;
      render(h(App, null), container);
      expect(document.body.textContent).not.toContain('[object Object]');

      // Select a sample of nodes
      const nodes = collectAllNodeTypes(doc.root).slice(0, 20);
      for (const n of nodes) {
        selectedNodeId.value = n.id;
        render(h(App, null), container);
        expect(document.body.textContent).not.toContain('[object Object]');
      }
    }
  });
});
