import { h } from 'preact';
import {
  currentDoc,
  selectedNodeId,
  findNodeById,
  updateNodeProp,
  drawerOpen,
  activeDrawerTab,
} from '../state/editor-state.ts';
import {
  AnchorModeValues,
  ShapeValues,
  TextAlignValues,
  PaintStyleValues,
  PaintModeValues,
  GradientValues,
  MaskFilterValues,
  ShadowValues,
} from '../../core/spec/generated.ts';

export function Inspector() {
  const doc = currentDoc.value;
  const selectedId = selectedNodeId.value;

  if (!doc || !selectedId) {
    return (
      <aside class="inspector-panel">
        <div style={{ padding: '16px', color: 'var(--text-subtle)' }}>No module selected</div>
      </aside>
    );
  }

  const node = findNodeById(doc.root, selectedId);
  if (!node) {
    return (
      <aside class="inspector-panel">
        <div style={{ padding: '16px', color: 'var(--text-subtle)' }}>Selected module not found</div>
      </aside>
    );
  }

  const renderPropEditor = (
    label: string,
    propKey: string,
    type: 'string' | 'number' | 'color' | 'select',
    options?: readonly string[],
  ) => {
    const prop = node.props[propKey] || {};
    const toggle = prop.toggle ?? 0;
    const value = prop.value ?? '';
    const formula = prop.formula ?? '';
    const globalName = prop.global ?? '';

    const handleToggle = (newToggle: number) => {
      updateNodeProp(node.id, propKey, { toggle: newToggle });
    };

    return (
      <div class="prop-row" key={propKey}>
        <div class="prop-label" title={label}>{label}</div>

        <div class="prop-control">
          {/* Plain Value Mode */}
          {toggle === 0 && (
            <>
              {type === 'string' && (
                <input
                  type="text"
                  class="input-sm"
                  value={String(value)}
                  onInput={(e) =>
                    updateNodeProp(node.id, propKey, {
                      value: (e.target as HTMLInputElement).value,
                    })
                  }
                />
              )}

              {type === 'number' && (
                <input
                  type="number"
                  class="input-sm"
                  value={value !== undefined ? String(value) : '0'}
                  onInput={(e) => {
                    const parsed = parseFloat((e.target as HTMLInputElement).value);
                    updateNodeProp(node.id, propKey, {
                      value: isNaN(parsed) ? 0 : parsed,
                    });
                  }}
                />
              )}

              {type === 'color' && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="color"
                    style={{ width: '28px', height: '24px', padding: 0, border: 'none', cursor: 'pointer' }}
                    value={
                      typeof value === 'string' && value.startsWith('#')
                        ? `#${value.slice(-6)}`
                        : '#ffffff'
                    }
                    onInput={(e) => {
                      const hex = (e.target as HTMLInputElement).value.toUpperCase();
                      updateNodeProp(node.id, propKey, { value: `#FF${hex.slice(1)}` });
                    }}
                  />
                  <input
                    type="text"
                    class="input-sm"
                    style={{ width: '85px' }}
                    value={String(value)}
                    onInput={(e) =>
                      updateNodeProp(node.id, propKey, {
                        value: (e.target as HTMLInputElement).value,
                      })
                    }
                  />
                </div>
              )}

              {type === 'select' && options && (
                <select
                  class="input-sm"
                  value={String(value)}
                  onChange={(e) =>
                    updateNodeProp(node.id, propKey, {
                      value: (e.target as HTMLSelectElement).value,
                    })
                  }
                >
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {/* Formula Mode */}
          {(toggle & 10) === 10 && (
            <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
              <input
                type="text"
                class="input-sm"
                style={{ flex: 1, color: '#60a5fa', fontFamily: 'monospace' }}
                value={formula}
                onInput={(e) =>
                  updateNodeProp(node.id, propKey, {
                    formula: (e.target as HTMLInputElement).value,
                  })
                }
              />
              <button
                class="btn btn-sm"
                title="Open Formula Drawer"
                onClick={() => {
                  activeDrawerTab.value = 'formula';
                  drawerOpen.value = true;
                }}
              >
                fx
              </button>
            </div>
          )}

          {/* Global Mode */}
          {(toggle & 100) === 100 && (
            <select
              class="input-sm"
              style={{ color: '#34d399', width: '100%' }}
              value={globalName}
              onChange={(e) =>
                updateNodeProp(node.id, propKey, {
                  global: (e.target as HTMLSelectElement).value,
                })
              }
            >
              <option value="">-- Select Global --</option>
              {Object.keys(doc.globals).map((gk) => (
                <option key={gk} value={gk}>
                  gv({gk})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Toggle Pill Buttons */}
        <div class="prop-toggles">
          <button
            class={`btn btn-sm ${toggle === 0 ? 'btn-primary' : ''}`}
            title="Static Value"
            onClick={() => handleToggle(0)}
          >
            val
          </button>
          <button
            class={`btn btn-sm ${(toggle & 10) === 10 ? 'btn-primary' : ''}`}
            title="Formula Mode"
            onClick={() => handleToggle((toggle & 10) === 10 ? 0 : 10)}
          >
            fx
          </button>
          <button
            class={`btn btn-sm ${(toggle & 100) === 100 ? 'btn-primary' : ''}`}
            title="Global Variable"
            onClick={() => handleToggle((toggle & 100) === 100 ? 0 : 100)}
          >
            gv
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside class="inspector-panel">
      <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>
        {node.title || node.type} ({node.type})
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Module Specific Properties */}
        {node.type === 'ShapeModule' && (
          <div class="inspector-section">
            <div class="section-title">Shape</div>
            {renderPropEditor('Shape Type', 'shape_type', 'select', ShapeValues)}
            {renderPropEditor('Width', 'shape_width', 'number')}
            {renderPropEditor('Height', 'shape_height', 'number')}
            {renderPropEditor('Corners', 'shape_corners', 'number')}
            {renderPropEditor('Angle', 'shape_angle', 'number')}
          </div>
        )}

        {node.type === 'TextModule' && (
          <div class="inspector-section">
            <div class="section-title">Text</div>
            {renderPropEditor('Text', 'text_expression', 'string')}
            {renderPropEditor('Size', 'text_size', 'number')}
            {renderPropEditor('Align', 'text_align', 'select', TextAlignValues)}
          </div>
        )}

        {/* Paint Properties */}
        {['ShapeModule', 'TextModule', 'FontIconModule'].includes(node.type) && (
          <div class="inspector-section">
            <div class="section-title">Paint</div>
            {renderPropEditor('Color', 'paint_color', 'color')}
            {renderPropEditor('Style', 'paint_style', 'select', PaintStyleValues)}
            {renderPropEditor('Stroke', 'paint_stroke', 'number')}
            {renderPropEditor('Mode', 'paint_mode', 'select', PaintModeValues)}
          </div>
        )}

        {/* FX Properties */}
        <div class="inspector-section">
          <div class="section-title">FX</div>
          {renderPropEditor('Gradient', 'fx_gradient', 'select', GradientValues)}
          {renderPropEditor('Grad Color', 'fx_gradient_color', 'color')}
          {renderPropEditor('Mask', 'fx_mask', 'select', MaskFilterValues)}
          {renderPropEditor('Shadow', 'fx_shadow', 'select', ShadowValues)}
        </div>

        {/* Position Properties */}
        <div class="inspector-section">
          <div class="section-title">Position</div>
          {renderPropEditor('Anchor', 'position_anchor', 'select', AnchorModeValues)}
          {node.type !== 'RootLayerModule' && renderPropEditor('Offset X', 'position_offset_x', 'number')}
          {node.type !== 'RootLayerModule' && renderPropEditor('Offset Y', 'position_offset_y', 'number')}
          {renderPropEditor('Padding L', 'position_padding_left', 'number')}
          {renderPropEditor('Padding T', 'position_padding_top', 'number')}
          {renderPropEditor('Padding R', 'position_padding_right', 'number')}
          {renderPropEditor('Padding B', 'position_padding_bottom', 'number')}
        </div>
      </div>
    </aside>
  );
}
