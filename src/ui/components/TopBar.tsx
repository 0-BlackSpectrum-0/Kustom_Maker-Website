import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import {
  currentDoc,
  canUndo,
  canRedo,
  exportModalOpen,
  undo,
  redo,
  setDoc,
} from '../state/editor-state.ts';
import { readPresetArchive } from '../../core/archive/reader.ts';
import type { Doc, Node } from '../../core/model/types.ts';
import {
  MenuIcon,
  SaveIcon,
  UndoIcon,
  RedoIcon,
} from '../icons/icons.tsx';

export function TopBar() {
  const doc = currentDoc.value;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as globalThis.Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

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
      props: {},
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
      props: {},
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

  return (
    <header class="top-bar">
      <div class="top-bar-left">
        {/* Hamburger Menu */}
        <div class="menu-container" ref={menuRef}>
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

        <span class="preset-title" style={{ marginLeft: '12px', fontWeight: 600, fontSize: '15px' }}>
          {doc?.info?.title || 'KustomWeb'}
        </span>
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

        {/* Save / Export */}
        <button
          class="icon-btn"
          onClick={() => (exportModalOpen.value = true)}
          disabled={!doc}
          title="Save Preset (Export)"
        >
          <SaveIcon size={20} />
        </button>
      </div>
    </header>
  );
}
