import { h } from 'preact';
import {
  currentDoc,
  selectedNodeId,
  activeTab,
  deleteNode,
  pushHistory,
  validateCurrent,
  currentResourceManager,
} from '../state/editor-state.ts';
import type { Node } from '../../core/model/types.ts';
import { ResourceManager } from '../../core/render/resources.ts';

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

        {tab === 'assets' && (() => {
          const res = currentResourceManager.value ?? (doc ? new ResourceManager(doc.assets) : null);
          const refs = doc && res ? res.listReferences(doc) : [];
          const missingCount = refs.filter((r) => r.status === 'missing').length;

          const getStatusBadge = (status: string) => {
            switch (status) {
              case 'exact':
                return <span style={{ background: '#064e3b', color: '#34d399', padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontWeight: 600 }}>OK</span>;
              case 'alias':
                return <span style={{ background: '#0c4a6e', color: '#38bdf8', padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontWeight: 600 }}>ALIAS</span>;
              case 'case_insensitive':
                return <span style={{ background: '#164e63', color: '#22d3ee', padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontWeight: 600 }}>CASE</span>;
              case 'missing':
                return <span style={{ background: '#7f1d1d', color: '#f87171', padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontWeight: 600 }}>MISSING</span>;
              default:
                return <span style={{ background: '#713f12', color: '#facc15', padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontWeight: 600 }}>{status}</span>;
            }
          };

          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Referenced Resources ({refs.length})</span>
                {missingCount > 0 && (
                  <span style={{ background: '#7f1d1d', color: '#f87171', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                    {missingCount} missing
                  </span>
                )}
              </div>

              {refs.length === 0 ? (
                <div style={{ color: 'var(--text-subtle)', fontSize: '11px', marginBottom: '16px' }}>No kfile resources referenced by current layers.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  {refs.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 8px',
                        background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {r.moduleTitle} <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>({r.kind})</span>
                        </span>
                        {getStatusBadge(r.status)}
                      </div>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-subtle)', fontSize: '10px' }} title={r.uri}>
                        {r.uri}
                      </div>
                      {r.resolvedPath && (
                        <div style={{ color: '#38bdf8', fontSize: '10px', marginTop: '2px' }}>
                          ↳ {r.resolvedPath}
                        </div>
                      )}
                      {r.status === 'missing' && (
                        <div style={{ color: '#f87171', fontSize: '10px', marginTop: '2px' }}>
                          ⚠ File not found in archive — renders default fallback
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                Archive Assets ({doc?.assets.size ?? 0})
              </div>
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
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</span>
                    <span style={{ color: 'var(--text-subtle)', whiteSpace: 'nowrap', marginLeft: '6px' }}>
                      {(bytes.byteLength / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
            </div>
          );
        })()}
      </div>
    </aside>
  );
}
