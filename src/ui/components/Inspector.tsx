import { h } from 'preact';
import { useState } from 'preact/hooks';
import {
  currentDoc,
  selectedNodeId,
  findNodeById,
  updateNodeProp,
  deleteNode,
  commit,
  addModuleModalOpen,
} from '../state/editor-state.ts';
import { MODULE_SPECS } from '../../core/spec/generated.ts';
import { PropertyRow } from './PropertyRow.tsx';
import {
  AddIcon,
  TrashIcon,
  CopyIcon,
  EyeIcon,
  DragHandleIcon,
  TextModuleIcon,
  ShapeModuleIcon,
  ImageModuleIcon,
  FontIconModuleIcon,
  ProgressModuleIcon,
  CurvedTextModuleIcon,
  OverlapLayerModuleIcon,
  StackLayerModuleIcon,
  KomponentModuleIcon,
} from '../icons/icons.tsx';
import { cloneNode, addChild } from '../../core/model/edit.ts';
import type { Node } from '../../core/model/types.ts';

const PROPERTY_LABELS: Record<string, string> = {
  // Shape
  shape_type: 'Shape',
  shape_width: 'Width',
  shape_height: 'Height',
  shape_corners: 'Corners',

  // Paint
  paint_color: 'Color',
  paint_style: 'Style',
  paint_mode: 'Mode',
  paint_stroke: 'Stroke',

  // FX
  fx_gradient: 'Gradient',
  fx_gradient_color: 'Gradient Color',
  fx_gradient_width: 'Gradient Width',
  fx_gradient_offset: 'Gradient Offset',
  fx_gradient_offset_x: 'Gradient X',
  fx_gradient_offset_y: 'Gradient Y',
  fx_shadow: 'Shadow',
  fx_shadow_blur: 'Blur',
  fx_shadow_direction: 'Direction',
  fx_shadow_distance: 'Distance',
  fx_shadow_color: 'Shadow Color',
  fx_mask: 'Mask',
  fx_bitmap_filter: 'Filter',
  fx_bitmap_filter_color: 'Filter Color',
  fx_bitmap_dim: 'Dim',
  fx_bitmap_blur: 'Blur',
  fx_bitmap_filter_amount: 'Amount',

  // Text
  text_expression: 'Text',
  text_size: 'Size',
  text_family: 'Font',
  text_align: 'Alignment',
  text_filter: 'Filter',
  text_width: 'Width',
  text_height: 'Height',
  text_rotate_mode: 'Rotate',
  text_lines: 'Lines',
  text_space_width: 'Space Width',

  // Bitmap
  bitmap_bitmap: 'Bitmap',
  bitmap_width: 'Width',
  bitmap_height: 'Height',
  bitmap_mode: 'Mode',
  bitmap_filter: 'Filter',
  bitmap_scale_mode: 'Sizing',
  bitmap_color_filter: 'Color Filter',

  // Icon
  icon_set: 'Icon Set',
  icon_icon: 'Icon',
  icon_size: 'Size',
  icon_rotate_mode: 'Rotate',
  icon_rotate_offset: 'Angle',

  // Progress
  progress_progress: 'Progress',
  style_style: 'Style',
  style_shape: 'Shape',
  style_width: 'Width',
  style_height: 'Height',
  style_size: 'Size',
  color_color: 'Color',
  color_bgcolor: 'Background Color',
  color_tcolor: 'Track Color',
  color_fgcolor: 'Foreground Color',
  color_mode: 'Color Mode',

  // Position
  position_anchor: 'Anchor',
  position_offset_x: 'X Offset',
  position_offset_y: 'Y Offset',
  position_padding_top: 'Padding Top',
  position_padding_bottom: 'Padding Bottom',
  position_padding_left: 'Padding Left',
  position_padding_right: 'Padding Right',

  // Layer / Config
  config_visible: 'Visible',
  config_scale_value: 'Scale',
  config_rotate_mode: 'Rotate',
  config_rotate_offset: 'Angle',
  config_alpha: 'Opacity',
  config_fx: 'FX',
  config_filter: 'Filter',
  config_filter_amount: 'Filter Amount',
  config_stacking: 'Stacking',
  config_margin: 'Margin',
  background_bitmap: 'Wallpaper Bitmap',
  background_scroll: 'Scroll Mode',
};

function getModuleIcon(type: string) {
  switch (type) {
    case 'TextModule': return <TextModuleIcon size={16} />;
    case 'ShapeModule': return <ShapeModuleIcon size={16} />;
    case 'BitmapModule': return <ImageModuleIcon size={16} />;
    case 'FontIconModule': return <FontIconModuleIcon size={16} />;
    case 'ProgressModule': return <ProgressModuleIcon size={16} />;
    case 'CurvedTextModule': return <CurvedTextModuleIcon size={16} />;
    case 'OverlapLayerModule': return <OverlapLayerModuleIcon size={16} />;
    case 'StackLayerModule': return <StackLayerModuleIcon size={16} />;
    case 'KomponentModule': return <KomponentModuleIcon size={16} />;
    default: return <ShapeModuleIcon size={16} />;
  }
}

interface SpecProp {
  key: string;
  type: string;
  default?: any;
  enum?: string;
  desc?: string;
  seen?: number;
  unverified?: boolean;
  legacy?: boolean;
}

function getTabsForModule(node: Node): { id: string; label: string }[] {
  const isContainer =
    node.type === 'RootLayerModule' ||
    node.type === 'OverlapLayerModule' ||
    node.type === 'StackLayerModule' ||
    node.type === 'KomponentModule';

  if (isContainer) {
    return [
      { id: 'items', label: 'Items' },
      { id: 'layer', label: 'Layer' },
      { id: 'position', label: 'Position' },
      { id: 'animation', label: 'Animation' },
      { id: 'touch', label: 'Touch' },
    ];
  }

  if (node.type === 'ShapeModule') {
    return [
      { id: 'shape', label: 'Shape' },
      { id: 'paint', label: 'Paint' },
      { id: 'fx', label: 'Fx' },
      { id: 'position', label: 'Position' },
      { id: 'touch', label: 'Touch' },
    ];
  }

  if (node.type === 'TextModule') {
    return [
      { id: 'text', label: 'Text' },
      { id: 'paint', label: 'Paint' },
      { id: 'fx', label: 'Fx' },
      { id: 'position', label: 'Position' },
      { id: 'touch', label: 'Touch' },
    ];
  }

  if (node.type === 'BitmapModule') {
    return [
      { id: 'bitmap', label: 'Bitmap' },
      { id: 'position', label: 'Position' },
      { id: 'fx', label: 'Fx' },
      { id: 'touch', label: 'Touch' },
    ];
  }

  if (node.type === 'FontIconModule') {
    return [
      { id: 'icon', label: 'Icon' },
      { id: 'paint', label: 'Paint' },
      { id: 'fx', label: 'Fx' },
      { id: 'position', label: 'Position' },
      { id: 'touch', label: 'Touch' },
    ];
  }

  if (node.type === 'ProgressModule') {
    return [
      { id: 'progress', label: 'Progress' },
      { id: 'paint', label: 'Paint' },
      { id: 'fx', label: 'Fx' },
      { id: 'position', label: 'Position' },
      { id: 'touch', label: 'Touch' },
    ];
  }

  if (node.type === 'CurvedTextModule') {
    return [
      { id: 'text', label: 'Curved' },
      { id: 'paint', label: 'Paint' },
      { id: 'fx', label: 'Fx' },
      { id: 'position', label: 'Position' },
      { id: 'touch', label: 'Touch' },
    ];
  }

  return [
    { id: 'primary', label: 'Properties' },
    { id: 'position', label: 'Position' },
    { id: 'touch', label: 'Touch' },
  ];
}

function getPropsForTab(moduleType: string, tabId: string): SpecProp[] {
  const modSpec = (MODULE_SPECS as any)[moduleType];
  if (!modSpec || !modSpec.sections) return [];

  let sectionsToRead: string[] = [tabId];
  if (moduleType === 'ProgressModule' && tabId === 'progress') {
    sectionsToRead = ['progress', 'style', 'color'];
  } else if (moduleType === 'RootLayerModule' && tabId === 'layer') {
    sectionsToRead = ['layer', 'background'];
  }

  const result: SpecProp[] = [];
  const seenKeys = new Set<string>();

  for (const s of sectionsToRead) {
    const list: SpecProp[] = modSpec.sections[s] || [];
    for (const p of list) {
      if (!seenKeys.has(p.key)) {
        seenKeys.add(p.key);
        result.push(p);
      }
    }
  }

  return result;
}

export function Inspector() {
  const doc = currentDoc.value;
  const selectedId = selectedNodeId.value;
  const [activeTab, setActiveTab] = useState<string>('primary');

  if (!doc || !selectedId) {
    return (
      <aside class="inspector-panel">
        <div class="inspector-empty">No module selected</div>
      </aside>
    );
  }

  const node = findNodeById(doc.root, selectedId);
  if (!node) {
    return (
      <aside class="inspector-panel">
        <div class="inspector-empty">Selected module not found</div>
      </aside>
    );
  }

  const tabs = getTabsForModule(node);
  const currentTabId = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0].id;

  const handleDuplicateChild = (childNode: Node) => {
    const dup = cloneNode(childNode);
    dup.id = `${dup.type}_${Date.now()}`;
    dup.title = `${dup.title} (Copy)`;
    const nextDoc = addChild(doc, node.id, dup);
    commit(nextDoc, `Duplicate ${childNode.title}`);
  };

  const handleDeleteChild = (childId: string) => {
    deleteNode(childId);
  };

  return (
    <aside class="inspector-panel">
      {/* Header Info */}
      <div class="inspector-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getModuleIcon(node.type)}
          <span class="inspector-title">{node.title || node.type}</span>
        </div>
        <span class="inspector-type">{node.type}</span>
      </div>

      {/* Tabs Strip */}
      <div class="inspector-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            class={`inspector-tab-btn ${currentTabId === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body Content */}
      <div class="inspector-body">
        {currentTabId === 'items' && (
          <div class="items-tab-container" style={{ padding: '8px' }}>
            {(!node.children || node.children.length === 0) ? (
              <div class="inspector-empty" style={{ padding: '20px' }}>
                No items in this group
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {node.children.map((child) => (
                  <div
                    key={child.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-surface-elevated, #24242A)',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color, #2C2C34)',
                      cursor: 'pointer',
                    }}
                    onClick={() => (selectedNodeId.value = child.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-subtle, #686872)' }}>
                        <DragHandleIcon size={14} />
                      </span>
                      {getModuleIcon(child.type)}
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>{child.title}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>{child.type}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        class="icon-btn"
                        style={{ padding: '4px' }}
                        title="Duplicate"
                        onClick={() => handleDuplicateChild(child)}
                      >
                        <CopyIcon size={14} />
                      </button>
                      <button
                        class="icon-btn"
                        style={{ padding: '4px', color: 'var(--danger, #ef4444)' }}
                        title="Delete"
                        onClick={() => handleDeleteChild(child.id)}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '12px' }}>
              <button
                class="btn btn-sm"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => (addModuleModalOpen.value = true)}
              >
                <AddIcon size={16} /> Add Item to Group
              </button>
            </div>
          </div>
        )}

        {currentTabId === 'animation' && (
          <div class="touch-empty-note">
            Animations preview: Configured animations run in the Live Clock simulation.
          </div>
        )}

        {currentTabId === 'touch' && (
          <div class="touch-empty-note">
            Touch actions: Trigger app launch, switches, or links when tapped on phone.
          </div>
        )}

        {currentTabId !== 'items' && currentTabId !== 'animation' && currentTabId !== 'touch' && (
          <div class="inspector-group">
            {(() => {
              const specProps = getPropsForTab(node.type, currentTabId);
              if (specProps.length === 0) {
                return <div class="inspector-empty">No properties for this tab</div>;
              }

              // Disambiguate duplicate labels within the tab
              const labelCounts = new Map<string, number>();
              for (const p of specProps) {
                const rawLabel = PROPERTY_LABELS[p.key] || p.desc || p.key;
                labelCounts.set(rawLabel, (labelCounts.get(rawLabel) || 0) + 1);
              }

              const getDisambiguatedLabel = (p: SpecProp) => {
                const rawLabel = PROPERTY_LABELS[p.key] || p.desc || p.key;
                if ((labelCounts.get(rawLabel) || 0) > 1) {
                  return `${rawLabel} (${p.key.split('_')[0]})`;
                }
                return rawLabel;
              };

              const verified = specProps.filter((p) => (p.seen ?? 0) > 0);
              const unverified = specProps.filter((p) => !p.seen || p.seen === 0);

              return (
                <div>
                  {/* Verified observed properties */}
                  {verified.map((p) => (
                    <PropertyRow
                      key={p.key}
                      nodeId={node.id}
                      propKey={p.key}
                      label={getDisambiguatedLabel(p)}
                      type={p.type}
                      enumName={p.enum}
                      prop={node.props[p.key]}
                      globals={doc.globals}
                      onUpdate={(patch) => updateNodeProp(node.id, p.key, patch)}
                    />
                  ))}

                  {/* Unverified / Advanced properties behind details disclosure */}
                  {unverified.length > 0 && (
                    <details
                      style={{
                        margin: '12px 8px 8px 8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color, #2C2C34)',
                        overflow: 'hidden',
                      }}
                    >
                      <summary
                        style={{
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          color: 'var(--text-subtle, #686872)',
                          fontWeight: 600,
                          userSelect: 'none',
                        }}
                      >
                        Advanced / Unverified Properties ({unverified.length})
                      </summary>
                      <div style={{ padding: '4px 0', borderTop: '1px solid var(--border-color, #2C2C34)' }}>
                        {unverified.map((p) => (
                          <PropertyRow
                            key={p.key}
                            nodeId={node.id}
                            propKey={p.key}
                            label={getDisambiguatedLabel(p)}
                            type={p.type}
                            enumName={p.enum}
                            prop={node.props[p.key]}
                            globals={doc.globals}
                            onUpdate={(patch) => updateNodeProp(node.id, p.key, patch)}
                          />
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </aside>
  );
}
