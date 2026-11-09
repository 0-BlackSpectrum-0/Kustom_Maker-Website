import { h, VNode } from 'preact';
import { useState } from 'preact/hooks';
import {
  currentDoc,
  selectedNodeId,
  activeTab,
  deleteNode,
  moveChild,
  findParentNode,
  findNodeById,
  commit,
  addModuleModalOpen,
  currentResourceManager,
} from '../state/editor-state.ts';
import type { Node, Doc } from '../../core/model/types.ts';
import { ResourceManager } from '../../core/render/resources.ts';
import {
  TextModuleIcon,
  ShapeModuleIcon,
  ImageModuleIcon,
  FontIconModuleIcon,
  ProgressModuleIcon,
  CurvedTextModuleIcon,
  SeriesModuleIcon,
  OverlapLayerModuleIcon,
  StackLayerModuleIcon,
  KomponentModuleIcon,
  AnimatedImageModuleIcon,
  AddIcon,
  TrashIcon,
  DragHandleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '../icons/icons.tsx';

function getModuleIcon(type: string): VNode {
  switch (type) {
    case 'TextModule':
      return <TextModuleIcon size={18} class="module-icon" />;
    case 'ShapeModule':
      return <ShapeModuleIcon size={18} class="module-icon" />;
    case 'BitmapModule':
      return <ImageModuleIcon size={18} class="module-icon" />;
    case 'FontIconModule':
      return <FontIconModuleIcon size={18} class="module-icon" />;
    case 'ProgressModule':
      return <ProgressModuleIcon size={18} class="module-icon" />;
    case 'CurvedTextModule':
      return <CurvedTextModuleIcon size={18} class="module-icon" />;
    case 'SeriesModule':
      return <SeriesModuleIcon size={18} class="module-icon" />;
    case 'OverlapLayerModule':
      return <OverlapLayerModuleIcon size={18} class="module-icon" />;
    case 'StackLayerModule':
      return <StackLayerModuleIcon size={18} class="module-icon" />;
    case 'KomponentModule':
      return <KomponentModuleIcon size={18} class="module-icon" />;
    case 'AnimatedImageModule':
      return <AnimatedImageModuleIcon size={18} class="module-icon" />;
    default:
      return <OverlapLayerModuleIcon size={18} class="module-icon" />;
  }
}

function getNodeSubtitle(node: Node): string {
  switch (node.type) {
    case 'ShapeModule':
      return String(node.props.shape_type?.value || 'Rectangle');
    case 'TextModule':
      return String(node.props.text_expression?.value || 'Text');
    case 'BitmapModule':
      return node.props.bitmap_bitmap?.value ? 'Image' : 'Empty Bitmap';
    case 'FontIconModule':
      return String(node.props.icon_icon?.value || 'Icon');
    case 'ProgressModule':
      return `${node.props.progress_style?.value || 'Linear'} (${node.props.progress_level?.value ?? 50}%)`;
    case 'CurvedTextModule':
      return String(node.props.curved_expression?.value || 'Curved Text');
    case 'OverlapLayerModule':
    case 'StackLayerModule':
    case 'KomponentModule':
    case 'RootLayerModule':
      return `${(node.children || []).length} items`;
    default:
      return node.type;
  }
}

export function LeftPanel() {
  const doc = currentDoc.value;
  const tab = activeTab.value;
  const selectedId = selectedNodeId.value;

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    root: true,
  });

  // Global Creation State
  const [showAddGlobal, setShowAddGlobal] = useState(false);
  const [newGlobalName, setNewGlobalName] = useState('');
  const [newGlobalType, setNewGlobalType] = useState('COLOR');
  const [newGlobalValue, setNewGlobalValue] = useState('#FFFFFFFF');

  const toggleExpand = (id: string, e: Event) => {
    e.stopPropagation();
    setExpandedNodes({
      ...expandedNodes,
      [id]: expandedNodes[id] === undefined ? false : !expandedNodes[id],
    });
  };

  const handleCreateGlobal = () => {
    if (!doc || !newGlobalName.trim()) return;
    const clean = newGlobalName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!clean) return;

    const nextGlobals = {
      ...doc.globals,
      [clean]: {
        index: Object.keys(doc.globals).length,
        type: newGlobalType,
        title: clean,
        value: newGlobalValue,
      },
    };

    const nextDoc: Doc = { ...doc, globals: nextGlobals };
    commit(nextDoc, `Add global ${clean}`);
    setNewGlobalName('');
    setShowAddGlobal(false);
  };

  const handleDeleteGlobal = (key: string) => {
    if (!doc) return;
    const nextGlobals = { ...doc.globals };
    delete nextGlobals[key];
    const nextDoc: Doc = { ...doc, globals: nextGlobals };
    commit(nextDoc, `Delete global ${key}`);
  };

  const renderTreeNode = (node: Node, depth = 0) => {
    const isSelected = node.id === selectedId;
    const isRoot = node.type === 'RootLayerModule';
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isExpanded = expandedNodes[node.id] ?? true;
    const parent = doc ? findParentNode(doc.root, node.id) : null;

    return (
      <div key={node.id} class="tree-item-group">
        <div
          class={`tree-row ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => (selectedNodeId.value = node.id)}
        >
          {/* Chevron for Containers */}
          {hasChildren ? (
            <span
              class="tree-chevron"
              onClick={(e) => toggleExpand(node.id, e)}
            >
              {isExpanded ? (
                <ChevronDownIcon size={14} />
              ) : (
                <ChevronRightIcon size={14} />
              )}
            </span>
          ) : (
            <span class="tree-chevron-placeholder">
              <DragHandleIcon size={12} class="tree-drag-handle" />
            </span>
          )}

          {/* Module Icon */}
          <span class="tree-module-icon">{getModuleIcon(node.type)}</span>

          {/* Node Details */}
          <div class="tree-label-box">
            <span class="tree-title">{node.title || node.type}</span>
            <span class="tree-subtitle">{getNodeSubtitle(node)}</span>
          </div>

          {/* Reorder & Delete Actions */}
          {!isRoot && parent && (
            <div class="tree-actions">
              <button
                class="tree-action-btn"
                title="Move Up"
                onClick={(e) => {
                  e.stopPropagation();
                  moveChild(parent.id, node.id, 'up');
                }}
              >
                ▲
              </button>
              <button
                class="tree-action-btn"
                title="Move Down"
                onClick={(e) => {
                  e.stopPropagation();
                  moveChild(parent.id, node.id, 'down');
                }}
              >
                ▼
              </button>
              <button
                class="tree-action-btn tree-action-delete"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNode(node.id);
                }}
              >
                <TrashIcon size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Children (if expanded) */}
        {hasChildren &&
          isExpanded &&
          node.children!.map((child) => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <aside class="left-panel">
      {/* Official Tabs Header */}
      <div class="panel-tabs">
        <button
          class={`tab-btn ${tab === 'layers' ? 'active' : ''}`}
          onClick={() => (activeTab.value = 'layers')}
        >
          Items
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

      <div class="panel-body">
        {/* ITEMS TAB */}
        {tab === 'layers' && (
          <div class="tree-container">
            {doc && renderTreeNode(doc.root)}
            {/* Floating Action Button (FAB) for Add Module */}
            <button
              class="fab-add-btn"
              title="Add Item (+)"
              onClick={() => (addModuleModalOpen.value = true)}
            >
              <AddIcon size={24} />
            </button>
          </div>
        )}

        {/* GLOBALS TAB */}
        {tab === 'globals' && doc && (
          <div class="globals-container">
            <div class="globals-header">
              <span class="globals-count">
                {Object.keys(doc.globals).length} Global Variables
              </span>
              <button
                class="btn btn-sm btn-primary"
                onClick={() => setShowAddGlobal(!showAddGlobal)}
              >
                + Add Global
              </button>
            </div>

            {showAddGlobal && (
              <div class="add-global-form">
                <input
                  type="text"
                  class="input-text"
                  placeholder="Global name (e.g. primary_color)"
                  value={newGlobalName}
                  onInput={(e) =>
                    setNewGlobalName((e.target as HTMLInputElement).value)
                  }
                />
                <div class="form-row">
                  <select
                    class="input-select"
                    value={newGlobalType}
                    onChange={(e) =>
                      setNewGlobalType((e.target as HTMLSelectElement).value)
                    }
                  >
                    <option value="COLOR">COLOR</option>
                    <option value="NUMBER">NUMBER</option>
                    <option value="TEXT">TEXT</option>
                    <option value="SWITCH">SWITCH</option>
                    <option value="FONT">FONT</option>
                    <option value="BITMAP">BITMAP</option>
                  </select>
                  <input
                    type="text"
                    class="input-text"
                    placeholder="Initial value"
                    value={newGlobalValue}
                    onInput={(e) =>
                      setNewGlobalValue((e.target as HTMLInputElement).value)
                    }
                  />
                </div>
                <div class="form-actions">
                  <button
                    class="btn btn-sm"
                    onClick={() => setShowAddGlobal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    class="btn btn-sm btn-primary"
                    onClick={handleCreateGlobal}
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            <div class="globals-list">
              {Object.entries(doc.globals).map(([k, g]) => (
                <div key={k} class="global-row">
                  <div class="global-info">
                    <span class="global-type-badge">{g.type}</span>
                    <span class="global-name">{k}</span>
                  </div>
                  <div class="global-val-wrap">
                    {g.type === 'COLOR' && (
                      <span
                        class="color-indicator"
                        style={{ backgroundColor: String(g.value) }}
                      />
                    )}
                    <input
                      type="text"
                      class="global-input"
                      value={String(g.value)}
                      onChange={(e) => {
                        const val = (e.target as HTMLInputElement).value;
                        const nextGlobals = {
                          ...doc.globals,
                          [k]: { ...g, value: val },
                        };
                        commit(
                          { ...doc, globals: nextGlobals },
                          `Update global ${k}`
                        );
                      }}
                    />
                    <button
                      class="tree-action-btn tree-action-delete"
                      title="Delete"
                      onClick={() => handleDeleteGlobal(k)}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ASSETS TAB */}
        {tab === 'assets' && (
          <div class="assets-container">
            {/* Embedded Archive Files */}
            <div class="assets-section-title">Archive Files</div>
            <div class="assets-list">
              {doc &&
                Array.from(doc.assets.entries()).map(([path, data]) => (
                  <div key={path} class="asset-row">
                    <span class="asset-name">{path}</span>
                    <span class="asset-size">
                      {(data.length / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              {(!doc || doc.assets.size === 0) && (
                <div class="assets-empty">No embedded files in archive</div>
              )}
            </div>

            {/* Referenced Resource URIs */}
            {doc && (
              <div class="resources-diagnostic-section">
                <div class="assets-section-title">
                  Referenced Resources (Fonts, Icons, Bitmaps)
                </div>
                {(() => {
                  const mgr =
                    currentResourceManager.value ?? new ResourceManager(doc);
                  const refs = mgr.listReferences(doc);

                  if (refs.length === 0) {
                    return (
                      <div class="assets-empty">
                        No external kfile:// references in document
                      </div>
                    );
                  }

                  return (
                    <div class="resources-table">
                      {refs.map((r, i) => {
                        const badgeClass =
                          r.status === 'exact'
                            ? 'badge-ok'
                            : r.status === 'alias'
                            ? 'badge-alias'
                            : r.status === 'case_insensitive'
                            ? 'badge-ci'
                            : 'badge-missing';
                        return (
                          <div key={i} class="resource-row">
                            <div class="resource-header">
                              <span class={`status-badge ${badgeClass}`}>
                                {r.status.toUpperCase()}
                              </span>
                              <span class="resource-uri" title={r.uri}>
                                {r.uri}
                              </span>
                            </div>
                            <div class="resource-details">
                              <span class="resource-path">
                                Module: {r.moduleTitle} ({r.propKey})
                              </span>
                              {r.resolvedPath && (
                                <span class="resource-resolved">
                                  Resolved: {r.resolvedPath}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
