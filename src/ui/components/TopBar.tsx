import { h } from 'preact';
import { useState } from 'preact/hooks';
import {
  currentDoc,
  canvasTarget,
  selectedNodeId,
  canUndo,
  canRedo,
  exportModalOpen,
  addModuleModalOpen,
  showGridOverlay,
  showDeviceFrame,
  targetOrientation,
  toggleOrientation,
  undo,
  redo,
  setDoc,
  getBreadcrumbTrail,
} from '../state/editor-state.ts';
import { readPresetArchive } from '../../core/archive/reader.ts';
import { writePresetArchive } from '../../core/archive/writer.ts';
import type { Doc, Node } from '../../core/model/types.ts';
import {
  MenuIcon,
  SaveIcon,
  UndoIcon,
  RedoIcon,
  AddIcon,
  ChevronRightIcon,
} from '../icons/icons.tsx';

export function TopBar() {
  const doc = currentDoc.value;
  const target = canvasTarget.value;
  const selectedId = selectedNodeId.value ?? (doc ? doc.root.id : 'root');
  const [menuOpen, setMenuOpen] = useState(false);

  const breadcrumbs = doc ? getBreadcrumbTrail(doc.root, selectedId) : [];

  const handleOpenFile = () => {
    setMenuOpen(false);
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
    setMenuOpen(false);
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

  const handleNewKLWP = () => {
    setMenuOpen(false);
    const newRoot: Node = {
      id: 'root_' + Math.random().toString(36).slice(2, 9),
      type: 'RootLayerModule',
      title: 'Root',
      props: {
        background_color: { value: '#FF121214' },
      },
      children: [],
      extras: {},
    };

    const newDoc: Doc = {
      kind: 'klwp',
      info: {
        title: 'New Wallpaper',
        author: 'User',
        description: 'Created with KustomWeb',
        version: 13,
        release: 377435216,
        width: 540,
        height: 1200,
        xscreens: 2,
        yscreens: 0,
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

  const handleQuickSave = async () => {
    if (!doc) return;
    try {
      const bytes = await writePresetArchive(doc);
      const blob = new Blob([bytes as any], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(doc.info.title || 'preset').replace(/[^a-zA-Z0-9_-]/g, '_')}.${doc.kind}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Save failed: ' + (err as Error).message);
    }
  };

  return (
    <header class="top-bar">
      <div class="top-bar-left">
        {/* Hamburger Menu */}
        <div class="menu-container">
          <button
            class="icon-btn top-menu-btn"
            title="Menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MenuIcon size={20} />
          </button>
          {menuOpen && (
            <div class="dropdown-menu">
              <button class="dropdown-item" onClick={handleNewKWGT}>
                New KWGT Widget
              </button>
              <button class="dropdown-item" onClick={handleNewKLWP}>
                New KLWP Wallpaper
              </button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" onClick={handleOpenFile}>
                Open Preset (.kwgt, .klwp, .komp)
              </button>
              <button class="dropdown-item" onClick={handleQuickSave}>
                Save Preset
              </button>
              <div class="dropdown-divider"></div>
              <button
                class="dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  exportModalOpen.value = true;
                }}
              >
                Export Preset...
              </button>
            </div>
          )}
        </div>

        {/* Breadcrumb Navigation */}
        <nav class="breadcrumb-bar" aria-label="Module hierarchy">
          {breadcrumbs.map((node, i) => (
            <span key={node.id} class="breadcrumb-item-wrap">
              {i > 0 && <ChevronRightIcon size={14} class="breadcrumb-sep" />}
              <button
                class={`breadcrumb-btn ${node.id === selectedId ? 'active' : ''}`}
                onClick={() => (selectedNodeId.value = node.id)}
                title={`Go to ${node.title}`}
              >
                {node.title}
              </button>
            </span>
          ))}
        </nav>
      </div>

      <div class="top-bar-center">
        {doc && (
          <div class="preset-badge">
            <span class="preset-kind-tag">{doc.kind.toUpperCase()}</span>
            <span class="preset-title">{doc.info.title || 'Untitled'}</span>
            <span class="preset-dims">
              {target.w}×{target.h}
            </span>
          </div>
        )}

        {/* Quick Orientation & Grid Controls */}
        <div class="stage-quick-controls">
          <button
            class={`btn btn-sm ${targetOrientation.value === 'landscape' ? 'btn-active' : ''}`}
            onClick={toggleOrientation}
            title="Toggle Orientation (Portrait / Landscape)"
          >
            {targetOrientation.value === 'portrait' ? 'Portrait' : 'Landscape'}
          </button>
          <button
            class={`btn btn-sm ${showGridOverlay.value ? 'btn-active' : ''}`}
            onClick={() => (showGridOverlay.value = !showGridOverlay.value)}
            title="Toggle Grid Overlay"
          >
            Grid
          </button>
          <button
            class={`btn btn-sm ${showDeviceFrame.value ? 'btn-active' : ''}`}
            onClick={() => (showDeviceFrame.value = !showDeviceFrame.value)}
            title="Toggle Device Frame"
          >
            Frame
          </button>
        </div>
      </div>

      <div class="top-bar-right">
        {/* Undo / Redo */}
        <button
          class="icon-btn"
          onClick={undo}
          disabled={!canUndo.value}
          title="Undo (Ctrl+Z)"
        >
          <UndoIcon size={18} />
        </button>
        <button
          class="icon-btn"
          onClick={redo}
          disabled={!canRedo.value}
          title="Redo (Ctrl+Y)"
        >
          <RedoIcon size={18} />
        </button>

        {/* Save */}
        <button
          class="icon-btn"
          onClick={handleQuickSave}
          disabled={!doc}
          title="Quick Save"
        >
          <SaveIcon size={18} />
        </button>

        {/* Add Module Button */}
        <button
          class="icon-btn top-add-btn"
          onClick={() => (addModuleModalOpen.value = true)}
          disabled={!doc}
          title="Add Item (+)"
        >
          <AddIcon size={20} />
        </button>

        {/* Export Button */}
        <button
          class="btn btn-primary btn-sm export-btn"
          onClick={() => (exportModalOpen.value = true)}
          disabled={!doc}
        >
          Export
        </button>
      </div>
    </header>
  );
}
