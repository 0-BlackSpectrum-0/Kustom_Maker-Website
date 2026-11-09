import { h } from 'preact';
import {
  currentDoc,
  selectedNodeId,
  activeTab,
  deleteNode,
  pushHistory,
  validateCurrent,
} from '../state/editor-state.ts';
import type { Node } from '../../core/model/types.ts';

export function LeftPanel() {
  const doc = currentDoc.value;
  const tab = activeTab.value;
  const selectedId = selectedNodeId.value;

  const renderTreeNode = (node: Node, depth = 0) => {
    const isSelected = node.id === selectedId;
    const isRoot = node.type === 'RootLayerModule';

    return (
      <div key={node.id}>
        <div
          class={`tree-node ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          onClick={() => (selectedNodeId.value = node.id)}
        >
          <span class="tree-icon">
            {node.type === 'ShapeModule'
              ? '▢'
              : node.type === 'TextModule'
              ? 'T'
              : node.type === 'FontIconModule'
              ? '★'
              : node.type === 'StackLayerModule'
              ? '≡'
              : '📁'}
          </span>
          <span class="tree-label">{node.title || node.type}</span>
          {!isRoot && (
            <div class="tree-actions">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNode(node.id);
                }}
                title="Delete"
              >
                ✕
              </span>
            </div>
          )}
        </div>
        {node.children && node.children.map((child) => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  const handleAddGlobal = () => {
    if (!doc) return;
    pushHistory(doc);
    const name = prompt('Enter global variable name:');
    if (!name) return;
    const clean = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!clean) return;

    doc.globals[clean] = {
      index: Object.keys(doc.globals).length,
      type: 'COLOR',
      title: clean,
      value: '#FFFFFFFF',
    };
    currentDoc.value = { ...doc };
    validateCurrent();
  };

  return (
    <aside class="left-panel">
      <div class="panel-tabs">
        <button
          class={`tab-btn ${tab === 'layers' ? 'active' : ''}`}
          onClick={() => (activeTab.value = 'layers')}
        >
          Layers
        </button>
        <button
          class={`tab-btn ${tab === 'globals' ? 'active' : ''}`}
          onClick={() => (activeTab.value = 'globals')}
        >
          Globals
        </button>
        <button
          class={`tab-btn ${tab === 'assets' ? 'active' : ''}`}
          onClick={() => (activeTab.value = 'assets')}
        >
          Assets
        </button>
      </div>

      <div class="panel-content">
        {tab === 'layers' && (
          <div>{doc ? renderTreeNode(doc.root) : <p style={{ color: 'var(--text-subtle)' }}>No preset open</p>}</div>
        )}

        {tab === 'globals' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Globals List</span>
              <button class="btn btn-sm" onClick={handleAddGlobal}>+ Add</button>
            </div>
            {doc &&
              Object.entries(doc.globals).map(([k, g]) => (
                <div
                  key={k}
                  style={{
                    padding: '6px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{g.title || k}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                      {g.type} {g.global_formula ? `Formula: ${g.global_formula}` : `Value: ${g.value}`}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {tab === 'assets' && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>Archive Assets</div>
            {doc &&
              Array.from(doc.assets.entries()).map(([path, bytes]) => (
                <div
                  key={path}
                  style={{
                    padding: '4px 0',
                    borderBottom: '1px solid var(--border-color)',
                    fontSize: '11px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{path}</span>
                  <span style={{ color: 'var(--text-subtle)' }}>{(bytes.byteLength / 1024).toFixed(1)} KB</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </aside>
  );
}
